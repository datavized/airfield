import Worker from '!worker-loader!./audio.worker.js';

/*
todo:
- get rid of loadFormat and loadMeta, probably
- unify worker state. totally broken now
- rethink API. do we want to allow multiple load calls on the same instance?
- allow aborting, destroy
*/

export default function AudioImporter(file) {
	let formatPromise = null;
	let metadataPromise = null;
	let loadPromise = null;
	let worker = null;
	// const worker = new Worker();

	worker = new Worker();

	this.loadFormat = () => {
		if (formatPromise) {
			return formatPromise;
		}

		formatPromise = new Promise((resolve, reject) => {
			function release() {
				worker.removeEventListener('message', onFormatMessage);
				worker.removeEventListener('error', onFormatError);
				// worker.terminate();
			}

			function onFormatError(evt) {
				release();
				reject(evt.message || evt.data.error);
			}

			function onFormatMessage(evt) {
				if (evt.data.error) {
					onFormatError(evt);
					return;
				}

				if (evt.data.format) {
					console.log('format', evt.data.format);
				}
				release();
				resolve(evt.data.format);
			}

			worker.addEventListener('message', onFormatMessage);
			worker.addEventListener('error', onFormatError);
			worker.postMessage({ file });
		});
		return formatPromise;
	};

	this.loadMeta = () => {
		if (metadataPromise) {
			return metadataPromise;
		}

		metadataPromise = new Promise((resolve, reject) => {
			worker = new Worker();

			function release() {
				worker.removeEventListener('message', onMetadataMessage);
				worker.removeEventListener('error', onMetadataError);
				// worker.terminate();
			}

			function onMetadataError(evt) {
				release();
				reject(evt.message || evt.data.error);
			}

			function onMetadataMessage(evt) {
				if (evt.data.error) {
					onMetadataError(evt);
					return;
				}

				if (evt.data.metadata) {
					console.log('metadata', evt.data.metadata);
				}
				release();
				resolve(evt.data.metadata);
			}

			worker.addEventListener('message', onMetadataMessage);
			worker.addEventListener('error', onMetadataError);
			// worker.postMessage({ file });
		});
		return metadataPromise;
	};

	this.load = onProgress => {
		if (loadPromise) {
			return loadPromise;
		}

		loadPromise = new Promise((resolve, reject) => {
			function release() {
				worker.removeEventListener('message', onLoadMessage);
				worker.removeEventListener('error', onLoadError);
				worker.terminate();
			}

			function onLoadError(evt) {
				release();
				reject(evt.message || evt.data.error);
			}

			function onLoadMessage(evt) {
				if (evt.data.error) {
					onLoadError(evt);
					return;
				}

				if (evt.data.progress && onProgress) {
					onProgress(evt.data.progress);
				}

				// todo: handle finished success
				if (evt.data.format) {
					release();
					resolve({
						...evt.data,
						file
					});
				}

			}

			worker.addEventListener('message', onLoadMessage);
			worker.addEventListener('error', onLoadError);
			worker.postMessage({
				file,
				buffer: true
			});
		});
		return loadPromise;
	};
}