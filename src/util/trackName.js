export default function trackName({name, order, clips}, project) {
	if (name) {
		return name;
	}

	const clipObjects = project && clips &&
		clips.map(id => project.clips.get(id)).filter(c => !!c);

	const clipsLength = clipObjects && clipObjects.length || 0;
	const orderName = 'Track ' + ((order || 0) + 1);
	if (clipsLength) {
		const firstClip = clipObjects[0];
		const firstClipName = firstClip.name || firstClip.source.fileName;
		for (let i = 1; i < clips.length; i++) {
			const clip = project.clips.get(clips[i]);
			const clipName = clip.name || clip.source.fileName;
			if (clipName !== firstClipName) {
				return orderName;
			}
		}

		return firstClipName;
	}

	return orderName;
}