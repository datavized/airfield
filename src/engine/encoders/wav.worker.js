import WavEncoder from './WavEncoder';

const sampleBlockSize = 4096;
// const MAX_CHANNELS = Infinity;

function defer() {
	return new Promise(resolve => setTimeout(resolve, 0));
}

const runningTasks = new Map();

async function writeTaskBuffers(taskId, progressCallback) {
	const task = runningTasks.get(taskId);
	if (!task) {
		throw new Error('WAV Encoder: unknown task ' + taskId);
	}

	const {
		encoder,
		queuedChunks,
		sampleRate
	} = task;

	while (queuedChunks.length) {
		const chunk = queuedChunks[0];
		// const channels = Math.min(chunk.length, task.channels, MAX_CHANNELS);
		const length = Math.min(chunk[0].length);
		for (let i = 0; i < length; i += sampleBlockSize) {
			const blockDuration = sampleBlockSize / sampleRate;
			const endOffset = Math.min(i + sampleBlockSize, length);
			const block = chunk.map(chan => chan.subarray(i, endOffset));
			task.size += encoder.writeBuffer(block);
			task.duration += blockDuration;
			progressCallback(task.duration);

			await defer();
			if (!runningTasks.has(taskId)) {
				const e = new Error('WAV encoding task aborted');
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
		throw new Error('WAV Encoder: unknown task ' + taskId);
	}
	// todo: write metadata (if any)
	const {
		encoder,
		// meta,
		writeOperations
	} = task;

	await Promise.all(writeOperations);

	// todo: save metadata

	// finish writing wav
	return encoder.close();
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
			bitDepth,
			meta = {}
		} = event.data;
		task = {
			encoder: new WavEncoder({
				channels,
				sampleRate,
				bitDepth
			}),
			queuedChunks: [],
			writeOperations: [],
			channels,
			sampleRate,
			bitDepth,
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
					console.log('wav.worker error', error, error.stack);
					self.postMessage({
						taskId,
						error: error.message
					});
				}
			}
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
				console.log('wav.worker error', error, error.stack);
				self.postMessage({
					taskId,
					error: error.message
				});
			}
		}
		runningTasks.delete(taskId);
	}
});