import equal from '../../util/equal';
import num from '../../util/num';
import generateId from '../../util/generateId';

/*
Warning: this does not check array of clips
Need to edit that with updateClip
*/
export default function updateTrack(state, changes) {
	const oldProject = state.project || {};
	const oldTrack = oldProject.tracks.get(changes.id);
	const track = Object.assign({}, oldTrack, changes);

	if (!track.id) {
		track.id = generateId();
	}

	if (!track.clips) {
		track.clips = [];
	}
	if (isNaN(track.order)) {
		track.order = oldProject && oldProject.tracks && oldProject.tracks.size || 0;
	}

	// return nothing if clip hasn't changed?
	if (equal(track, oldTrack)) {
		return null;
	}

	const project = {
		...oldProject,
		tracks: new Map(oldProject.tracks)
	};

	/*
	if order changed, fix order values on all other
	clips and re-sort trackorder
	*/
	project.tracks.set(track.id, track);

	const orderIndex = num(oldTrack && oldTrack.order, project.trackOrder.length);
	if (orderIndex !== track.order) {
		project.trackOrder = Array.from(project.trackOrder);
		project.trackOrder.splice(orderIndex, 1);
		project.trackOrder.splice(track.order, 0, track.id);

		const lowest = Math.min(orderIndex, track.order);
		for (let i = project.trackOrder.length - 1; i >= lowest; i--) {
			const tid = project.trackOrder[i];
			const track = project.tracks.get(tid);
			if (track.order !== i) {
				project.tracks.set(tid, {
					...track,
					order: i
				});
			}
		}
	} else {
		project.trackOrder = Array.from(project.trackOrder);
		project.trackOrder[track.order] = track.id;
	}


	return { project };
}