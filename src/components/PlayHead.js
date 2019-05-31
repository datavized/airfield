import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'unistore/src/integrations/react';
import { actions } from '../store';

import withStyles from '@material-ui/core/styles/withStyles';

const styles = theme => ({
	playHead: {
		position: 'absolute',
		top: 0,
		left: 0,
		height: '100%',
		width: 1,
		backgroundColor: theme.palette.primary.main,
		pointerEvents: 'none',
		opacity: 0.5,
		'&:after': {
			width: 0,
			margin: 'auto',
			height: 0,
			content: '""',
			display: 'block',
			borderStyle: 'solid',
			borderWidth: '16px 5px 0 5px',
			borderColor: `${theme.palette.primary.main} transparent transparent transparent`,
			transform: 'translateX(-4.5px)'
		}
	}
});

const Def = ({classes, timeScale, leftVisibleTime, currentTime}) =>
	<div className={classes.playHead} style={{
		left: timeScale * (currentTime - leftVisibleTime)
	}}/>;

Def.propTypes = {
	classes: PropTypes.object.isRequired,
	timeScale: PropTypes.number,
	leftVisibleTime: PropTypes.number,
	currentTime: PropTypes.number
};

const PlayHead = [
	withStyles(styles),
	connect(['currentTime'], actions)
].reduceRight((prev, fn) => fn(prev), Def);

export default PlayHead;
