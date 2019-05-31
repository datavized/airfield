export default function getAudioFileId(file) {
	const {
		name,
		size,
		lastModified
	} = file;
	return JSON.stringify([name, size, lastModified]);
}