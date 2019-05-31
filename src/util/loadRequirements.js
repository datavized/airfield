const specs = {
	StoreApp: () => import('../components/StoreApp'),
	AudioContext: () => {
		if (window.AudioContext) {
			return Promise.resolve({
				AudioContext,
				OfflineAudioContext
			});
		}
		return import('standardized-audio-context').then(module => {
			const {
				AudioContext,
				OfflineAudioContext
			} = module;
			return {
				AudioContext,
				OfflineAudioContext
			};
		});
	}
};

const requirements = {};

let promise = null;
function loadRequirements() {
	if (!promise) {
		const promises = Object.keys(specs).map(key => {
			const load = specs[key];
			return load().then(res => {
				requirements[key] = res;
				return res;
			});
		});
		promise = Promise.all(promises).then(() => requirements);
	}

	return promise;
}

export {
	requirements,
	loadRequirements
};
