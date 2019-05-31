export default function trackPanMode(track, project) {
	if (!track || track.mute || !track.clips) {
		return '';
	}

	const clips = track.clips
		.map(clipId => project.clips.get(clipId))
		.filter(clip => !!clip && clip.enabled !== false);

	if (!clips.length) {
		return '';
	}

	if (track.mode) {
		return track.mode;
	}

	const channels = clips.reduce((prev, clip) => Math.max(prev, clip.source.channels || 2), 0) || 2;
	if (channels === 1) {
		return 'spatial';
	}

	if (channels === 4) {
		// todo: handle other channel configurations?
		return 'ambisonic';
	}

	return 'stereo';
}