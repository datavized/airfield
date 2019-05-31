const noop = function () {
};

function RetryHandler() {
	this.interval = 1000;
	// Start at one second
	this.maxInterval = 60 * 1000;	// Don't wait longer than a minute
}
/**
 * Invoke the function after waiting
 *
 * @param {function} fn Function to invoke
 */
RetryHandler.prototype.retry = function (fn) {
	setTimeout(fn, this.interval);
	this.interval = this.nextInterval();
};
/**
 * Reset the counter (e.g. after successful request.)
 */
RetryHandler.prototype.reset = function () {
	this.interval = 1000;
};
/**
 * Calculate the next wait time.
 * @return {number} Next wait interval, in milliseconds
 *
 * @private
 */
RetryHandler.prototype.nextInterval = function () {
	const interval = this.interval * 2 + this.getRandomInt(0, 1000);
	return Math.min(interval, this.maxInterval);
};
/**
 * Get a random int in the range of min to max. Used to add jitter to wait times.
 *
 * @param {number} min Lower bounds
 * @param {number} max Upper bounds
 * @private
 */
RetryHandler.prototype.getRandomInt = function (min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
};

/**
 * Helper class for resumable uploads using XHR/CORS. Can upload any Blob-like item, whether
 * files or in-memory constructs.
 *
 * @example
 * var content = new Blob(["Hello world"], {"type": "text/plain"});
 * var uploader = new GoogleDriveUploader({
 *   file: content,
 *   token: accessToken,
 *   onComplete: function(data) { ... }
 *   onError: function(data) { ... }
 * });
 * uploader.upload();
 *
 * @constructor
 * @param {object} options Hash of options
 * @param {string} options.token Access token
 * @param {blob} options.file Blob-like item to upload
 * @param {string} [options.fileId] ID of file if replacing
 * @param {object} [options.params] Additional query parameters
 * @param {string} [options.contentType] Content-type, if overriding the type of the blob.
 * @param {object} [options.metadata] File metadata
 * @param {function} [options.onComplete] Callback for when upload is complete
 * @param {function} [options.onProgress] Callback for status for the in-progress upload
 * @param {function} [options.onError] Callback if upload fails
 */
const GoogleDriveUploader = function (options) {
	const file = options.file;
	const contentType = options.contentType || file.type || 'application/octet-stream';
	const metadata = Object.assign({
		name: file.name,
		mimeType: contentType
	}, options.metadata);

	const onComplete = options.onComplete || noop;
	const onProgress = options.onProgress || noop;
	const onError = options.onError || noop;
	const chunkSize = options.chunkSize || 0;
	const retryHandler = new RetryHandler();
	const httpMethod = options.fileId ? 'PATCH' : 'POST';
	let offset = options.offset || 0;
	let url = options.url;
	let started = false;
	let xhr = null;

	// if options.token omitted, get access_token from existing window.gapi instance, if any
	// see https://developers.google.com/api-client-library/javascript/reference/referencedocs
	let token = '';
	if (options.token) {
		token = options.token;
	} else {
		try {
			token = window.gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse(true).access_token;
		} catch (e) {
			throw new Error('Uploader: missing Google OAuth2 access_token');
		}
	}

	/**
	 * Send the actual file content.
	 *
	 * @private
	 */
	function sendFile() {
		let content = file;
		let end = file.size;
		if (offset || chunkSize) {
			// Only bother to slice the file if we're either resuming or uploading in chunks
			if (chunkSize) {
				end = Math.min(offset + chunkSize, file.size);
			}
			content = content.slice(offset, end);
		}

		xhr = new XMLHttpRequest();
		xhr.open('PUT', url, true);
		xhr.setRequestHeader('Content-Type', contentType);
		xhr.setRequestHeader('Content-Range', 'bytes ' + offset + '-' + (end - 1) + '/' + file.size);
		xhr.setRequestHeader('X-Upload-Content-Type', file.type);
		if (xhr.upload) {
			xhr.upload.addEventListener('progress', onProgress);
		}
		xhr.onload = onContentUploadSuccess;
		xhr.onerror = onContentUploadError;
		xhr.send(content);
	}

	/**
	 * Query for the state of the file for resumption.
	 *
	 * @private
	 */
	function resume() {
		xhr = new XMLHttpRequest();
		xhr.open('PUT', url, true);
		xhr.setRequestHeader('Content-Range', 'bytes */' + file.size);
		xhr.setRequestHeader('X-Upload-Content-Type', file.type);
		if (xhr.upload) {
			xhr.upload.addEventListener('progress', onProgress);
		}
		xhr.onload = onContentUploadSuccess;
		xhr.onerror = onContentUploadError;
		xhr.send();
	}

	/**
	 * Extract the last saved range if available in the request.
	 *
	 * @param {XMLHttpRequest} xhr Request object
	 */
	function extractRange(xhr) {
		const range = xhr.getResponseHeader('Range');
		if (range) {
			offset = parseInt(range.match(/\d+/g).pop(), 10) + 1;
		}
	}

	/**
	 * Handle successful responses for uploads. Depending on the context,
	 * may continue with uploading the next chunk of the file or, if complete,
	 * invokes the caller's callback.
	 *
	 * @private
	 * @param {object} e XHR event
	 */
	function onContentUploadSuccess(e) {
		xhr = null;
		if (e.target.status === 200 || e.target.status === 201) {
			onComplete(e.target.response);
		} else if (e.target.status === 308) {
			extractRange(e.target);
			retryHandler.reset();
			sendFile();
		} else {
			onContentUploadError(e);
		}
	}

	/**
	 * Handles errors for uploads. Either retries or aborts depending
	 * on the error.
	 *
	 * @private
	 * @param {object} e XHR event
	 */
	function onContentUploadError(e) {
		if (e.target.status && e.target.status < 500) {
			onError(e.target.response);
		} else {
			retryHandler.retry(resume);
		}
	}

	/**
	 * Handles errors for the initial request.
	 *
	 * @private
	 * @param {object} e XHR event
	 */
	function onUploadError(e) {
		xhr = null;
		onError(e.target.response);	// TODO - Retries for initial upload
	}

	/**
	 * Construct a query string from a hash/object
	 *
	 * @private
	 * @param {object} [params] Key/value pairs for query string
	 * @return {string} query string
	 */
	function buildQuery(params) {
		params = params || {};
		return Object.keys(params).map(key =>
			encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
		).join('&');
	}

	/**
	 * Build the drive upload URL
	 *
	 * @private
	 * @param {string} [id] File ID if replacing
	 * @param {object} [params] Query parameters
	 * @return {string} URL
	 */
	function buildUrl(id, params, baseUrl) {
		// modified next line to use v3, not v2 -- PJB, 2017-11-01
		let url = baseUrl || 'https://www.googleapis.com/upload/drive/v3/files/';
		if (id) {
			url += id;
		}
		const query = buildQuery(params);
		if (query) {
			url += '?' + query;
		}
		return url;
	}

	if (!url) {
		const params = options.params || {};
		params.uploadType = 'resumable';
		url = buildUrl(options.fileId, params, options.baseUrl);
	}

	/**
	 * Initiate the upload.
	 */
	this.upload = function () {
		if (started) {
			throw new Error('Uploader: upload already started');
		}

		started = true;
		xhr = new XMLHttpRequest();
		xhr.open(httpMethod, url, true);
		xhr.setRequestHeader('Authorization', 'Bearer ' + token);
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.setRequestHeader('X-Upload-Content-Length', file.size);
		xhr.setRequestHeader('X-Upload-Content-Type', contentType);
		xhr.onload = e => {
			xhr = null;
			if (e.target.status < 400) {
				const location = e.target.getResponseHeader('Location');
				url = location;
				sendFile();
			} else {
				onUploadError(e);
			}
		};
		xhr.onerror = onUploadError;
		xhr.send(JSON.stringify(metadata));
	};

	this.abort = () => {
		if (!this.started) {
			return;
		}

		if (xhr) {
			xhr.abort();
			xhr = null;
		}

		this.started = false;
	};
};

export default GoogleDriveUploader;