import * as idb from 'idb-keyval';
import EventEmitter from 'event-emitter';
import loadBlob from '../util/readBlobAsArrayBuffer';

/*
todo: Make chunk storage pluggable
- retrieve each chunk from IndexedDB given source id and chunk index
- load Blob with FileReader (or arraybuffer in Safari)
- common memory for audio buffers in case multiple clips want to use the same source
*/

const audioDB = new idb.Store('audio-db', 'audio-files');
const attachmentsDB = new idb.Store('audio-attachments-db', 'audio-attachments');

const events = new EventEmitter();
export const on = (type, listener) => events.on(type, listener);
export const off = (type, listener) => events.off(type, listener);
export const once = (type, listener) => events.once(type, listener);

let noBlobsAllowed = false;
export function saveAttachment(key, value) {
	const isBlob = value instanceof Blob;
	if (noBlobsAllowed && isBlob) {
		return loadBlob(value)
			.then(arrayBuffer => saveAttachment(key, arrayBuffer));
	}

	return idb.set(key, value, attachmentsDB).catch(error => {
		if (isBlob && !noBlobsAllowed) {
			noBlobsAllowed = true;

			// try again
			return saveAttachment(key, value);
		}

		throw error;
	});
}

export function getAttachment(key) {
	return idb.get(key, attachmentsDB);
}

export function loadAttachment(key) {
	return idb.get(key, attachmentsDB).then(loadBlob);
}

export async function removeAudioFile(id, emitEvent = true) {
	const audioFileSpec = await idb.get(id, audioDB);
	if (!audioFileSpec) {
		return;
	}

	// delete backup copy of original file
	await idb.del(JSON.stringify([id, 'file']), attachmentsDB);

	// delete cover art if there is any
	await idb.del(JSON.stringify([id, 'coverArt']), attachmentsDB);

	const { format, chunks } = audioFileSpec;
	const { channelsPerFrame } = format;
	for (let i = 0; i < chunks.length; i++) {
		for (let channel = 0; channel < channelsPerFrame; channel++) {
			const key = JSON.stringify([id, i, channel]);
			await idb.del(key, attachmentsDB);
		}
	}

	await idb.del(id, attachmentsDB);

	await idb.del(id, audioDB);

	if (emitEvent) {
		events.emit('delete', id);
		events.emit('update');
	}
}

export async function saveAudioFile(id, object) {
	await removeAudioFile(id, false);

	const {
		coverArt,
		file,
		chunks: blobChunks,
		...rest
	} = object;

	// todo: do this whole thing in a transaction

	if (file) {
		await saveAttachment(JSON.stringify([id, 'file']), file);
	}

	if (coverArt) {
		await saveAttachment(JSON.stringify([id, 'coverArt']), coverArt);
	}

	const chunks = [];
	for (let i = 0; i < blobChunks.length; i++) {
		const {
			blobs,
			...chunk
		} = blobChunks[i];

		chunks.push(chunk);

		for (let channel = 0; channel < blobs.length; channel++) {
			const blob = blobs[channel];
			const key = JSON.stringify([
				id,
				i,
				channel
			]);
			await saveAttachment(key, blob);
		}
	}

	const audioFileSpec = {
		...rest,
		chunks,
		id
	};

	if (file) {
		const {
			lastModified,
			size,
			name,
			type
		} = file;

		audioFileSpec.file = {
			lastModified,
			size,
			name,
			type
		};
	}

	await idb.set(id, audioFileSpec, audioDB);

	events.emit('add', audioFileSpec);
	events.emit('update');

	return audioFileSpec;
}

export function loadAudioChunkBuffer(id, chunkIndex, channel) {
	const key = JSON.stringify([
		id,
		chunkIndex,
		channel
	]);
	return loadAttachment(key);
}

export function loadAudioFile(key) {
	return idb.get(key, audioDB);
}

export function getAudioIds() {
	return idb.keys(audioDB);
}