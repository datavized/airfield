/*
10MB
divide by 4 because each sample is a 4-byte float32
*/
const FLOAT_SIZE = 4;
const CHUNK_SIZE = 1024 * 1024 * 10 / FLOAT_SIZE;

export default function Chunkifier(format) {
	const me = this;
	const chunks = [];
	const {
		channelsPerFrame,
		sampleRate
	} = format;
	let chunkBuffers = null;
	let chunkSize = 0;
	let size = 0;
	let offset = 0;
	let closed = false;

	this.progress = 0;

	function finishChunk() {
		if (chunkBuffers && chunkSize > 0) {
			size += chunkSize;

			const samples = chunkSize / FLOAT_SIZE / channelsPerFrame;
			const chunkDuration = samples / sampleRate;

			if (chunkSize % (channelsPerFrame * FLOAT_SIZE)) {
				console.warn('chunk is the wrong size');
			}

			const blobChunksByChannel = [];
			for (let c = 0; c < channelsPerFrame; c++) {
				const channelChunk = new Float32Array(samples);
				blobChunksByChannel[c] = channelChunk;

				for (let i = 0, b = 0, n = c, buffer = chunkBuffers[b]; i < samples && b < chunkBuffers.length; i++, n += channelsPerFrame) {
					if (n >= buffer.length) {
						n = n % buffer.length;
						b++;
						buffer = chunkBuffers[b];
					}

					channelChunk[i] = buffer[n];
				}
			}

			const blobs = blobChunksByChannel.map(blobChunks => new Blob([blobChunks], {
				type: 'application/octet-stream'
			}));
			const chunk = {
				offset,
				duration: chunkDuration,
				samples,
				blobs
			};
			chunks.push(chunk);
			offset += chunkDuration;

			me.progress = offset;
		}
		chunkBuffers = null;
		chunkSize = 0;
	}

	this.add = buffer => {
		if (closed) {
			throw new Error('Chunkifier already closed');
		}

		if (!chunkBuffers) {
			chunkBuffers = [];
		}

		chunkBuffers.push(buffer);
		chunkSize += buffer.byteLength;

		if (chunkSize >= CHUNK_SIZE && chunkSize % (channelsPerFrame * FLOAT_SIZE) === 0) {
			finishChunk();
		}
	};

	this.close = () => {
		if (closed) {
			throw new Error('Chunkifier already closed');
		}

		closed = true;

		finishChunk();

		const samples = size / FLOAT_SIZE / channelsPerFrame;
		const duration = samples / sampleRate;

		return {
			samples,
			duration,
			chunks
		};
	};
}