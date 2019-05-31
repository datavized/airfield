import Asset from 'av/src/asset';
import readBlobAsArrayBuffer from '../readBlobAsArrayBuffer';
import Chunkifier from './Chunkifier';

/*
Are we sure it's worth all the effort to lazy-load all these decoders and demuxers?
We're probably going to load them all anyway with the service worker.
*/
const formatLoaders = {
	aiff: () => import('av/src/demuxers/aiff'),
	au: () => import('av/src/demuxers/au'),
	caf: () => import('av/src/demuxers/caf'),
	m4a: () => import('av/src/demuxers/m4a'),
	wav: () => import('av/src/demuxers/wave'),

	mp3: () => import('mp3'),
	aac: () => import('aac'),
	alac: () => import('alac'),
	lpcm: () => import('av/src/decoders/lpcm'),
	xlaw: () => import('av/src/decoders/xlaw'),
	ogg: () => import('./ogg')
};
formatLoaders.wave = formatLoaders.wav;
formatLoaders.mp4a = formatLoaders.aac;
formatLoaders.mpeg = formatLoaders.mp3;

let file = null;

const xRegex = /^x-/i;
function getLoader(type) {
	type = type.replace(xRegex, '');
	const loader = formatLoaders[type];
	if (loader) {
		delete formatLoaders[type];
		return loader();
	}

	return Promise.resolve();
}

async function getFormat(file) {
	const type = file.type.replace(/^audio\//, '');
	await getLoader(type);

	const sourceBuffer = await readBlobAsArrayBuffer(file);
	const asset = Asset.fromBuffer(sourceBuffer);
	return await new Promise((resolve, reject) => {
		let hasFormat = false;
		asset.on('error', error => {
			if (!hasFormat) {
				asset.destroy();
				reject(error);
			}
		});
		asset.once('format', format => {
			hasFormat = !!format;
			if (hasFormat) {
				const { formatID } = format;

				// todo: only if not error and not aborted or destroyed
				getLoader(formatID).then(() => {
					asset.destroy();
					resolve(format);
				});
			}
		});
		asset.start(false);
	});
}

async function processFile(data) {
	if (file) {
		throw new Error('Already received file');
	}

	file = data.file;

	/*
	Be careful with this format object, since `floatingPoint` property is not accurate
	until after the decoder has been loaded. Other properties may not be accurate either,
	but the important stuff (sample rate and channelsPerFrame) seems to work so far.
	*/
	const format = await getFormat(file);

	let duration = 0;

	const sourceBuffer = await readBlobAsArrayBuffer(file);
	const asset = Asset.fromBuffer(sourceBuffer);
	const chunkifier = new Chunkifier(format);
	asset.on('duration', ms => {
		duration = ms / 1000;
	});
	asset.on('error', err => {
		console.warn('Asset error', err);
		// todo: abort!
	});


	asset.on('data', buffer => {
		chunkifier.add(buffer);
		if (duration) {
			self.postMessage({
				progress: 100 * chunkifier.progress / duration
			});
		}
	});
	asset.on('end', () => {
		const output = chunkifier.close();

		let coverArt = asset.metadata && (asset.metadata.coverArt || asset.metadata.PIC) || null;
		if (coverArt) {
			delete asset.metadata.coverArt;
			delete asset.metadata.PIC;
			if (coverArt.data) {
				if (coverArt.data.toBlob) {
					coverArt = coverArt.data.toBlob();
				} else {
					coverArt = new Blob([coverArt.data], {
						type: 'application/octet-stream'
					});
				}
			} else {
				coverArt = null;
			}
		}

		self.postMessage({
			...output,
			format: asset.format,
			metadata: asset.metadata,
			coverArt
		});

		asset.destroy();
		file = null;
	});
	asset.start(true);
}

self.addEventListener('message', ({data}) => {
	if (data.file) {
		processFile(data);
	}
});