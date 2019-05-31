/* global DEBUG */
import findClip from '../findClip';
import projectDuration from './projectDuration';

// todo: combine updateClip and deleteClip...somehow?
export function deleteClips(state, ids) {
	const oldProject = state.project || {};
	const oldClips = ids.map(id => findClip(oldProject, id)).filter(clip => !!clip);
	if (!oldClips.length) {
		return null;
	}

	const project = {
		...oldProject,
		tracks: new Map(oldProject.tracks),
		clips: new Map(oldProject.clips)
	};

	const oldTrackIds = new Set();
	oldClips.forEach(clip => oldTrackIds.add(clip.track));
	oldTrackIds.forEach(trackId => {
		const oldTrack = project.tracks.get(trackId);
		if (oldTrack) {
			const clips = oldTrack.clips.slice(0);
			const track = {
				...oldTrack,
				clips
			};
			project.tracks.set(trackId, track);
		}
	});
	oldClips.forEach(oldClip => {
		const oldTrack = project.tracks.get(oldClip.track);
		const index = oldTrack && oldTrack.clips ? oldTrack.clips.indexOf(oldClip.id) : -1;
		if (DEBUG && index < 0) {
			// this should never happen
			console.warn('Clip stored in wrong place', oldClip, oldProject);
		} else {
			oldTrack.clips.splice(index, 1);
		}
		project.clips.delete(oldClip.id);
	});

	// delete any empty tracks at the end
	// todo: DRY - same code in updateClip
	for (let i = project.trackOrder.length - 1; i >= 0; i--) {
		const lastTrackId = project.trackOrder[i];
		const lastTrack = project.tracks.get(lastTrackId);

		// todo: don't delete if changed name or any other settings
		if (!lastTrack || !lastTrack.clips.length && !lastTrack.name) {
			project.trackOrder.pop();
			project.tracks.delete(lastTrackId);
		} else {
			break;
		}
	}

	project.duration = projectDuration(project);
	project.timelineLength = projectDuration(project, true);

	return { project };
}

export default function deleteClip(state, id) {
	return deleteClips(state, [id]);
}