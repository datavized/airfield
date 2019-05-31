import React from 'react';
import PropTypes from 'prop-types';
import withStyles from '@material-ui/core/styles/withStyles';
import classNames from 'classnames';

import Slider from '@material-ui/lab/Slider';
import IconButton from './IconButton';
import ZoomOut from '@material-ui/icons/ZoomOut';
import ZoomIn from '@material-ui/icons/ZoomIn';

const styles = () => ({
	root: {
		display: 'flex',
		flexDirection: 'row'
	},
	slider: {
		flex: 1,
		padding: [[22, 0]]
	}
});

const nop = () => {};

const Def = ({classes, className, min, max, increment, value, ...props}) => {
	const onChange = props.onChange || nop;
	const step = props.step === undefined ?
		increment || (min - max) / 20 :
		props.step;
	return <div className={classNames(classes.root, className)}>
		<IconButton
			onClick={evt => onChange(evt, Math.max(min, value - increment))}
			disabled={value <= min}
			label="Zoom Out"
		>
			<ZoomOut/>
		</IconButton>
		<Slider
			{...props}
			step={step}
			min={min}
			max={max}
			value={value}
			onChange={onChange}
			className={classes.slider}
		/>
		<IconButton
			onClick={evt => onChange(evt, Math.max(min, value + increment))}
			disabled={value >= max}
			label="Zoom In"
		>
			<ZoomIn/>
		</IconButton>
	</div>;
};

Def.propTypes = {
	classes: PropTypes.object.isRequired,
	className: PropTypes.string,
	min: PropTypes.number.isRequired,
	max: PropTypes.number.isRequired,
	step: PropTypes.number,
	increment: PropTypes.number,
	value: PropTypes.number.isRequired,
	onChange: PropTypes.func
};

Def.defaultProps = {
	min: 0,
	max: 100
};

const ZoomSlider = withStyles(styles)(Def);
export default ZoomSlider;