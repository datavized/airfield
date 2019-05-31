/*
Replacing fast-deep-equal, since it doesn't support Sets and Maps

Be careful here because this will loop forever if objects
have circular references

https://github.com/epoberezkin/fast-deep-equal/issues/26
*/

const isArray = Array.isArray;
const keyList = Object.keys;
const hasProp = Object.prototype.hasOwnProperty;

module.exports = function equal(a, b) {
	if (a === b) {
		return true;
	}

	if (a && b && typeof a === 'object' && typeof b === 'object') {
		const arrA = isArray(a);
		const arrB = isArray(b);

		if (arrA && arrB) {
			const length = a.length;
			if (length !== b.length) {
				return false;
			}
			for (let i = length - 1; i >= 0; i--) {
				if (!equal(a[i], b[i])) {
					return false;
				}
			}
			return true;
		}

		if (arrA !== arrB) {
			return false;
		}

		const dateA = a instanceof Date;
		const dateB = b instanceof Date;
		if (dateA !== dateB) {
			return false;
		}
		if (dateA && dateB) {
			return a.getTime() === b.getTime();
		}

		const regexpA = a instanceof RegExp;
		const regexpB = b instanceof RegExp;
		if (regexpA !== regexpB) {
			return false;
		}
		if (regexpA && regexpB) {
			return a.toString() === b.toString();
		}

		const mapA = a instanceof Map;
		const mapB = b instanceof Map;
		if (mapA !== mapB) {
			return false;
		}
		if (mapA && mapB) {
			if (a.size !== b.size) {
				return false;
			}
			for (const [key, val] of a) {
				const bValue = b.get(key);
				if (!equal(val, bValue)) {
					return false;
				}
			}
		}

		const setA = a instanceof Set;
		const setB = b instanceof Set;
		if (setA !== setB) {
			return false;
		}
		if (setA && setB) {
			if (a.size !== b.size) {
				return false;
			}
			for (const value of a) {
				if (!b.has(value)) {
					return false;
				}
			}
		}

		const keys = keyList(a);
		const length = keys.length;

		if (length !== keyList(b).length) {
			return false;
		}

		for (let i = length - 1; i >= 0; i--) {
			if (!hasProp.call(b, keys[i])) {
				return false;
			}
		}

		for (let i = length - 1; i >= 0; i--) {
			const key = keys[i];
			if (!equal(a[key], b[key])) {
				return false;
			}
		}

		return true;
	}

	return a !== a && b !== b;
};
