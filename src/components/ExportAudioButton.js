import React from 'react';
import { connect } from 'unistore/react';
import { actions } from '../store';

import withStyles from '@material-ui/core/styles/withStyles';
import PropTypes from 'prop-types';

import asyncComponent from './hoc/asyncComponent';
const ExportAudioDialog = asyncComponent(() => import('./ExportAudioDialog'), {
	defer: true
});
// import ExportAudioDialog from './ExportAudioDialog';

import Button from '@material-ui/core/Button';
import SaveIcon from '@material-ui/icons/Save';
import Snackbar from '@material-ui/core/Snackbar';

const styles = theme => ({
	button: {
		margin: theme.spacing.unit * 2
	},
	leftIcon: {
		marginRight: theme.spacing.unit
	}
});

const Def = class ExportAudioButton extends React.Component {
	static propTypes = {
		className: PropTypes.string,
		classes: PropTypes.object,
		project: PropTypes.object,
		loading: PropTypes.bool,
		disabled: PropTypes.bool
	}

	state = {
		open: false,
		successMessage: '',
		successLink: ''
	}

	exportAudio = () => {
		this.setState({
			open: true
		});
	}

	onDismiss = () => {
		this.setState({
			successMessage: '',
			successLink: ''
		});
	}

	onClose = state => {
		this.setState({
			...state,
			open: false
		});
	}

	render() {
		const {
			classes,
			disabled,
			loading,
			project
		} = this.props;

		const {
			successMessage,
			successLink,
			open
		} = this.state;

		const duration = project && project.duration || 0;

		let snackbar = null;
		if (successMessage) {
			const action = successLink ?
				<Button
					color="secondary"
					size="small"
					href={successLink}
					target="_blank"
					rel="noopener noreferrer"
				>
					Open
				</Button> :
				null;

			snackbar = <Snackbar
				anchorOrigin={{
					vertical: 'bottom',
					horizontal: 'center'
				}}
				open={true}
				autoHideDuration={4000}
				onClose={this.onDismiss}
				ContentProps={{
					'aria-describedby': 'file-export-success-message'
				}}
				message={<span id="file-export-success-message">{successMessage}</span>}
				action={action}
			/>;
		}
		return <React.Fragment>
			<Button
				disabled={disabled || loading || !duration}
				variant="contained"
				color="secondary"
				onClick={this.exportAudio}
				className={classes.button}
				data-tour-id="export-audio"
			>
				<SaveIcon className={classes.leftIcon} />
				Export
			</Button>
			{open && <ExportAudioDialog open={true} onClose={this.onClose}/>}
			{snackbar}
		</React.Fragment>;
	}
};

const ExportAudioButton = withStyles(styles)(
	connect([
		'loading',
		'disabled',
		'project'
	], actions)(Def)
);
// const ExportAudio = Def;
export default ExportAudioButton;