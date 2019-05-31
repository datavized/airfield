import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'unistore/react';
import { actions } from '../store';
import formatTime from '../util/formatTime';

/*
Material UI components
*/
import withStyles from '@material-ui/core/styles/withStyles';
import Slider from '@material-ui/lab/Slider';
import Typography from '@material-ui/core/Typography';
import Play from '@material-ui/icons/PlayArrow';
import Pause from '@material-ui/icons/Pause';
import Fab from '@material-ui/core/Fab';
import IconButton from './IconButton';
import CircularProgress from '@material-ui/core/CircularProgress';
import SkipPrevious from '@material-ui/icons/SkipPrevious';

import ExportAudioButton from './ExportAudioButton';

const styles = theme => ({
	root: {
		display: 'flex',
		alignItems: 'center',
		position: 'relative',
		padding: 0
	},
	offscreen: {
		position: 'absolute',
		left: '-101vw',
		top: 0,
		width: 1,
		height: 1,
		overflow: 'hidden',
		border: 0
	},
	playPauseButton: {
		margin: theme.spacing.unit
	},
	main: {
		flex: 1,
		display: 'flex',
		flexDirection: 'column'
	},
	progress: {
		position: 'absolute',
		left: 0,
		right: 0,
		top: -14
	},
	progressSlider: {
		padding: [[14, 0]]
	},
	additional: {
		display: 'flex',
		alignItems: 'center'
	},
	meta: {
		flex: 1
	},
	loading: {
		color: theme.palette.grey[500]
	},
	time: {
		marginRight: theme.spacing.unit * 3
	}
});

const controlElementTypes = [HTMLInputElement, HTMLButtonElement];

const Def = class PlayControls extends React.Component {
	static propTypes = {
		classes: PropTypes.object.isRequired,
		children: PropTypes.oneOfType([
			PropTypes.arrayOf(PropTypes.node),
			PropTypes.node
		]),
		disabled: PropTypes.bool,
		loading: PropTypes.bool,
		canPlay: PropTypes.bool,
		paused: PropTypes.bool,
		pause: PropTypes.func.isRequired,
		play: PropTypes.func.isRequired,
		setCurrentTime: PropTypes.func.isRequired,
		project: PropTypes.object,
		currentTime: PropTypes.number
	}

	rewindBeginning = () => {
		this.props.setCurrentTime(0);
	}

	keyPress = evt => {
		if (evt.keyCode === 32 && !controlElementTypes.find(E => evt.target instanceof E)) {
			const { pause, play, paused } = this.props;
			if (paused) {
				play();
			} else {
				pause();
			}
		}
	}

	onChangeSlider = (evt, value) => {
		this.props.setCurrentTime(value);
	}

	componentDidMount() {
		document.addEventListener('keypress', this.keyPress, false);
	}

	componentWillUnmount() {
		document.removeEventListener('keypress', this.keyPress, false);
	}

	render() {
		const {
			classes,
			children,
			disabled,
			loading,
			canPlay,
			paused,
			pause,
			play,
			project,
			currentTime
		} = this.props;

		const duration = project && project.duration || 0;
		const roundedDuration = Math.round(duration);
		const minTimeUnits = roundedDuration < 3600 ? 2 : 3;

		return <div className={classes.root} id="play-controls">
			{/* todo: add this back in to the h2:  aria-describedby="currently-playing-title"*/}
			<h2 id="player-a11y-header" className={classes.offscreen}>Player controls</h2>
			<div className={classes.progress}>
				<Slider
					className={classes.progressSlider}
					min={0}
					max={duration || 1}
					step={0.000001}
					value={currentTime}
					onChange={this.onChangeSlider}
					disabled={disabled}
				/>
			</div>
			<div className={classes.playPauseButton} data-tour-id="play-button">
				{ !loading || canPlay ?
					paused || disabled ?
						<IconButton
							component={Fab}
							color="primary"
							disabled={disabled || !canPlay}
							label="Play"
							onClick={play}
						>
							<Play />
						</IconButton> :
						<IconButton
							component={Fab}
							color="primary"
							label="Pause"
							onClick={pause}
						>
							<Pause />
						</IconButton> :
					<CircularProgress size={56}  classes={{colorPrimary: classes.loading}}/>
				}
			</div>
			<div className={classes.main}>
				<div className={classes.additional}>
					<IconButton disabled={disabled} label="Rewind" className={classes.button} onClick={this.rewindBeginning}>
						<SkipPrevious />
					</IconButton>
					<Typography className={classes.time}>{duration ? formatTime(currentTime, minTimeUnits) : '-'} / {duration ? formatTime(duration, minTimeUnits) : '-'}</Typography>
				</div>
			</div>
			<ExportAudioButton/>
			{children}
		</div>;
	}
};

const PlayControls = withStyles(styles)(
	connect(['currentTime', 'project', 'paused', 'canPlay'], actions)(Def)
);
export default PlayControls;
