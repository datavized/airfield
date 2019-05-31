import { deleteClips } from './deleteClip';

export default function deleteTrack(state, trackId) {
	const oldProject = state.project || {};
	const oldTracks = oldProject.tracks || new Map();
	const oldTrack = oldTracks.get(trackId);
	if (!oldTrack) {
		return null;
	}

	// delete all clips
	// make sure we have a new object if no clips
	const { project } = deleteClips(state, oldTrack.clips || []) || {
		project: {
			...oldProject,
			tracks: new Map(oldProject.tracks),
			clips: new Map(oldProject.clips)
		}
	};

	// delete track and fix order values
	const orderIndex = oldTrack.order;
	project.trackOrder.splice(orderIndex, 1);
	project.tracks.delete(trackId);

	for (let i = orderIndex; i < project.trackOrder.length; i++) {
		const tid = project.trackOrder[i];
		const track = {
			...project.tracks.get(tid),
			order: i
		};
		project.tracks.set(tid, track);
	}

	return { project };
}