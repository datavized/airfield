/* global DEBUG */
import React from 'react';
import { connect } from 'unistore/react';
import { actions } from '../store';
// import logEvent from '../util/analytics';

import withStyles from '@material-ui/core/styles/withStyles';
import PropTypes from 'prop-types';

import Joyride, { ACTIONS, EVENTS } from 'react-joyride';

const tourStepDefaults = {
	disableBeacon: true
};

const recordTourSteps = navigator.mediaDevices ? [
	{
		title: 'Record audio',
		content: `Record an audio clip directly from your device's microphone.`,
		target: '[data-tour-id="record-audio"]',
		screen: 'library'
	}
] : [];

const tourSteps = [
	{
		title: 'Import an audio file',
		content: `Import an audio file from your file system. Click import button or drag and drop into audio library.`,
		target: '[data-tour-id="import-audio-file"]',
		screen: 'library'
	},

	...recordTourSteps,

	{
		title: 'Timeline',
		content: `Place audio clips in timeline. Click "Add Clip" button.`,
		// target: '#track-0',
		target: '[data-tour-id="timeline-root"]',
		screen: 'timeline'
	},

	{
		title: 'Play Audio',
		content: 'Click the Play button to hear your audio composition.',
		target: '#play-controls [data-tour-id="play-button"]',
		screen: 'timeline'
	},

	{
		title: 'Spatialize',
		content: 'Enter "Spatialize" view to place your audio tracks in space around the listener.',
		target: '[data-tour-id="spatialize-mode"]',
		screen: 'timeline'
	},

	{
		title: 'Spatialize',
		content: 'If you have single-channel tracks, drag them around to spatialize.',
		target: '[data-tour-id="spatialize-canvas"]',
		screen: 'spatialize'
	},

	{
		title: 'Export Audio',
		content: 'Export your project to an audio file in MP3 or Waveform (PCM) format.',
		target: '[data-tour-id="export-audio"]',
		screen: 'timeline'
	}

].map(step => ({
	...tourStepDefaults,
	...step
}));
const lastStepIndex = tourSteps.length - 1;

const observerConfig = {
	childList: true,
	subtree: true
};

const tipLocale = {
	last: 'Got it!'
};

const styles = () => ({
});

const Def = class Tour extends React.Component {
	static propTypes = {
		// classes: PropTypes.object,
		theme: PropTypes.object.isRequired,
		setConfig: PropTypes.func.isRequired,
		config: PropTypes.object.isRequired,
		run: PropTypes.bool
	}

	state = {
		stepIndex: 0,
		run: true
	}

	observer = null

	joyride = null

	handleJoyrideCallback = tour => {
		const { action, index, type } = tour;

		if (type === EVENTS.TOUR_END || action === EVENTS.TOOLTIP_CLOSE || type === EVENTS.STEP_AFTER && index >= lastStepIndex) {

			// logEvent('tour', index >= lastStepIndex ? 'complete' : 'skip', index);

			// Update user preferences with completed tour flag
			this.setState({
				stepIndex: 0,
				run: false
			});
			this.props.setConfig({
				showTour: false
			});
		} else if (type === EVENTS.STEP_AFTER) {
			// Since this is a controlled tour you'll need to update the state to advance the tour
			const stepIndex = index + (action === ACTIONS.PREV ? -1 : 1);
			this.setState({
				stepIndex
			});

			// const step = tourSteps[stepIndex];
			// const activeScreen = step && step.screen;
			// if (activeScreen) {
			// 	this.props.setConfig({
			// 		activeScreen
			// 	});
			// }
		}
	}

	joyrideRef = ref => {
		this.joyride = ref;
	}

	/*
	Some targets may not be loaded when this component is first rendered.
	So we force an update whenever the document changes to force Joyride
	to re-scan for target elements.
	todo: this can be made more efficient by checking for changes
	*/
	redraw = () => {
		if (this.joyride) {
			this.joyride.forceUpdate();
		}
	}

	setActiveScreen = () => {
		const step = tourSteps[this.state.stepIndex];
		const activeScreen = step && step.screen;
		if (activeScreen) {
			this.props.setConfig({
				activeScreen
			});
		}
	}

	componentDidMount() {
		// todo: disconnect if disabled
		// todo: narrow the scope if we can
		this.observer = new MutationObserver(this.redraw);
		this.observer.observe(document.body, observerConfig);
		if (this.props.run) {
			this.setActiveScreen();
		}
	}

	componentDidUpdate(prevProps, prevState) {
		if (prevProps.config.showTour !== this.props.config.showTour && this.props.config.showTour) {
			// automatically rewind
			this.setState({
				stepIndex: 0
			});
		}

		if (this.props.run && (prevProps.run !== this.props.run || prevState.stepIndex !== this.state.stepIndex)) {
			this.setActiveScreen();
		}
	}

	componentWillUnmount() {
		if (this.observer) {
			this.observer.disconnect();
			this.observer = null;
		}
	}

	render() {
		const {
			theme
		} = this.props;

		const run = this.props.run !== false && this.state.run;

		const { stepIndex } = this.state;

		const tipStyles = {
			options: {
				primaryColor: theme.palette.primary.main,
				textColor: theme.palette.text.primary,
				arrowColor: theme.palette.background.paper,
				backgroundColor: theme.palette.background.paper,
				overlayColor: 'rgba(0, 0, 0, 0.5)',
				zIndex: 9000 // need to be in front of dialogs
			},
			tooltip: {
				padding: theme.spacing.unit * 2.5
			},
			tooltipContainer: {
				textAlign: 'left'
			},
			tooltipContent: {
				padding: `${theme.spacing.unit}px 0`
			},
			buttonClose: {
				padding: theme.spacing.unit * 2.5
			},
			buttonSkip: {
				paddingLeft: 0
			}
		};

		return <Joyride
			showSkipButton
			continuous
			disableScrollParentFix
			debug={DEBUG}
			run={run}
			steps={tourSteps}
			stepIndex={stepIndex}
			callback={this.handleJoyrideCallback}
			styles={tipStyles}
			locale={tipLocale}
			floaterProps={{
				disableAnimation: true
			}}
			ref={this.joyrideRef}
		/>;
	}
};

const Tour = withStyles(styles, { withTheme: true })(
	connect(['config'], actions)(Def)
);
export default Tour;