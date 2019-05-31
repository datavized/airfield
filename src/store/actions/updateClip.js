/* global DEBUG */
import equal from '../../util/equal';
import findClip from '../findClip';
import projectDuration from './projectDuration';
import validateClipChanges from '../../util/validateClipChanges';
import generateId from '../../util/generateId';

const sortClips = project => (ai, bi) => {
	const a = project.clips.get(ai);
	const b = project.clips.get(bi);
	if (a.start === b.start) {
		return a.duration - b.duration;
	}

	return a.start - b.start;
};

export default function updateClip(state, clip) {
	// validate clip changes
	const oldProject = state.project || {};
	const oldClip = findClip(oldProject, clip.id);
	// return nothing if clip hasn't changed?
	if (equal(clip, oldClip)) {
		return null;
	}

	clip = validateClipChanges(clip, oldProject);

	if (!clip.id) {
		clip.id = generateId();
	}

	// return nothing if clip hasn't changed?
	if (equal(clip, oldClip)) {
		return null;
	}

	const project = {
		...oldProject,
		tracks: new Map(oldProject.tracks),
		clips: new Map(oldProject.clips)
	};

	// don't need to copy over tracks, just update clips/
	// unless the track doesn't exist, in which case we need to create one

	const oldTrack = oldClip && project.tracks.get(oldClip.track);
	const index = oldTrack && oldTrack.clips ? oldTrack.clips.indexOf(oldClip.id) : -1;
	if (DEBUG && oldClip && index < 0) {
		// this should never happen
		console.warn('Clip stored in wrong place', oldClip, oldProject);
	} else if (oldClip) {
		// splice, but make a new array
		const clips = oldTrack.clips.slice(0);
		clips.splice(index, 1);
		const track = {
			...oldTrack,
			clips
		};
		project.tracks.set(oldClip.track, track);
	}
	if (!project.tracks.has(clip.track)) {
		// track not found. create a new one
		// may need a common function to generate a new track
		if (!clip.track) {
			clip.track = generateId();
		}

		const track = {
			id: clip.track,
			clips: [],
			order: project.tracks.size
		};
		project.tracks.set(track.id, track);
		project.trackOrder.push(track.id);
	} else if (!oldClip || oldClip.track !== clip.track) {
		// new destination track needs to be copied
		const track = {
			...project.tracks.get(clip.track)
		};
		track.clips = track.clips.slice(0);
	}

	project.clips.set(clip.id, clip);

	const track = project.tracks.get(clip.track);
	track.clips.push(clip.id);
	track.clips.sort(sortClips(project));

	// delete any empty tracks at the end
	// todo: DRY - same code in deleteClip
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
