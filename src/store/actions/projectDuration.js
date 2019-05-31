export default function projectDuration(project, includeDisabled = false) {
	return Array.from(project.clips.values())
		.reduce((max, {start, duration, enabled}) =>
			Math.max(max, enabled !== false || includeDisabled ?  start + duration : 0), 0);
}