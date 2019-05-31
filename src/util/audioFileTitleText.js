export default function audioFileTitleText(audioSource) {
	const { metadata, file } = audioSource;
	const t = [];
	if (metadata && metadata.artist) {
		t.push(metadata.artist);
	}
	if (metadata && metadata.title) {
		t.push(metadata.title);
	} else {
		t.push(file.name);
	}
	return t.join(' - ');
}
