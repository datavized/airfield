/* eslint no-bitwise: 0 */

/*
Inspired by wav-encoder
https://github.com/mohayonao/wav-encoder
*/

export default function BinaryWriter(length) {
	const buffer = this.buffer = new ArrayBuffer(length);
	const dataView = this.dataView = new DataView(buffer);

	let pos = 0;

	Object.assign(this, {
		int16: value => {
			dataView.setInt16(pos, value, true);
			pos += 2;
		},
		uint16: value => {
			dataView.setUint16(pos, value, true);
			pos += 2;
		},
		uint32: value => {
			dataView.setUint32(pos, value, true);
			pos += 4;
		},
		string: value => {
			for (let i = 0, imax = value.length; i < imax; i++) {
				dataView.setUint8(pos++, value.charCodeAt(i));
			}
		},
		pcm8: value => {
			value = Math.max(-1, Math.min(value, +1));
			value = (value * 0.5 + 0.5) * 255;
			value = Math.round(value) | 0;
			dataView.setUint8(pos, value, true);
			pos += 1;
		},
		pcm8s: value => {
			value = Math.round(value * 128) + 128;
			value = Math.max(0, Math.min(value, 255));
			dataView.setUint8(pos, value, true);
			pos += 1;
		},
		pcm16: value => {
			value = Math.max(-1, Math.min(value, +1));
			value = value < 0 ? value * 32768 : value * 32767;
			value = Math.round(value) | 0;
			dataView.setInt16(pos, value, true);
			pos += 2;
		},
		pcm16s: value => {
			value = Math.round(value * 32768);
			value = Math.max(-32768, Math.min(value, 32767));
			dataView.setInt16(pos, value, true);
			pos += 2;
		},
		pcm24: value => {
			value = Math.max(-1, Math.min(value, +1));
			value = value < 0 ? 0x1000000 + value * 8388608 : value * 8388607;
			value = Math.round(value) | 0;

			const x0 = value >> 0 & 0xFF;
			const x1 = value >> 8 & 0xFF;
			const x2 = value >> 16 & 0xFF;

			dataView.setUint8(pos + 0, x0);
			dataView.setUint8(pos + 1, x1);
			dataView.setUint8(pos + 2, x2);
			pos += 3;
		},
		pcm24s: value => {
			value = Math.round(value * 8388608);
			value = Math.max(-8388608, Math.min(value, 8388607));

			const x0 = value >> 0 & 0xFF;
			const x1 = value >> 8 & 0xFF;
			const x2 = value >> 16 & 0xFF;

			dataView.setUint8(pos + 0, x0);
			dataView.setUint8(pos + 1, x1);
			dataView.setUint8(pos + 2, x2);
			pos += 3;
		},
		pcm32: value => {
			value = Math.max(-1, Math.min(value, +1));
			value = value < 0 ? value * 2147483648 : value * 2147483647;
			value = Math.round(value) | 0;
			dataView.setInt32(pos, value, true);
			pos += 4;
		},
		pcm32s: value => {
			value = Math.round(value * 2147483648);
			value = Math.max(-2147483648, Math.min(value, +2147483647));
			dataView.setInt32(pos, value, true);
			pos += 4;
		},
		pcm32f: value => {
			dataView.setFloat32(pos, value, true);
			pos += 4;
		}
	});
}
