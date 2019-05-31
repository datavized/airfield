import eventEmitter from 'event-emitter';
import allOff from 'event-emitter/all-off';

const ENABLE_WORKLET = true;

/*
optionally provide AudioContext constructor
*/
export default function MicrophoneRecorder(stream, contextOptions, ContextConstructor = window.AudioContext || window.webkitAudioContext) {

	const me = this;
	eventEmitter(this);

	/**
	 * The current state of recording process.
	 * @type {'inactive'|'recording'|'paused'}
	 */
	this.state = 'inactive';

	let context = null;
	let processor = null;
	let clone = null;
	let stopTime = 0;
	let lastDataTime = 0;
	let stopPromise = null;
	let sampleRate = NaN;

	function receiveBuffer(time, buffer) {
		lastDataTime = Math.max(time, lastDataTime);
		if (lastDataTime >= stopTime && stopPromise) {
			stopPromise.resolve();
			stopPromise = null;
		} else {
			me.emit('data', buffer);
		}
	}

	/*
	AudioWorkletNode requires a native context. Otherwise
	we can use whatever is provided (e.g. 'standardized-audio-context')
	*/
	const AudioContext = ENABLE_WORKLET && window.AudioWorkletNode ?
		window.AudioContext :
		ContextConstructor;


	/*
	Chrome ignores sample rate, so we have to read it back to find what it actually is
	https://bugs.chromium.org/p/chromium/issues/detail?id=432248&q=samplerate&colspec=ID%20Pri%20M%20Stars%20ReleaseBlock%20Component%20Status%20Owner%20Summary%20OS%20Modified
	*/
	context = new AudioContext(contextOptions);
	sampleRate = context.sampleRate;

	this.start = async () => {
		/*
		Create a clone of stream and start recording
		*/
		if (this.state !== 'inactive') {
			throw new Error('MicrophoneRecorder already started');
		}

		this.state = 'recording';

		stopTime = Infinity;
		lastDataTime = context.currentTime;
		clone = stream.clone();

		const input = context.createMediaStreamSource(clone);

		if (ENABLE_WORKLET && window.AudioWorkletNode) {
			const workletURL = require('!file-loader!./mic-recorder-worklet.js');
			await context.audioWorklet.addModule(workletURL);
			processor = new AudioWorkletNode(context, 'record-processor');
			processor.port.onmessage = event => {
				const { time, data } = event.data;
				receiveBuffer(time, data);
			};

		} else {
			processor = context.createScriptProcessor(2048, 1, 1);
			processor.onaudioprocess = e => {
				receiveBuffer(context.currentTime, e.inputBuffer.getChannelData(0));
			};
		}
		processor.channelCount = 1;
		input.connect(processor);
		processor.connect(context.destination);

		this.emit('start');
	};

	this.stop = () => {
		/**
		Stop stream and end cloned stream tracks
		*/
		if (this.state === 'inactive') {
			return stopPromise && stopPromise.promise || Promise.resolve();
		}

		this.state = 'inactive';
		stopTime = context.currentTime;
		clone.getTracks().forEach(track => track.stop());
		clone = null;

		let resolve = null;
		const promise = new Promise(res => {
			resolve = res;
		});
		stopPromise = {
			promise,
			resolve
		};
		promise.then(() => {
			if (processor) {
				processor.onaudioprocess = null;
				processor.disconnect();
				processor = null;
			}
			stopPromise = null;
		});
		return promise;
	};

	this.pause = () => {
		if (this.state === 'recording') {
			this.state = 'paused';
			this.emit('pause');
		}
	};

	this.resume = () => {
		if (this.state === 'paused') {
			this.state = 'recording';
			this.emit('resume');
		}
	};

	this.destroy = () => {
		const p = this.stop();

		allOff(this);

		return p.then(() => {
			if (context) {
				context.close();
				context = null;
			}
		});
	};

	Object.defineProperty(this, 'sampleRate', {
		get: () => sampleRate
	});
}
