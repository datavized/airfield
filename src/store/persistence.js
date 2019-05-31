/* global DEBUG */

// https://developer.mozilla.org/en-US/docs/Web/API/Storage_Access_API

export const PERSISTENCE_SUPPORTED = !!(navigator.storage && navigator.storage.persist);
export const QUOTA_SUPPORTED = !!(navigator.storage && navigator.storage.estimate);

export function persisted() {
	if (PERSISTENCE_SUPPORTED) {
		return navigator.storage.persisted();
	}

	return Promise.resolve(false);
}

export function persist() {
	if (PERSISTENCE_SUPPORTED) {
		if (DEBUG) {
			console.log('Requesting persistent storage');
		}
		return navigator.storage.persist();
	}

	return Promise.resolve(false);
}

export function estimate() {
	if (PERSISTENCE_SUPPORTED) {
		return navigator.storage.estimate();
	}

	return Promise.resolve(false);
}
