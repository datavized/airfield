import updateClip from './updateClip';
import {
	loadAudioFile
} from '../../engine/audioStorage';
import titleText from '../../util/audioFileTitleText';

export default function addClip(state, sourceId, startTime = state.currentTime) {
	// Find first open track that has room at startTime
	// todo: If a track is selected, try to add to that one
	return loadAudioFile(sourceId).then(source => {
		const { duration } = source;
		const endTime = startTime + duration;
		const project = state.project || {};
		const tracks = project.tracks || new Map();
		const clips = project.clips || new Map();
		const trackOrder = project.trackOrder || [];

		let trackIndex = trackOrder.length;
		let trackId = '';

		for (let t = 0; t < trackIndex; t++) {
			const id = trackOrder[t];
			const track = tracks.get(id);
			const trackClips = track && track.clips || [];
			const lastClipIndex = trackClips.length - 1;

			for (let c = 0; c < trackClips.length; c++) {
				const clipId = trackClips[c];
				const clip = clips.get(clipId);
				const start = clip.start;
				const end = start + clip.duration;
				if (start <= endTime && end > startTime) {
					// clip overlaps. No good
					break;
				}
				if (c === lastClipIndex || start > endTime) {
					trackIndex = t;
					trackId = id;
					break;
				}
			}
		}

		return updateClip(state, {
			duration,
			start: startTime,
			name: titleText(source),
			sourceId,
			track: trackId,
			source: {
				duration,
				fileName: source.file.name,
				channels: source.format.channelsPerFrame
			}
		});
	});
}

