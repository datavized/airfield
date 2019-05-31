import React from 'react'; // import classNames from 'classnames';
import { confirmable } from 'react-confirm';

/*
Material UI components
*/
import PropTypes from 'prop-types';
// import withStyles from '@material-ui/core/styles/withStyles';
import Theme from './Theme';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import Button from '@material-ui/core/Button';

// const styles = () => ({
// 	root: {
// 	}
// });

const Def = class ConfirmationDialog extends React.Component {
	static propTypes = {
		show: PropTypes.bool, // from confirmable. indicates if the dialog is shown or not.
		proceed: PropTypes.func, // from confirmable. call to close the dialog with promise resolved.
		cancel: PropTypes.func, // from confirmable. call to close the dialog with promise rejected.
		dismiss: PropTypes.func, // from confirmable. call to only close the dialog.
		confirmation: PropTypes.oneOfType([ // arguments of your confirm function
			PropTypes.string,
			PropTypes.node
		]).isRequired,
		options: PropTypes.object, // arguments of your confirm function

		classes: PropTypes.object
	}

	render() {
		const {
			classes,
			show,
			proceed,
			// dismiss,
			cancel,
			confirmation,
			options
		} = this.props;

		const yes = options && options.yes || 'Yes';
		const no = options && options.no || 'No';

		return <Theme><Dialog
			classes={classes}
			open={show}
			onClose={cancel}
			aria-labelledby="alert-dialog-title"
			aria-describedby="alert-dialog-description"
		>
			{/*<DialogTitle id="alert-dialog-title">{"Use Google's location service?"}</DialogTitle>*/}
			<DialogContent>
				{ typeof confirmation === 'string' ?
					<DialogContentText id="alert-dialog-description">
						{confirmation}
					</DialogContentText> :
					<div id="alert-dialog-description">{confirmation}</div>
				}
			</DialogContent>
			<DialogActions>
				<Button onClick={cancel} color="secondary">
					{no}
				</Button>
				<Button onClick={proceed} color="secondary" autoFocus>
					{yes}
				</Button>
			</DialogActions>
		</Dialog></Theme>;
	}
};

const ConfirmationDialog = confirmable(Def);
export default ConfirmationDialog;