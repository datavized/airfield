export default function throttle(func, wait) {
	let ctx = null;
	let args = null;
	let rtn;
	let timeoutID = 0;
	let last = 0;

	function call() {
		clearTimeout(timeoutID);
		last = Date.now();
		rtn = func.apply(ctx, args);
		ctx = null;
		args = null;
	}

	return function () {
		ctx = this; // eslint-disable-line no-invalid-this
		args = arguments;

		clearTimeout(timeoutID);

		const delta = Date.now() - last;
		if (delta >= wait) {
			call();
		} else {
			timeoutID = setTimeout(call, wait - delta);
		}
		return rtn;
	};

}
