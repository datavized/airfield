export default function readBlobAsArrayBuffer(blob) {
	if (blob instanceof ArrayBuffer) {
		return Promise.resolve(blob);
	}

	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.addEventListener('loadend', () => {
			const buffer = reader.result;
			resolve(buffer);
		});
		reader.addEventListener('error', reject);
		reader.readAsArrayBuffer(blob);
	});
}