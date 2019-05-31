import { AudioContext } from 'standardized-audio-context';
import eventEmitter from 'event-emitter';
import allOff from 'event-emitter/all-off';
import FOARouter from './FOARouter';

import { loadAudioFile, loadAudioChunkBuffer } from './audioStorage';
import ChunkedClip from './ChunkedClip';
import AbortError from '../util/AbortError';
import num from '../util/num';
import trackPanMode from '../util/trackPanMode';

/*
todo:
- configurable room materials

Rendering first-order ambisonic for now, and we allow importing 4-channel ambi sounds
todo:
- support different ambisonic layouts
  will need some UI for this, since the info is not available in source audio files
  https://www.waves.com/ambisonics-explained-guide-for-sound-engineers
  https://en.wikipedia.org/wiki/Ambisonic_data_exchange_formats#AmbiX
- support rendering higher order
- support importing higher order ambisonic tracks
- support importing different-order ambisonic than the rendering order
  will probably require an in-between layer of omnitone?
*/

const panModeChannelCount = {
	stereo: 2,
	ambisonic: 4
};

const CHANNEL_MAP = [0, 3, 1, 2];
const OUTPUT_CHANNEL_MAP = [0, 2, 3, 1];

let ResonanceAudio = null;

function disconnect(one, two) {
	try {
		one.disconnect(two);
	} catch (e) {}
}

function AudioPlayer(options = {}) {
	const me = this;

	eventEmitter(this);

	const {
		audioContext = options.destination && options.destination.context || new AudioContext(),
		channelMode = 'stereo'
	} = options;

	const destination = options.destination || audioContext.destination;
	const isOffline = !!audioContext.startRendering;

	const clips = new Map(); // referenced by id
	const tracks = new Map(); // referenced by id
	const spatialTracks = new Map(); // referenced by id
	const ambisonicTracks = new Map(); // referenced by id
	const forceSpatializedTracks = new Map();
	const pendingPlayPromises = [];

	let outputRouter = null;
	const mainGain = audioContext.createGain();
	mainGain.channelCount = panModeChannelCount[channelMode] || 1;
	if (channelMode === 'ambisonic') {
		outputRouter = new FOARouter(audioContext, OUTPUT_CHANNEL_MAP);
		mainGain.connect(outputRouter.input);
		outputRouter.output.connect(destination);
	} else {
		mainGain.connect(destination);
	}

	let volume = 1;
	let duration = NaN;
	let contentDuration = NaN;
	let maxDuration = Infinity;
	let hasMetadata = false;
	let canPlay = false;
	let project = null;
	let paused = true;
	let ended = true;
	let playStartTime = Infinity;
	let pauseTime = 0;
	let playStartOffset = 0;
	let timerNode = null; // for triggering 'ended' event
	let spatialScene = null;
	let ambisonicInput = null;

	function computeCurrentTime() {
		return Math.max(0, Math.min(duration || 0, playStartOffset + Math.max(0, audioContext.currentTime - playStartTime)));
	}

	/*
	This is really hacky and should probably be replaced
	*/
	let timeUpdateTimeout = 0;
	let emittingTimeUpdate = false;
	function emitTimeUpdate() {
		if (emittingTimeUpdate) {
			return;
		}

		emittingTimeUpdate = true;
		me.emit('timeupdate');
		emittingTimeUpdate = false;

		clearTimeout(timeUpdateTimeout);
		if (!paused) {
			timeUpdateTimeout = requestAnimationFrame(emitTimeUpdate);
		}
	}

	function resetTimerNode() {
		if (timerNode) {
			timerNode.onended = null;
			// timerNode.stop();
			timerNode.disconnect();
			timerNode = null;
		}
	}

	function stopPlaying() {
		resetTimerNode();
		clips.forEach(clip => {
			if (clip.chunkedClip) {
				clip.chunkedClip.pause();
			}
		});
		if (pauseTime > audioContext.currentTime) {
			playStartOffset = me.currentTime;
			playStartTime = Infinity;
			pauseTime = audioContext.currentTime;
		}
	}

	/*
	onEnded is authoritative: if it runs, it means we definitely ended
	and want to pause
	*/
	function onEnded() {
		const needsEndedEvent = !ended;
		const needsPausedEvent = !paused;
		ended = true;
		paused = true;
		playStartOffset = duration;
		playStartTime = Infinity;
		pauseTime = audioContext.currentTime;
		pendingPlayPromises.forEach(({ reject }) => reject(new AbortError('Playback aborted')));
		pendingPlayPromises.length = 0;
		stopPlaying();
		if (needsEndedEvent) {
			me.emit('ended');
		}
		if (needsPausedEvent) {
			me.emit('pause');
		}
	}

	function checkEnded() {
		const audioContextCurrentTime = audioContext.currentTime;
		if (!me.paused && playStartTime < audioContextCurrentTime && pauseTime < audioContextCurrentTime) {
			onEnded();
		} else {
			updateReadyState();
		}
	}

	function startTimerNode(startTime, stopTime) {
		resetTimerNode();
		if (audioContext.createConstantSource) {
			timerNode = audioContext.createConstantSource();
			timerNode.offset.value = 0;
		} else {
			timerNode = audioContext.createBufferSource();
			const silentBuffer = audioContext.createBuffer(1, 1, audioContext.sampleRate);
			timerNode.buffer = silentBuffer;
			timerNode.loop = true;
		}
		timerNode.connect(audioContext.destination);
		timerNode.onended = onEnded;
		timerNode.start(startTime);
		timerNode.stop(stopTime);
	}

	function getDesiredClipOffset(clip, currentTime) {
		const clipData = clip.data;
		const endTime = clipData.start + clipData.duration;
		if (endTime <= currentTime) {
			return Infinity;
		}
		const late = Math.max(0, currentTime - clipData.start);
		return clipData.offset + late;
	}

	function setUpForceSpatializedTrack(track) {
		const channels = track.gainNode.channelCount;
		if (!track.spatialSources) {
			track.spatialSources = [];
			let inputNode = track.gainNode;
			if (channels > 1) {
				inputNode = audioContext.createChannelSplitter(channels);
				track.gainNode.connect(inputNode);
			}
			for (let i = 0; i < channels; i++) {
				const source = spatialScene.createSource({
					rolloff: 'none'
				});
				track.spatialSources.push(source);
				inputNode.connect(source.input, i, 0);
			}
		}
		track.spatialSources.forEach((source, i) => {
			const sign = i % 2 ? 1 : -1;
			const x = 10e9 * sign;
			source.setPosition(x, 0, 0);
		});
	}

	function setUpSpatialTrack(track) {
		if (!track.spatialSource) {
			track.spatialSource = spatialScene.createSource();
		}
		track.gainNode.connect(track.spatialSource.input);

		if (track.data.position) {
			const [x, y, z] = track.data.position;
			track.spatialSource.setPosition(x, y, z);
		} else {
			track.spatialSource.setPosition(0, 0, 0);
		}
	}

	function setUpAmbisonicTrack(track) {
		if (!track.router) {
			track.router = new FOARouter(audioContext, CHANNEL_MAP);
		}
		track.gainNode.connect(track.router.input);
		track.router.output.connect(ambisonicInput);
	}

	function updateReadyState() {
		const hadMetadata = hasMetadata;
		const couldPlay = canPlay;
		const currentTime = me.currentTime;

		let newDuration = 0;
		contentDuration = 0;
		hasMetadata = true;
		canPlay = true;

		if (spatialTracks.size > 0 || ambisonicTracks.size > 0 || forceSpatializedTracks.size > 0) {
			if (ResonanceAudio) {
				if (!spatialScene) {
					/*
					ResonanceAudio checks that the context provided is
					an instanceof the global AudioContext. Sometimes it's
					not because we use the shim, so we have to trick it.
					*/
					const NativeAudioContext = window.AudioContext;
					window.AudioContext = audioContext.constructor;
					spatialScene = new ResonanceAudio(audioContext, {
						ambisonicOrder: 1
					});

					/*
					workaround for bug https://github.com/GoogleChrome/omnitone/issues/102
					set forward direction to z = -1
					*/
					// eslint-disable-next-line no-underscore-dangle
					spatialScene._listener._renderer._foaRotator._m8.gain.value = -1;

					window.AudioContext = NativeAudioContext;
					if (channelMode === 'ambisonic') {
						spatialScene.ambisonicOutput.connect(mainGain);
					} else {
						spatialScene.output.connect(mainGain);
					}

					/*
					ResonanceAudio has ambisonicInput but it doesn't work,
					so we go directly into Omnitone
					*/
					// eslint-disable-next-line no-underscore-dangle
					ambisonicInput = spatialScene._listener._renderer.input;
				}
				spatialTracks.forEach(setUpSpatialTrack);
				ambisonicTracks.forEach(setUpAmbisonicTrack);
				forceSpatializedTracks.forEach(setUpForceSpatializedTrack);
			} else {
				canPlay = false;
				import('resonance-audio').then(mod => {
					ResonanceAudio = mod.ResonanceAudio;
					updateReadyState();
				});
			}
		}

		clips.forEach(clip => {
			// todo: we may not want to bother with this clip if it's
			// outside the play/pause range
			// otherwise we may load hundreds of clips
			if (!clip.data.enabled) {
				// pause chunkedClip if it exists
				if (clip.chunkedClip && clip.chunkedClip.playing) {
					clip.chunkedClip.pause();
				}
				return;
			}

			if (!clip.source) {
				hasMetadata = false;
				canPlay = false;

				// load source from IndexedDB (only if not already in progress)
				if (!clip.sourceLoadPromiseload) {
					clip.sourceLoadPromiseload = loadAudioFile(clip.data.sourceId).then(source => {
						// todo: report error if source is undefined
						// console.log('audio chunk metadata loaded', clip.data.sourceId, source);
						clip.source = source;
						updateReadyState();
					});
					// todo: catch error
				}
				return;
			}

			/*
			we may not need to worry about metadata stuff,
			since duration is derived from project data
			*/
			if (hasMetadata) {
				contentDuration = Math.max(contentDuration, clip.data.start + clip.data.duration);
			}
			if (!clip.chunkedClip) {
				// create ChunkedClip with source info
				clip.chunkedClip = new ChunkedClip({
					audioContext,
					source: clip.source,
					destination: clip.gainNode,
					loadAudioChunkBuffer: (chunkIndex, channel) => loadAudioChunkBuffer(clip.data.sourceId, chunkIndex, channel)
				});
				clip.chunkedClip.on('ended', checkEnded);
			}

			// prime if necessary based on play state and currentTime
			// update loaded state
			const desiredClipOffset = getDesiredClipOffset(clip, currentTime);

			/*
			todo: don't bother priming if start time is way out there
			we'll need a place to handle priming in the future, though
			...unless this is an offline context, in which case, prime everything
			*/

			// no need to play this clip, since we've already passed it
			const maxClipDuration = Math.min(
				clip.data.source.duration,
				clip.data.duration,
				isNaN(duration) ? 0 : duration - clip.data.start,
				pauseTime > currentTime ? pauseTime - currentTime : Infinity
			);
			const clipEndOffset = clip.data.offset + maxClipDuration;
			if (desiredClipOffset >= clipEndOffset) {
				// unload clip, but don't destroy
				clip.chunkedClip.unload();
				return;
			}

			if (!clip.chunkedClip.isPrimed(desiredClipOffset)) {
				canPlay = false;
				clip.chunkedClip.prime(desiredClipOffset, clipEndOffset)
					.then(updateReadyState)
					.catch(e => {
						if (e.name !== 'AbortError') {
							// todo: set error state and fire event
							console.warn('Failed to load chunk', e);
						}
					});
			}
		});

		if (!hasMetadata) {
			contentDuration = NaN;
		}

		newDuration = Math.min(contentDuration, maxDuration);

		const durationChanged = duration !== newDuration && !(isNaN(duration) && isNaN(newDuration));
		duration = newDuration;
		if (durationChanged) {
			me.emit('durationchange');
		}
		if (hadMetadata && !hasMetadata) {
			me.emit('unload');
		} else if (hasMetadata && !hadMetadata) {
			me.emit('loadedmetadata');
		}

		if (!couldPlay && canPlay) {
			me.emit('canplay');
		}

		if (durationChanged && me.currentTime >= duration) {
			onEnded();
		}

		if (!paused) {
			if (canPlay && duration > 0) {
				// not actively playing but we wanna be
				// const wasntPlaying = pauseTime <= audioContext.currentTime;
				const contextCurrentTime = audioContext.currentTime;

				playStartOffset = currentTime;
				playStartTime = contextCurrentTime;
				pauseTime = contextCurrentTime + duration - currentTime;
				const promises = [];
				clips.forEach(clip => {
					if (clip.data.enabled && !clip.chunkedClip.playing) {
						const desiredClipOffset = getDesiredClipOffset(clip, currentTime);
						const clipData = clip.data;
						if (desiredClipOffset < clipData.source.duration) {
							const fullClipDuration = clipData.source.duration;//Math.min(clipData.duration, clipData.source.duration); // todo: double-check this!
							const clipDuration = Math.min(
								fullClipDuration - desiredClipOffset,
								clipData.duration,
								duration - clipData.start - (desiredClipOffset - clipData.offset)
							);
							if (clipDuration > 0) {
								const contextStartTime = contextCurrentTime + Math.max(0, clipData.start - currentTime);
								promises.push(clip.chunkedClip
									.play(desiredClipOffset, clipDuration, contextStartTime)
									.catch(e => {
										if (e.name !== 'AbortError') {
											throw e;
										}
									})
								);
							}
						}
					}
				});
				Promise.all(promises).then(() => {
					// resolve any pending play promises
					pendingPlayPromises.forEach(({ resolve }) => resolve());
					pendingPlayPromises.length = 0;
				}).catch(error => {
					// todo: set error state and fire event
					pendingPlayPromises.forEach(({ reject }) => reject(error));
					pendingPlayPromises.length = 0;
				});

				startTimerNode(playStartTime, pauseTime);
				emitTimeUpdate();
			} else {
				// if playing, stop and go to waiting state
				stopPlaying();
			}
		}
	}

	this.setProject = newProject => {
		if (newProject === project) {
			return;
		}

		project = newProject;

		const tracksToDelete = new Set(tracks.keys());
		const clipsToDelete = new Set(clips.keys());

		const projectClips = project && project.clips || new Map();
		const projectTracks = project && project.tracks || new Map();
		projectClips.forEach(clipData => {
			clipsToDelete.delete(clipData.id);
			tracksToDelete.delete(clipData.track);

			const oldClip = clips.get(clipData.id);
			if (oldClip && oldClip.data === clipData) {
				// do nothing if clip has not been modified
				return;
			}

			let track = tracks.get(clipData.track);
			if (!track) {
				track = {
					id: clipData.track,
					gainNode: audioContext.createGain(),
					data: projectTracks.get(clipData.track),
					spatialSource: null,
					router: null
				};
				tracks.set(track.id, track);
			}

			// if clip doesn't exist, create it
			const clip = {
				id: clipData.id,
				chunkedClip: null,
				sourceLoadPromise: null,
				source: null,
				...oldClip,
				data: clipData,
				track
			};
			if (!clip.gainNode) {
				clip.gainNode = audioContext.createGain();
				clip.gainNode.channelCountMode = 'explicit';
			}
			if (clip.chunkedClip) {
				// todo: modify
				console.log('todo: modify chunkedClip', clip);
			}

			clip.gainNode.connect(track.gainNode);

			const gain = num(clipData.gain, 1);
			clip.gainNode.gain.cancelScheduledValues(0);
			clip.gainNode.gain.linearRampToValueAtTime(gain, audioContext.currentTime + 0.001);

			clips.set(clip.id, clip);
		});

		tracksToDelete.forEach(trackId => {
			const track = tracks.get(trackId);
			track.gainNode.disconnect();
			tracks.delete(trackId);
		});
		tracksToDelete.clear();

		// loop through tracks and look for changes
		// update gain, mute/solo
		const soloTracks = new Set();
		spatialTracks.clear();
		ambisonicTracks.clear();
		forceSpatializedTracks.clear();
		tracks.forEach(track => {
			const newData = projectTracks.get(track.id);
			if (newData.solo) {
				soloTracks.add(track.id);
			}
		});
		tracks.forEach(track => {
			const newData = projectTracks.get(track.id);
			if (newData !== track.data) {
				track = {
					...track,
					data: newData
				};
				tracks.set(track.id, track);
			}
			const isMuted = newData.mute || !!soloTracks.size && !soloTracks.has(track.id);
			const gain = isMuted ? 0 : num(track.data.gain, 1);
			track.gainNode.gain.cancelScheduledValues(0);
			track.gainNode.gain.linearRampToValueAtTime(gain, audioContext.currentTime + 0.001);

			const panMode = isMuted ? '' : trackPanMode(track.data, project);
			track.gainNode.channelCount = panModeChannelCount[panMode] || 1;

			// disconnect everything first in case anything changed
			// we'll reconnect below
			disconnect(track.gainNode, mainGain);
			if (track.spatialSource) {
				disconnect(track.gainNode, track.spatialSource.input);
			}
			if (track.router) {
				disconnect(track.gainNode, track.router.input);
			}

			if (panMode === 'spatial') {
				spatialTracks.set(track.id, track);
			} else if (panMode === 'ambisonic') {
				ambisonicTracks.set(track.id, track);
			} else if (channelMode === 'ambisonic') {
				forceSpatializedTracks.set(track.id, track);
			} else {
				track.gainNode.connect(mainGain);
			}
		});

		clipsToDelete.forEach(clipId => {
			// clean up clip
			const clip = clips.get(clipId);
			if (clip) {
				if (clip.chunkedClip) {
					clip.chunkedClip.destroy();
				}
				if (clip.gainNode) {
					clip.gainNode.disconnect();
				}
			}

			clips.delete(clipId);
		});
		clipsToDelete.clear();

		updateReadyState();
	};

	this.play = () => {
		if (!paused) {
			pendingPlayPromises.forEach(({ reject }) => reject(new AbortError('Playback aborted')));
			pendingPlayPromises.length = 0;
		}

		return new Promise((resolve, reject) => {
			pendingPlayPromises.push({
				resolve,
				reject
			});

			// todo: should playStartTime account for time passed since `.play()` was called?
			ended = false;
			if (paused) {

				// if we're at the end, start over at the beginning
				if (me.currentTime === me.duration) {
					me.currentTime = 0;
				}

				paused = false;
				updateReadyState();
				if (!isOffline && audioContext.state === 'suspended' && audioContext.resume) {
					audioContext.resume();
				}
				me.emit('play');
				emitTimeUpdate();
			}
		});
	};

	this.pause = (when = audioContext.currentTime) => {
		if (when > audioContext.currentTime) {
			// pause in the future
			pauseTime = when;
			updateReadyState();
			return;
		}

		stopPlaying();
		if (!paused) {
			ended = true;
			pendingPlayPromises.forEach(({ reject }) => reject(new AbortError('Playback aborted')));
			pendingPlayPromises.length = 0;

			paused = true;
			me.emit('pause');
		}
	};

	this.destroy = () => {
		allOff(this);
		this.setProject(null);
		if (spatialScene) {
			ambisonicInput.disconnect();
			spatialScene.ambisonicInput.disconnect();
			spatialScene.ambisonicOutput.disconnect();
			spatialScene.output.disconnect();
			spatialScene = null;
		}

		mainGain.disconnect();
	};

	Object.defineProperties(this, {
		duration: {
			get: () => duration
		},
		contentDuration: {
			get: () => contentDuration
		},
		maxDuration: {
			get: () => maxDuration,
			set: val => {
				// todo: validate
				if (val !== maxDuration) {
					maxDuration = val;
					updateReadyState();
				}
			}
		},
		currentTime: {
			get: () => pauseTime > audioContext.currentTime ?
				computeCurrentTime() :
				playStartOffset,
			set: targetTime => {
				if (targetTime < 0 || targetTime > duration) {
					/*
					We might want to throw an error here.
					HTMLMediaElement would
					*/
					return;
				}

				stopPlaying();

				const contextCurrentTime = audioContext.currentTime;
				playStartOffset = targetTime;
				playStartTime = contextCurrentTime;
				updateReadyState();
				emitTimeUpdate();
			}
		},
		paused: {
			get: () => paused
		},
		canPlay: {
			get: () => canPlay
		},
		waiting: {
			get: () => !paused && pauseTime <= audioContext.currentTime
		},
		volume: {
			get: () => volume,
			set(val) {
				if (isNaN(val) || !(val >= 0) || val >= Infinity) {
					throw new RangeError('volume value out of range: ' + val);
				}

				if (val !== volume) {
					volume = val;
					mainGain.gain.cancelScheduledValues(0);
					mainGain.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.001);
				}
			}
		},
		context: {
			get: () => audioContext
		},
		main: {
			get: () => mainGain
		}
	});
}

export default AudioPlayer;