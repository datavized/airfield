/* global currentTime */
const W = class RecordBypassProcessor extends AudioWorkletProcessor {

	process(inputs) {
		/*
		Don't process anything. Not even passthrough.
		Just transfer the data back home.
		*/
		const monoArray = inputs[0][0];
		this.port.postMessage({
			time: currentTime,
			data: monoArray
		}, [monoArray.buffer]);

		return true;
	}
};

registerProcessor('record-processor', W);
