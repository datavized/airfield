/* global APP_TITLE */
import React from 'react';

import withStyles from '@material-ui/core/styles/withStyles';
import PropTypes from 'prop-types';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
// import DialogTitle from '@material-ui/core/DialogTitle';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';

import appLogo from '../images/airfield-logo.svg';

const styles = theme => ({
	dialog: {
		minWidth: '50%',
		maxWidth: '90%',
		minHeight: '40%',
		maxHeight: '90%',

		display: 'flex',
		flexDirection: 'row',
		'& > *': {
			width: '50%'
		}
	},
	dialogContent: {
		display: 'flex',
		flexDirection: 'column',
		padding: 32
	},
	'@media (max-width: 445px)': {
		dialog: {
			flexDirection: 'column',
			'& > *': {
				width: 'auto'
			}
		},
		dialogContent: {
			paddingTop: 0
		}
	},
	title: {
		flex: 1,
		'& > *': {
			margin: `${theme.spacing.unit * 2}px 0`
		}
	},
	logo: {
		margin: theme.spacing.unit * 4,
		alignSelf: 'center',
		textAlign: 'center',
		'& img': {
			width: 300,
			maxWidth: '100%',
			maxHeight: '100%'
		}
	},
	dialogActions: {
		justifyContent: 'center'
	}
});

const Def = class WelcomeDialog extends React.Component {

	static propTypes = {
		classes: PropTypes.object.isRequired,
		open: PropTypes.bool.isRequired,
		onClose: PropTypes.func.isRequired
	}

	static defaultProps = {
		open: true
	}

	state = {
	}

	render() {
		const {
			classes,
			open,
			onClose
		} = this.props;

		return <Dialog
			id="welcome-dialog"
			aria-labelledby="welcome-dialog-title"
			open={open}
			keepMounted={false}
			disableBackdropClick={true}
			hideBackdrop={true}
			classes={{
				paper: classes.dialog
			}}
		>
			<div className={classes.logo}>
				<img src={appLogo} alt={`${APP_TITLE} logo`} />
			</div>
			<DialogContent className={classes.dialogContent}>
				<div className={classes.title}>
					<Typography id="welcome-dialog-title" variant="h6">Welcome to {APP_TITLE}</Typography>
					<Typography variant="subtitle1">The Interdimensional Audio Editor</Typography>
				</div>
				<DialogActions className={classes.dialogActions}>
					<Button onClick={onClose} variant="contained" color="primary">Get Started</Button>
				</DialogActions>
			</DialogContent>
		</Dialog>;
	}
};

const WelcomeDialog = withStyles(styles)(Def);
export default WelcomeDialog;