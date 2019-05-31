import { AudioContext } from 'standardized-audio-context';
import eventEmitter from 'event-emitter';
import allOff from 'event-emitter/all-off';
import binarySearch from 'binary-search';
import AbortError from '../util/AbortError';

const LOOK_AHEAD = 10; // todo: make this configurable or something

function ChunkedClip(options) {
	/*
	todo: set up constants from options
	- [x] audio context
	- [x] where and how to load chunks from
	- [x] source metadata
	  - chunk duration
	  - number of chunks
	- [ ] how far ahead do we need to load?
	  - at least one clip ahead at all times
	- [ ] allow setting playbackRate
	  - not negative or zero (will need to emulate by reversing buffer)
	  - will need to adjust playStartTime and playEndTime if it changes while playing
	  - need to recalculate start/end times of chunks and total duration
	  - adjust when searching for chunk by offset
	- [ ] select subset of channels
	  - output as mono if only one?
	*/

	/*
	todo: Make chunk storage pluggable
	- common memory for audio buffers in case multiple clips want to use the same source
	*/
	const {
		audioContext = options.destination && options.destination.context || new AudioContext(),
		source,
		loadAudioChunkBuffer
	} = options;

	const destination = options.destination || audioContext.destination;
	const isOffline = !!audioContext.startRendering;

	const { channelsPerFrame, sampleRate } = source.format;
	const me = this;
	const lookAhead = isOffline ? Infinity : LOOK_AHEAD;
	eventEmitter(this);

	/*
	State
	- [x] Assets/Chunks
	  - list of currently active clips (offset, loaded state)
	  - should this be a sorted array?
	  - AudioBuffer
	  - AudioBufferSourceNode (need to be created each time we start playing)
	- Playback
	  - [x] playing (yes/no)
	  - [x] desired clip start offset
	  - [x] desired playback duration (or end point)
	  - [x] audio context play start time
	  - [ ] seek while playing?
	  - [ ] Looping
	    - automatic looping by setting long duration?
	    - number of times to loop?
	    - start/end offsets (same as AudioBufferSourceNode)
	  - [ ] playbackRate
	  - [ ] direction? (where supported - probably not natively, so need to emulate)
	*/
	const activeChunks = new Map(); // indexed by ordinal position of chunk
	const pendingPrimePromises = [];
	const pendingPlayPromises = [];
	let startOffset = 0;
	let endOffset = Infinity;
	let playStartTime = -Infinity;
	let playEndTime = 0;
	let startActiveChunkIndex = Number.MAX_SAFE_INTEGER;
	let ended = true;

	function binarySearchComparator(chunk, needle/*, index, haystack*/) {
		// return timeValues && timeValues[r] - needle;
		const diff = chunk.offset - needle;
		if (diff < 0 && chunk.offset + chunk.duration > needle) {
			return 0;
		}
		return diff;
	}

	function findChunkIndex(offset, low, high) {
		if (offset < 0 || offset >= source.duration) {
			return source.chunks.length;
		}

		// binary search to find low index
		const index = binarySearch(source.chunks, offset, binarySearchComparator, low, high);
		if (index < 0) {
			return source.chunks.length;
		}
		return index;
	}

	function stopChunk(loadedChunk) {
		if (loadedChunk.node) {
			loadedChunk.onended = null;
			loadedChunk.node.disconnect();
			try {
				loadedChunk.node.stop();
			} catch (e) {}
			loadedChunk.node = null;
		}
	}

	function releaseChunk(loadedChunk) {
		// console.log('unloading chunk', loadedChunk);
		stopChunk(loadedChunk);
		activeChunks.delete(loadedChunk.index);
	}

	function loadChunk(sourceChunk, index) {
		// console.log('loading chunk', index, sourceChunk);
		const activeChunk = {
			index,
			source: sourceChunk,
			node: null,
			audioBuffer: null
		};
		activeChunks.set(index, activeChunk);

		const promises = [];
		for (let c = 0; c < channelsPerFrame; c++) {
			promises.push(loadAudioChunkBuffer(index, c));
		}
		Promise.all(promises).then(channels => {
			if (!activeChunks.has(index)) {
				// We don't need this chunk any more
				return;
			}
			activeChunk.audioBuffer = audioContext.createBuffer(channelsPerFrame, sourceChunk.samples, sampleRate);
			channels.forEach((channel, c) => activeChunk.audioBuffer.copyToChannel(new Float32Array(channel), c, 0));
			// console.log('chunk loaded', index, activeChunk);
			updatePlayableChunks();
		}).catch(error => {
			console.error('Error loading chunk', error, sourceChunk);
		});
	}

	function isCurrentlyPlayable(clipStartOffset) {
		const i = findChunkIndex(clipStartOffset);
		const chunk = activeChunks.get(i);
		return !!(chunk && chunk.audioBuffer);
	}

	function updatePlayableChunks() {
		/*
		todo:
		- [x] Update desired range of active chunks, from current time to min(lookAhead, endTime)
		- [x] start loading desired active chunks that are not already loading in progress
		  - when loaded, create AudioBuffer
		  - if clip is playing, create node and start
		  - node.onended = updatePlayableChunks
		- [x] tear down any active chunks outside range
		  - disconnect and destroy node
		  - release AudioBuffer
		  - remove from `activeChunks`
		- [ ] handle "waiting" state
		- [ ] emit event if current chunk is not loaded
		- [ ] emit event if all playback is ended
		- [ ] emit event if was not loaded but is now
		*/

		const isPlaying = playEndTime > audioContext.currentTime;
		const currentOffset = isPlaying ?
			startOffset + Math.max(0, audioContext.currentTime - playStartTime) :
			startOffset;

		const lookAheadOffset = Math.min(startOffset + lookAhead, endOffset);
		const chunksToUnload = new Set(activeChunks.keys());
		startActiveChunkIndex = findChunkIndex(currentOffset);

		let chunksActive = 0;
		let allLoaded = true;
		let offset = currentOffset;
		let i = startActiveChunkIndex;
		while (offset < endOffset && i < source.chunks.length && (offset < lookAheadOffset || chunksActive < 2)) {
			const sourceChunk = source.chunks[i];
			chunksToUnload.delete(i);
			chunksActive++;

			const activeChunk = activeChunks.get(i);
			if (!activeChunk) {
				loadChunk(sourceChunk, i);
			}
			allLoaded = allLoaded && !!(activeChunk && activeChunk.audioBuffer);

			offset = sourceChunk.offset + sourceChunk.duration;
			i++;
		}

		chunksToUnload.forEach(i => releaseChunk(activeChunks.get(i)));

		if (allLoaded) {
			pendingPrimePromises.forEach(({ resolve }) => resolve());
			pendingPrimePromises.length = 0;
		}

		if (isPlaying) {
			activeChunks.forEach(activeChunk => {
				if (!activeChunk.node && activeChunk.audioBuffer) {
					const contextCurrentTime = audioContext.currentTime;
					const desiredStartTime = playStartTime + Math.max(0, activeChunk.source.offset - startOffset);
					const late = Math.max(0, contextCurrentTime - desiredStartTime);
					const nodeStartOffset = Math.max(0, startOffset - activeChunk.source.offset) + late;
					const nodeStartTime = desiredStartTime + late;
					const maxNodeDuration = playEndTime - nodeStartTime;
					const nodeDuration = Math.min(activeChunk.source.duration - nodeStartOffset, endOffset - activeChunk.source.offset, maxNodeDuration);

					if (nodeDuration > 0) {
						const node = audioContext.createBufferSource();
						if (!activeChunk.audioBuffer) {
							console.warn('missing audio buffer', activeChunk);
						}
						node.buffer = activeChunk.audioBuffer;
						node.onended = () => {
							// console.log('chunk playback ended', activeChunk);
							updatePlayableChunks();
						};
						node.onerror = evt => {
							console.error('playback error', evt, node, activeChunk);
						};
						node.connect(destination);
						node.start(nodeStartTime, nodeStartOffset, nodeDuration);

						activeChunk.node = node;

						// console.log('playing chunk', { nodeStartTime }, {nodeStartOffset}, {nodeDuration}, activeChunk);
					} else {
						// console.log('skipping chunk playback', { nodeStartTime }, {nodeStartOffset}, {nodeDuration}, activeChunk);
					}
				}
			});

		} else {
			if (!ended) {
				ended = true;
				me.emit('ended');
			}
		}
	}

	this.prime = (clipStartOffset = 0, duration = Infinity) => {
		startOffset = clipStartOffset;
		endOffset = Math.min(source && source.duration || Infinity, startOffset + duration);
		if (isCurrentlyPlayable(clipStartOffset)) {
			return Promise.resolve();
		}

		const chunkIndex = findChunkIndex(clipStartOffset);
		if (chunkIndex !== startActiveChunkIndex) {
			pendingPrimePromises.forEach(({ reject }) => reject(new AbortError('Chunk loading aborted')));
			pendingPrimePromises.length = 0;
		}

		return new Promise((resolve, reject) => {
			pendingPrimePromises.push({
				resolve,
				reject
			});

			updatePlayableChunks();
		});
	};

	this.isPrimed = (startOffset = 0, endOffset = startOffset) => {
		const startChunk = findChunkIndex(startOffset);
		const endChunk = endOffset === startOffset ? startChunk : findChunkIndex(endOffset, startChunk);
		for (let i = startChunk; i <= endChunk; i++) {
			const chunk = activeChunks.get(i);
			if (!chunk || !chunk.audioBuffer) {
				return false;
			}
		}

		return true;
	};

	this.unload = () => this.prime(Infinity);

	this.play = (clipStartOffset = 0, duration = Infinity, contextStartTime = audioContext.currentTime) => {
		if (this.playing) {
			pendingPlayPromises.forEach(({ reject }) => reject(new AbortError('Chunk play aborted')));
			pendingPlayPromises.length = 0;
		}

		return new Promise((resolve, reject) => {
			pendingPlayPromises.push({
				resolve,
				reject
			});

			const playSound = () => {
				// todo: should playStartTime account for time passed since `.play()` was called?
				ended = false;
				startOffset = clipStartOffset;
				playStartTime = contextStartTime;

				pendingPlayPromises.forEach(({ resolve }) => resolve());
				pendingPlayPromises.length = 0;

				this.pause(playStartTime + duration);
			};
			if (isCurrentlyPlayable(clipStartOffset)) {
				// resolving a promise takes time so don't wait if we don't have to
				playSound();
			} else {
				this.prime(clipStartOffset, duration).then(playSound);
			}
		});
	};

	this.pause = (when = audioContext.currentTime) => {
		playEndTime = Math.max(audioContext.currentTime, Math.min(playStartTime + source.duration - startOffset, when));
		endOffset = Math.max(0, playEndTime - playStartTime) + startOffset;
		if (playEndTime <= audioContext.currentTime) {
			ended = true;
			pendingPlayPromises.forEach(({ reject }) => reject(new AbortError('Chunk playback aborted')));
			pendingPlayPromises.length = 0;
		}
		activeChunks.forEach(stopChunk);
		updatePlayableChunks();
	};

	this.destroy = () => {
		allOff(this);
		this.pause();
		pendingPrimePromises.forEach(({ reject }) => reject(new AbortError('Chunk loading aborted')));
		pendingPrimePromises.length = 0;
		activeChunks.forEach(releaseChunk);
	};

	Object.defineProperties(this, {
		playing: {
			get: () => playStartTime <= audioContext.currentTime && playEndTime > audioContext.currentTime
		},
		duration: {
			get: () => source.duration
		}
		// todo: currentTime, predicted play end offset (or playback duration)
	});
}

export default ChunkedClip;