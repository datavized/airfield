import React from 'react';
import PropTypes from 'prop-types';
import VUMeter from './VUMeter';

import withStyles from '@material-ui/core/styles/withStyles';

const styles = theme => ({
	container: {
		display: 'flex',
		flexDirection: 'row',
		height: '100%'
	},
	meter: {
		flex: 1,
		margin: theme.spacing(0, 1)
	}
});
const Def = ({channels = 2, classes}) =>
	<div className={classes.container}>
		{Array.apply(null, Array(channels)).map((n, i) => <div key={i} className={classes.meter}><VUMeter channel={i}/></div>)}
	</div>;

Def.propTypes = {
	channels: PropTypes.number,
	classes: PropTypes.object.isRequired
};

const VUMeterCollection = withStyles(styles)(Def);
export default VUMeterCollection;