import React from 'react'; // import classNames from 'classnames';
import PropTypes from 'prop-types';
import { connect } from 'unistore/react';
import { actions } from '../store';
import findClip from '../store/findClip';

/*
Theme/Style stuff
*/
import withStyles from '@material-ui/core/styles/withStyles';

/*
Material UI components
*/

import ClipEditForm from './ClipEditForm';
import Dialog from '@material-ui/core/Dialog';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
// import CloseIcon from '@material-ui/icons/Close';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import Slide from '@material-ui/core/Slide';

const styles = () => ({
	appBar: {
		position: 'relative'
	},
	flex: {
		flex: 1
	}
});

function Transition(props) {
	return <Slide direction="up" {...props} />;
}

const Def = class InspectClipDialog extends React.Component {
	static propTypes = {
		classes: PropTypes.object,
		project: PropTypes.object,
		onClose: PropTypes.func.isRequired,
		id: PropTypes.string.isRequired,
		blockPlayback: PropTypes.func.isRequired,
		releasePlayback: PropTypes.func.isRequired
	}

	playBlockClaim = Symbol()

	handleClose = () => {
		this.props.onClose();
	}

	componentDidMount() {
		this.props.blockPlayback(this.playBlockClaim);
	}

	componentWillUnmount() {
		this.props.releasePlayback(this.playBlockClaim);
	}

	render() {
		const {
			classes,
			project,
			id
		} = this.props;

		const clip = findClip(project, id) || null;

		if (!clip) {
			return null;
		}

		return <Dialog
			fullScreen
			open={true}
			onClose={this.handleClose}
			TransitionComponent={Transition}
		>
			<AppBar className={classes.appBar}>
				<Toolbar>
					<IconButton color="inherit" onClick={this.handleClose} aria-label="Close">
						<ArrowBackIcon />
					</IconButton>
					<Typography variant="h6" color="inherit" className={classes.flex}>
						Edit Clip - {clip.name}
					</Typography>
				</Toolbar>
			</AppBar>
			<ClipEditForm clip={clip}/>
		</Dialog>;
	}
};

const InspectClipDialog = withStyles(styles)(
	connect(['project'], actions)(Def)
);
// const InspectClipDialog = Def;
export default InspectClipDialog;