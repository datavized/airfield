import React from 'react';
import PropTypes from 'prop-types';
import withStyles from '@material-ui/core/styles/withStyles';
import Slider from '@material-ui/lab/Slider';

const styles = theme => ({
	primary: {
		backgroundColor: theme.palette.primary.main
	},
	secondary: {
		backgroundColor: theme.palette.secondary.main
	},
	inherit: {
		backgroundColor: 'inherit'
	}
});

const Def = ({color, classes, ...props}) => {
	if (color !== 'primary' && color !== 'secondary' && color !== 'inherit') {
		return <Slider classes={classes} {...props}/>;
	}

	const {
		primary,
		secondary,
		inherit,
		track,
		thumb,
		...optionClasses
	} = classes;
	const colorClass = {primary, secondary, inherit}[color];
	return <Slider {...props} classes={{
		...optionClasses,
		track: colorClass + (' ' + track || ''),
		thumb: colorClass + (' ' + thumb || '')
	}}/>;
};
Def.propTypes = {
	color: PropTypes.oneOf(['default', 'inherit', 'primary', 'secondary']),
	classes: PropTypes.object.isRequired
};

const ColorSlider = withStyles(styles)(Def);
export default ColorSlider;