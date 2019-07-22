import lamejs from 'lamejs';
import ID3Writer from 'browser-id3-writer';

//can be anything but make it a multiple of 576 to make encoders life easier
const sampleBlockSize = 1152;

function defer() {
	return new Promise(resolve => setTimeout(resolve, 0));
}

const runningTasks = new Map();

function setTag(writer, key, val) {
	try {
		writer.setFrame(key, val);
	} catch (e) {
		console.warn('Unable to set mp3 metadata', key, e.message);
	}
}

async function writeTaskBuffers(taskId, progressCallback) {
	const task = runningTasks.get(taskId);
	if (!task) {
		throw new Error('MP3 Encoder: unknown task ' + taskId);
	}

	const {
		encoder,
		encodedBufferChunks,
		queuedChunks,
		sampleRate
	} = task;

	/*
	todo: support channel configurations other than stereo.
	requires a different encoder
	https://github.com/datavized/interdimensional-audio/issues/15
	*/
	while (queuedChunks.length) {
		// lamejs wants everything to be scaled up
		// https://github.com/zhuker/lamejs/issues/10#issuecomment-141718262
		const chunk = queuedChunks[0].map(original => {
			const scaled = new Float32Array(original.length);
			for (let i = 0; i < scaled.length; i++) {
				scaled[i] = original[i] * 32767.5;
			}
			return scaled;
		});

		const left = chunk[0];
		const right = chunk[1] || left;
		const length = Math.min(left.length, right.length);
		for (let i = 0; i < length; i += sampleBlockSize) {
			const blockDuration = sampleBlockSize / sampleRate;
			const leftChunk = left.subarray(i, i + sampleBlockSize);
			const rightChunk = right.subarray(i, i + sampleBlockSize);
			const encodedChunk = encoder.encodeBuffer(leftChunk, rightChunk);
			if (encodedChunk.length > 0) {
				encodedBufferChunks.push(encodedChunk);
				task.size += encodedChunk.length;
			}
			task.duration += blockDuration;
			progressCallback(task.duration);

			await defer();
			if (!runningTasks.has(taskId)) {
				const e = new Error('MP3 encoding task aborted');
				e.name = 'AbortError';
				throw e;
			}
		}
		queuedChunks.shift();
	}
}

async function finishTask(taskId) {
	const task = runningTasks.get(taskId);
	if (!task) {
		throw new Error('MP3 Encoder: unknown task ' + taskId);
	}

	const {
		encoder,
		encodedBufferChunks,
		meta,
		writeOperations
	} = task;

	await Promise.all(writeOperations);

	// finish writing mp3
	const encodedChunk = encoder.flush();
	if (encodedChunk.length > 0) {
		encodedBufferChunks.push(encodedChunk);
		task.size += encodedChunk.length;
	}

	if (!meta || !Object.keys(meta).length) {
		const blob = new Blob(encodedBufferChunks, { type: 'audio/mp3' });
		return blob;
	}

	const encoded = new Int8Array(task.size);
	for (let i = 0, offset = 0; i < encodedBufferChunks.length; i++) {
		const chunk = encodedBufferChunks[i];
		encoded.set(chunk, offset);
		offset += chunk.length;
	}

	const id3writer = new ID3Writer(encoded.buffer);
	id3writer.padding = 0;
	Object.keys(meta).forEach(key => {
		const val = meta[key];
		if (Array.isArray(val)) {
			val.forEach(v => setTag(id3writer, key, v));
		} else {
			setTag(id3writer, key, val);
		}
	});
	id3writer.addTag();

	return new Blob([id3writer.arrayBuffer], { type: 'audio/mp3' });
}

self.addEventListener('message', async event => {
	const {
		taskId,
		command
	} = event.data;

	if (command === 'abort') {
		runningTasks.delete(taskId);
		return;
	}

	let task = runningTasks.get(taskId);
	if (!task) {
		const {
			channels = 2,
			sampleRate = 44100,
			bitRate = 128,
			meta = {}
		} = event.data;
		task = {
			encoder: new lamejs.Mp3Encoder(channels, sampleRate, bitRate),
			queuedChunks: [],
			encodedBufferChunks: [],
			writeOperations: [],
			channels,
			sampleRate,
			bitRate,
			meta,
			size: 0,
			duration: 0
		};
		runningTasks.set(taskId, task);
	}

	if (event.data.chunks) {
		const {
			chunks
		} = event.data;

		const processRunning = task.queuedChunks.length > 0;
		chunks.forEach(c => task.queuedChunks.push(c));

		if (!processRunning) {
			try {
				// console.log('encoding chunks', task.queuedChunks);
				const op = writeTaskBuffers(taskId, progress => {
					// todo: calculate progress somehow or just report how much
					// processed so far, since we don't know the final duration
					self.postMessage({
						progress,
						taskId
					});
				});
				task.writeOperations.push(op);
				await op;
			} catch (error) {
				if (error.name !== 'AbortError') {
					console.log('mp3.worker error', error, error.stack);
					self.postMessage({
						taskId,
						error: error.message
					});
				}
			}
			// console.log('done encoding chunks');
		}
	}

	if (command === 'close') {
		try {
			const blob = await finishTask(taskId);
			self.postMessage({
				blob,
				taskId
			});
		} catch (error) {
			if (error.name !== 'AbortError') {
				console.log('mp3.worker error', error, error.stack);
				self.postMessage({
					taskId,
					error: error.message
				});
			}
		}
		runningTasks.delete(taskId);
	}
});