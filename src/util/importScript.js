const loadPromises = new Map();

export default function importScript(url, prop, options = {}) {
	if (prop && self[prop]) {
		return Promise.resolve(self[prop]);
	}

	let promise = loadPromises.get(url);
	if (!promise) {
		promise = new Promise((resolve, reject) => {
			const script = document.createElement('script');
			script.async = true;
			script.onload = () => resolve();
			script.onerror = error => reject(error);
			script.src = url;
			if (options.integrity) {
				script.setAttribute('crossorigin', 'anonymous');
				script.setAttribute('integrity', options.integrity);
			}

			document.head.appendChild(script);
		});
		loadPromises.set(url, promise);
	}

	if (prop) {
		return promise.then(() => self[prop]);
	}

	return promise;
}