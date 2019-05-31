import findClip from '../findClip';
import updateClip from './updateClip';

export default function duplicateClip(state, id) {
	const project = state.project || {};

	const newClip = Object.assign({}, findClip(project, id));
	newClip.start += newClip.duration;
	newClip.id = '';
	const startTime = newClip.start;
	const endTime = startTime + newClip.duration;

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

	newClip.track = trackId;

	return updateClip(state, newClip);
}
