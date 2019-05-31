import Worker from '!worker-loader!./mp3.worker.js';

let nextTaskId = 0;
let worker = null;
const pendingTasks = new Map();

function cleanUp() {
	if (worker && !pendingTasks.size) {
		worker.terminate();
		worker = null;
	}
}

function receiveMessage(event) {
	const {
		taskId,
		error,
		blob
	} = event.data;

	const task = pendingTasks.get(taskId);

	if (error) {
		task.reject(error);
		pendingTasks.delete(taskId);
		setTimeout(cleanUp, 5000);
		return;
	}

	const progress = blob ? 1 : event.data.progress;
	if (progress && task.onProgress) {
		task.onProgress(progress);
	}

	if (blob) {
		// finished
		task.resolve(blob);
		pendingTasks.delete(taskId);
		setTimeout(cleanUp, 5000);
	}
}

export default function EncodeMp3Task(meta, options, onProgress, abortSignal) {
	if (!worker) {
		worker = new Worker();
		worker.onmessage = receiveMessage;
	}

	let encodePromise = null;
	let closed = false;
	const taskId = nextTaskId++;
	const queuedChunks = [];
	const task = {
		resolve: null,
		reject: null,
		error: null,
		onProgress
	};
	pendingTasks.set(taskId, task);

	function flushChunks() {
		if (!worker) {
			return;
		}
		const chunks = [];
		const transfers = [];
		while (queuedChunks.length) {
			const chunk = queuedChunks.shift();
			chunk.forEach(a => transfers.push(a.buffer));
			chunks.push(chunk);
			worker.postMessage({
				taskId,
				chunks
			}, transfers);
		}
	}

	this.start = () => {
		// send at least enough to write header
		worker.postMessage({
			...options,
			meta,
			taskId
		});

		if (abortSignal) {
			abortSignal.addEventListener('abort', this.abort);
		}

		flushChunks();
	};

	this.write = buffer => {
		if (closed) {
			throw new Error('Attempting to write to closed encode task');
		}

		const channels = [];
		for (let c = 0; c < buffer.numberOfChannels; c++) {
			channels.push(buffer.getChannelData(c));
		}
		// queuedChunks.push(channels.map(a => a.buffer));
		queuedChunks.push(channels);
		flushChunks();
	};

	this.close = () => {
		closed = true;
		if (encodePromise) {
			return encodePromise;
		}
		encodePromise = new Promise((resolve, reject) => {
			task.resolve = resolve;
			task.reject = reject;

			worker.postMessage({
				taskId,
				command: 'close'
			});
		});
		return encodePromise;
	};

	this.abort = () => {
		if (pendingTasks.has(taskId) && worker) {
			worker.postMessage({
				taskId,
				command: 'abort'
			});
			setTimeout(cleanUp, 5000);
		}
	};
}