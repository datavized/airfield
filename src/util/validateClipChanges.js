import equal from '../util/equal';
import num from './num';
import findClip from '../store/findClip';
import generateId from './generateId';

// todo: use binary search
function findPrevious(clip, project) {
	const tracks = project.tracks || new Map();
	const track = tracks.get(clip.track);
	const projectClips = project.clips || new Map();
	const clips = track && track.clips || [];
	const start = clip.start;

	let previous = null;
	for (let i = 0; i < clips.length; i++) {
		const cid = clips[i];
		const c = projectClips.get(cid);
		if (c && c.id !== clip.id) {
			if (c.start >= start) {
				break;
			}
			previous = c;
		}
	}
	return previous;
}

function findNext(clip, project) {
	const tracks = project.tracks || new Map();
	const track = tracks.get(clip.track);
	const projectClips = project.clips || new Map();
	const clips = track && track.clips || [];
	const start = clip.start;

	let next = null;
	for (let i = clips.length - 1; i >= 0; i--) {
		const cid = clips[i];
		const c = projectClips.get(cid);
		if (c && c.id !== clip.id) {
			if (c.start < start) {
				break;
			}
			next = c;
		}
	}
	return next;
}

const timePropertyKeys = ['start', 'offset', 'duration'];

function clipChanged(original, modified, snapTime) {
	const originalOther = snapTime && Object.assign({}, original) || original;
	const modifiedOther = snapTime && Object.assign({}, modified) || modified;
	if (snapTime) {
		timePropertyKeys.forEach(k => {
			delete originalOther[k];
			delete modified[k];
		});
	}
	return !equal(originalOther, modifiedOther) ||
		snapTime && timePropertyKeys.some(key => Math.abs(original[key] - modified[key]) <= snapTime);
}

export default function validateClipChanges(changes, project, snapTime = 0) {
	const clip = Object.assign({}, changes);

	// if track doesn't exist create a new track at the end
	if (!clip.track) {
		clip.track = generateId();
	}

	if (clip.enabled === undefined) {
		clip.enabled = true;
	}

	// First, run against fundamental logic of timeline and sources

	// duration >= 0
	clip.duration = Math.max(0, num(clip.duration, Infinity));

	// duration <= [source duration]
	const sourceDuration = clip.source && !isNaN(clip.source.duration) ?
		clip.source.duration :
		Infinity;

	// offset <= [source duration]
	if (clip.offset < 0 && clip.duration >= sourceDuration) {
		const diff = -clip.offset;
		clip.offset = 0;
		clip.duration -= diff;
		clip.start += diff;
	}
	clip.offset = Math.max(0, clip.offset || 0);
	clip.offset = Math.min(sourceDuration, clip.offset);

	clip.duration = Math.min(sourceDuration - clip.offset, clip.duration);

	// start >= 0
	// are we sure this is necessary? probably
	clip.start = Math.max(0, clip.start || 0);

	// don't edit unless we've made significant changes
	const original = findClip(project, clip.id);
	if (original && !clipChanged(original, clip, snapTime)) {
		return Object.assign({}, original);
	}

	const previousClip = findPrevious(clip, project);
	const nextClip = findNext(clip, project);

	// start >= previous clip on track
	const minStartTime = previousClip && previousClip.start + previousClip.duration || 0;
	const maxEndTime = nextClip ? nextClip.start : Infinity;
	const maxDuration = maxEndTime - minStartTime;

	// todo: or minimum clip length
	if (maxDuration === 0) {
		return null;
	}

	// todo: optionally snap to start/end of clips on other tracks

	const trimming = original && (clip.duration !== original.duration || clip.offset !== original.offset);
	if (trimming) {
		if (clip.start + clip.duration > maxEndTime) {
			clip.duration = maxEndTime - clip.start;
		} else if (clip.start < minStartTime) {
			const diff = minStartTime - clip.start;
			clip.start = minStartTime;
			clip.offset += diff;
			clip.duration -= diff;
		}
	} else {

		clip.start = Math.max(clip.start, minStartTime);

		// end [start + duration] <= next clip on track (if any)
		// todo: optionally, bump following clips later to fit this one?
		if (clip.duration < maxDuration) {
			// enough space to move around
			clip.start = Math.min(clip.start, maxEndTime - clip.duration);
		} else {
			clip.start = minStartTime;
			clip.duration = maxDuration;
		}
	}

	return clip;
}
