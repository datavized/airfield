import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'unistore/src/integrations/react';
import { actions } from '../store';
import num from '../util/num';

/*
Theme/Style stuff
*/
import withStyles from '@material-ui/core/styles/withStyles';

/*
Material UI components
*/
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Slider from './ColorSlider';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import TimeField from './TimeField';

const styles = theme => ({
	container: {
		padding: theme.spacing.unit,
		boxSizing: 'border-box',
		overflow: 'auto',
		height: '100%'
	},
	formControlLine: {
		display: 'flex',
		margin: `${theme.spacing.unit}px 0`
	},
	formControlNumeric: {
		fontVariantNumeric: 'tabular-nums',
		margin: theme.spacing.unit,
		'& input': {
			textAlign: 'right'
		}
	},
	formControl: {
		margin: theme.spacing.unit,
		minWidth: 120
	},
	slider: {
		width: 300,
		maxWidth: '100%',
		display: 'inline-block',
		padding: [[22, 0]]
	}
});

const Def = class ClipEditForm extends React.Component {
	static propTypes = {
		classes: PropTypes.object.isRequired,
		clip: PropTypes.object,
		updateClip: PropTypes.func.isRequired
	}

	updateProperty = (propertyName, value) => {
		const clip = {
			...this.props.clip,
			[propertyName]: value
		};
		this.props.updateClip(clip);
	}

	handleChangeProperty = propertyName => event => {
		if (typeof event === 'number') {
			this.updateProperty(propertyName, event);
		} else {
			const { target } = event;
			const value = target.type === 'checkbox' ? target.checked : target.value;
			this.updateProperty(propertyName, value);
		}
	}

	handleChangeEndTime = event => {
		const endTime = typeof event === 'number' ? event : event.target.value;
		const {start} = this.props.clip;
		const duration = endTime - start;
		this.updateProperty('duration', duration);
	}

	handleChangeSlider = propertyName => (event, value) => {
		this.updateProperty(propertyName, value);
	}

	render() {
		const {
			classes,
			clip
		} = this.props;

		const {
			name,
			start,
			duration,
			offset,
			enabled,
			source,
			gain
		} = clip;

		/*
		todo:
		- allow switching file source?
		- show fixed source info
			- file name
			- duration
			- # channels
			- metadata?
		- select channel(s)
		- select stereo mode
		- validate values
			- if intersects with another clip on same track, move to new track?
		*/

		return <Paper className={classes.container}>
			<Typography>{source && source.fileName}</Typography>
			<TextField
				label="Name"
				className={classes.formControlLine}
				value={name}
				onChange={this.handleChangeProperty('name')}
			/>
			<FormControlLabel
				className={classes.formControlLine}
				control={
					<Checkbox
						checked={enabled !== false}
						onChange={this.handleChangeProperty('enabled')}
						color="secondary"
					/>
				}
				label="Enabled"
			/>
			<FormControl className={classes.formControl}>
				<InputLabel htmlFor="clip-volume" shrink={true}>Volume</InputLabel>
				<div className={classes.volumeControl}>
					<Slider
						color="secondary"
						className={classes.slider}
						min={0}
						max={1}
						id="clip-volume"
						step={0.000001}
						value={num(gain, 1)}
						onChange={this.handleChangeSlider('gain')}
					/>
				</div>
			</FormControl>
			<div>
				<TimeField
					label="Start Time"
					className={classes.formControlNumeric}
					value={start}
					min={0}
					onChange={this.handleChangeProperty('start')}
				/>
				<TimeField
					label="End Time"
					className={classes.formControlNumeric}
					value={start + duration}
					min={start}
					onChange={this.handleChangeEndTime}
				/>
			</div>
			<div>
				<TimeField
					label="In Point"
					className={classes.formControlNumeric}
					value={offset}
					min={0}
					max={source.duration}
					onChange={this.handleChangeProperty('offset')}
				/>
				<TimeField
					label="Duration"
					className={classes.formControlNumeric}
					value={duration}
					min={0}
					max={source.duration}
					onChange={this.handleChangeProperty('duration')}
				/>
			</div>
		</Paper>;
	}
};

const ClipEditForm = withStyles(styles)(
	connect([], actions)(Def)
);

export default ClipEditForm;