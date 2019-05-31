export function findClips(project, search) {
	if (!project.clips) {
		return [];
	}

	if (typeof search !== 'function') {
		const id = search;
		search = clip => clip.id === id;
	}

	const results = [];
	project.clips.forEach(clip => {
		if (search(clip)) {
			results.push(clip);
		}
	});

	return results;
}

export default function findClip(project, search) {
	const clips = findClips(project, search);
	return clips[0] || null;
}
