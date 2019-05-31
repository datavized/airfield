import React from 'react';
import PropTypes from 'prop-types';

import formatTime from '../util/formatTime';

/*
Theme/Style stuff
*/
import withStyles from '@material-ui/core/styles/withStyles';

/*
Time scale logic inspired by Audacity
https://github.com/audacity/audacity/blob/303553ae4e39129912c28ed91ae064ade4f3e044/src/widgets/Ruler.cpp
*/
const PIXELS_PER_NOTCH = 22;
const timeScales = [
	{
		units: 1, // 1 second
		factor: 5
	},
	{
		units: 5,
		factor: 3
	},
	{
		units: 10,
		factor: 3
	},
	{
		units: 15,
		factor: 4
	},
	{
		units: 30,
		factor: 2
	},
	{
		units: 60, // 1 minute
		factor: 5
	},
	{
		units: 300,
		factor: 3
	},
	{
		units: 600,
		factor: 3
	},
	{
		units: 900,
		factor: 4
	},
	{
		units: 1800,
		factor: 2
	},
	{
		units: 3600, // 1 hour
		factor: 6
	},
	{
		units: 21600, // 6 hours
		factor: 4
	},
	{
		units: 86400, // 1 day
		factor: 7
	}
];

const MAX_TIME_SCALE = { // 1 week
	units: 24 * 7 * 3600,
	factor: 1
};

function getTimeScale(secondsPerPixel) {
	const units = secondsPerPixel * PIXELS_PER_NOTCH;
	if (units <= 0.5) {
		let d = 0.000001;

		// digits is number of digits after the decimal point.
		for (let digits = 6; digits >= -10; digits--) {
			if (units < d) {
				return {
					units: d,
					factor: 5
				};
			}

			d *= 5;

			if (units < d) {
				return {
					units: d,
					factor: 2
				};
			}

			d *= 2;
		}

		return {
			units: d,
			factor: 2
		};
	}

	return timeScales.find(ts => units < ts.units) || MAX_TIME_SCALE;
}

const styles = () => ({
	container: {
		overflow: 'hidden',
		height: 32,
		userSelect: 'none',
		'-webkit-tap-highlight-color': 'transparent'
	},
	canvas: {
		display: 'block'
	}
});

const Def = class TimelineCanvas extends React.Component {
	static propTypes = {
		classes: PropTypes.object.isRequired,
		startTime: PropTypes.number.isRequired,
		timeScale: PropTypes.number.isRequired,
		className: PropTypes.string,
		style: PropTypes.object
	}

	static defaultProps = {
		timeScale: 1,
		startTime: 0
	}

	state = {
		width: 0,
		height: 0,
		devicePixelRatio: window.devicePixelRatio
	}

	canvas = null
	ctx = null
	view = null

	onCanvasRef = canvas => {
		this.canvas = canvas;
		this.ctx = canvas && canvas.getContext('2d', { alpha: false });
	}

	onViewRef = ref => {
		this.view = ref;
		this.resize();
	}

	draw = () => {
		const {
			width,
			height,
			devicePixelRatio
		} = this.state;

		const {
			startTime,
			timeScale
		} = this.props;

		const ctx = this.ctx;
		if (!ctx) {
			return;
		}

		// background. todo: configure color
		ctx.fillStyle = '#555';
		ctx.fillRect(0, 0, width, height);

		// notches. todo: configure color
		ctx.strokeStyle = '#888';
		ctx.lineWidth = devicePixelRatio;
		ctx.beginPath();

		// todo: get all colors and font style from theme
		ctx.font = `${devicePixelRatio * 10}px Roboto`;
		ctx.fillStyle = '#888';
		ctx.textAlign = 'center';

		const timePixelScale = timeScale * devicePixelRatio; // pixels per second
		const secondsPerPixel = 1 / timeScale;
		const top = 18 * devicePixelRatio;
		const bottom = 26 * devicePixelRatio;
		const textBottom = 13 * devicePixelRatio;

		const {
			units: minorNotchUnit,
			factor
		} = getTimeScale(secondsPerPixel);

		const majorNotchUnit = minorNotchUnit * factor;
		const secondsPrecision = majorNotchUnit > 0.5 ? 1 : majorNotchUnit;

		const maxTime = startTime + width / devicePixelRatio / timeScale;
		for (let t = Math.floor(startTime * minorNotchUnit) / minorNotchUnit, i = 0; t <= maxTime; t += minorNotchUnit, i++) {
			if (t > 0) {
				// account for floating point weirdness
				const isMajor = minorNotchUnit <= 1 ?
					Math.round(t / minorNotchUnit) % factor === 0 :
					t % majorNotchUnit === 0;

				const x = (t - startTime) * timePixelScale;
				ctx.moveTo(x, top);
				ctx.lineTo(x, bottom);
				ctx.stroke();

				if (isMajor) {
					ctx.fillText(formatTime(t, 1, secondsPrecision), x, textBottom);
				}
			}
		}
	}

	// Make sure we get a sharp canvas on Retina displays
	// as well as adjust the canvas on zoomed browsers
	resize = () => {
		const view = this.view;
		if (!view) {
			return;
		}

		const devicePixelRatio = window.devicePixelRatio || 1;
		const width = Math.round(view.clientWidth * devicePixelRatio);
		const height = Math.round(view.clientHeight * devicePixelRatio);
		if (this.state.width !== width || this.state.height !== height || this.state.devicePixelRatio !== devicePixelRatio) {
			this.setState({ width, height, devicePixelRatio }, this.draw);
		}
	}

	componentDidMount() {
		window.addEventListener('resize', this.resize);
	}

	componentDidUpdate() {
		this.resize();
		this.draw();
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.resize);
		// cancelAnimationFrame(this.frameId);
		// clearTimeout(this.timeout);
	}

	render() {
		const {
			width,
			height,
			devicePixelRatio
		} = this.state;

		const { classes } = this.props;

		// The way canvas interacts with CSS layouting is a bit buggy
		// and inconsistent across browsers. To make it dependent on
		// the layout of the parent container, we only render it after
		// mounting, after CSS layouting is done.
		const canvas = this.state ?
			<canvas
				ref={this.onCanvasRef}
				width={width}
				height={height}
				className={classes.canvas}
				style={{
					width: width / devicePixelRatio,
					height: height / devicePixelRatio
				}} /> :
			null;

		return <div
			ref={this.onViewRef}
			className={classes.container + ' ' + (this.props.className || '')}
			style={{
				// display: 'contents',
				...this.props.style
			}}>
			{canvas}
		</div>;
	}
};

const TimelineCanvas = withStyles(styles)(Def);

export default TimelineCanvas;