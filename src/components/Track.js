import React from 'react';
import PropTypes from 'prop-types';
// import { connect } from 'unistore/react';
import { connect } from 'unistore/src/integrations/react';
import { actions } from '../store';

/*
Theme/Style stuff
*/
import withStyles from '@material-ui/core/styles/withStyles';

/*
Material UI components
*/
import Typography from '@material-ui/core/Typography';

const styles = theme => ({
	container: {
		position: 'relative',
		height: 64, // todo: set as constant somewhere
		borderBottom: `1px solid ${theme.palette.divider}`
	},
	clip: {
		position: 'absolute',
		// border: `1px solid pink`,
		borderRadius: 4,
		backgroundColor: 'darkgray',
		height: '100%',
		top: 0,
		minWidth: 8,
		padding: theme.spacing.unit,
		boxSizing: 'border-box',
		cursor: 'grab'
	},
	clipName: {
		overflow: 'hidden',
		textOverflow: 'ellipsis'
	}
});

const Def = class Track extends React.Component {
	static propTypes = {
		classes: PropTypes.object.isRequired,
		track: PropTypes.object,
		index: PropTypes.number.isRequired,
		timeScale: PropTypes.number.isRequired
	}

	state = {
	}

	render() {
		const {
			classes,
			track,
			index,
			timeScale
		} = this.props;

		const name = track.name || 'Track ' + (index + 1);

		// todo: Clip as component?

		return <div className={classes.container}>
			<div>
				<span>{name}</span>
			</div>
			{track.clips.map(({id, start, duration, name, fileName}) =>
				<div
					key={id}
					className={classes.clip}
					style={{
						left: start * timeScale,
						width: duration * timeScale
					}}
				>
					<Typography className={classes.clipName}>{name || fileName}</Typography>
				</div>)}
		</div>;
	}
};

const Track = withStyles(styles)(
	connect([], actions)(Def)
);

export default Track;