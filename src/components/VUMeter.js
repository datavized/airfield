import React from 'react';
import { connect } from 'unistore/react';
import liveEngine from '../engine/live';

import withStyles from '@material-ui/core/styles/withStyles';
import PropTypes from 'prop-types';

const styles = () => ({
	root: {
		position: 'relative',
		width: '100%',
		height: '100%',

		// hack, until I can figure out how to flip the gradient
		transform: 'scaleY(-1)'
	},
	meter: {
		width: '100%',
		position: 'absolute',
		left: 0,
		top: 0,

		// todo: add an option for vertical or horizontal

		'--value': 0,
		'--bgScale': 1,
		backgroundImage: 'linear-gradient(to top, red 1%, rgb(255, 255, 0) 16%, lime 45%, rgb(0, 136, 0) 100%)',
		backgroundSize: '100% var(--bgScale)',
		height: 'var(--value)'
	}
});

const MIN_DECIBELS = -50;
const MAX_DECIBELS = -0.5;
const DECIBELS_RANGE = MAX_DECIBELS - MIN_DECIBELS;
const SMOOTHING = 0.8;
const INV_SMOOTHING = 1 - SMOOTHING;

const Def = class VUMeter extends React.Component {
	static propTypes = {
		classes: PropTypes.object.isRequired,
		paused: PropTypes.bool,
		channel: PropTypes.number.isRequired,
		backgroundColor: PropTypes.string
	}

	static defaultProps = {
		channel: 0
	}

	frameId = 0
	analyser = null
	splitter = null
	parentElement = null
	meter = null
	previous = 0

	onRef = ref => {
		if (!ref) {
			return;
		}

		if (this.parentElement !== ref.parentElement) {
			this.parentElement = ref.parentElement;
			this.forceUpdate();
		}
		this.meter = ref.firstElementChild;
	}

	update = () => {
		const {
			analyser,
			sampleBuffer
		} = this;

		/*
		Best description I found for how to make a VU Meter from AnalyserNode
		https://stackoverflow.com/questions/44360301/web-audio-api-creating-a-peak-meter-with-analysernode
		*/

		analyser.getByteTimeDomainData(sampleBuffer);

		// Compute peak instantaneous power over the interval.
		let peakInstantaneousPower = 0;
		for (let i = 0; i < sampleBuffer.length; i++) {
			const val = (sampleBuffer[i] - 128) / 128;
			const power = val * val;
			peakInstantaneousPower = Math.max(power, peakInstantaneousPower);
		}
		const peakInstantaneousPowerDecibels = 10 * Math.log10(peakInstantaneousPower);

		/*
		Ideally, smoothing values would be stored in state, but
		React is weird with animations like this
		*/
		const peak = Math.max(0, Math.min(1, (peakInstantaneousPowerDecibels - MIN_DECIBELS) / DECIBELS_RANGE));
		const value = peak * INV_SMOOTHING + this.previous * SMOOTHING;
		this.previous = value;
		if (this.meter) {
			this.meter.style.setProperty('--value', value * 100 + '%');
			this.meter.style.setProperty('--bgScale', 100 / (value > 0 ? value : 1) + '%');
		}

		cancelAnimationFrame(this.frameId);
		this.frameId = requestAnimationFrame(this.update);
	}

	setChannel = () => {
		if (this.analyser) {
			this.analyser.disconnect();
		} else {
			this.analyser = liveEngine.context.createAnalyser();
		}
		this.splitter.connect(this.analyser, this.props.channel);
	}

	componentDidMount() {
		// todo: we'll need to adapt the number of channels in the splitter
		this.splitter = liveEngine.context.createChannelSplitter(2);
		liveEngine.main.connect(this.splitter);

		this.setChannel();
		this.sampleBuffer = new Uint8Array(this.analyser.frequencyBinCount);

		if (!this.props.paused) {
			this.update();
		}
	}

	componentDidUpdate() {
		cancelAnimationFrame(this.frameId);
		this.setChannel();
		this.update();
	}

	componentWillUnmount() {
		cancelAnimationFrame(this.frameId);
	}

	render() {
		const {
			classes
		} = this.props;

		let backgroundColor = this.props.backgroundColor || '';
		let parent = this.parentElement;
		while (parent && (!backgroundColor || backgroundColor === 'rgba(0, 0, 0, 0)')) {
			const parentStyle = window.getComputedStyle(parent);
			backgroundColor = parentStyle.getPropertyValue('background-color');
			parent = parent.parentElement;
		}

		return <div className={classes.root} ref={this.onRef} style={{
			backgroundColor
		}}>
			<div className={classes.meter}/>
		</div>;
	}
};

const VUMeter = withStyles(styles)(
	connect(['paused'])(Def)
);
// const VUMeter = Def;
export default VUMeter;