/*
Inspired by wav-encoder but mostly coded from scratch
https://github.com/mohayonao/wav-encoder
*/

import BinaryWriter from '../../util/BinaryWriter';

export default function WavEncoder(opts) {
	const floatingPoint = !!(opts.floatingPoint || opts.float);
	const bitDepth = floatingPoint ? 32 : Math.floor(opts.bitDepth) || 16;
	const {
		channels,
		sampleRate,

		// symmetric option: https://github.com/mohayonao/wav-decoder/issues/14
		symmetric
	} = opts;

	if (!(channels >= 1 && channels < Infinity)) {
		throw new TypeError('Wav Encoder: missing number of channels');
	}

	if (!(sampleRate >= 1 && sampleRate < Infinity)) {
		throw new TypeError('Wav Encoder: missing sample rate');
	}

	const blobs = [];

	let closed = false;
	let audioDataLength = 0;

	/*
	channelData is an array of channels
	*/
	this.writeBuffer = channelData => {
		if (closed) {
			throw new Error('WAV Encoder: already closed');
		}

		const chunkLength = channelData[0].length;
		const dataLength = chunkLength * channels * bitDepth / 8;
		const writer = new BinaryWriter(dataLength);

		const encoderOption = floatingPoint ? 'f' : symmetric ? 's' : '';
		const methodName = 'pcm' + bitDepth + encoderOption;
		const write = writer[methodName];

		if (!write) {
			throw new TypeError('Not supported bit depth: ' + bitDepth);
		}

		audioDataLength += chunkLength;

		for (let i = 0, imax = chunkLength; i < imax; i++) {
			for (let ch = 0; ch < channels; ch++) {
				write(channelData[ch][i]);
			}
		}
		blobs.push(new Blob([writer.buffer], {
			type: 'application/octet-stream'
		}));
		return dataLength;
	};

	this.close = () => {
		if (closed) {
			throw new Error('WAV Encoder: already closed');
		}
		closed = true;

		// eslint-disable-next-line no-bitwise
		const bytes = bitDepth >> 3;
		const length = audioDataLength * channels * bytes;

		const writer = new BinaryWriter(44);
		writer.string('RIFF');
		writer.uint32(length + 44 - 8);
		writer.string('WAVE');

		writer.string('fmt ');
		writer.uint32(16);
		writer.uint16(floatingPoint ? 0x0003 : 0x0001); // format ID
		writer.uint16(channels);
		writer.uint32(sampleRate);
		writer.uint32(sampleRate * channels * bytes);
		writer.uint16(channels * bytes);
		writer.uint16(bitDepth);

		// todo: write metadata

		// header for data section
		writer.string('data');
		writer.uint32(length);

		// prepend header and create complete blob
		blobs.unshift(new Blob([writer.buffer], {
			type: 'application/octet-stream'
		}));
		return new Blob(blobs, { type: 'audio/wav' });
	};
}