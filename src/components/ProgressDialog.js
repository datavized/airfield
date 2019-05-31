import React from 'react';
import PropTypes from 'prop-types';

import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import LinearProgress from '@material-ui/core/LinearProgress';

/*
todo: set appropriate dialog dimensions
account for screen size, breakpoints
*/
const Def = ({id, open, progress, indeterminate, title, children, ...dialogProps}) =>
	<Dialog
		id={id}
		aria-labelledby={id + '-title'}
		open={open !== false}
		keepMounted={true}
		disableBackdropClick={false}
		{...dialogProps}
	>
		<DialogTitle id={id + '-title'}>{title}</DialogTitle>
		<DialogContent>
			{children}
			<LinearProgress
				variant={indeterminate ? 'indeterminate' : 'determinate'}
				value={(progress || 0) * 100}
			/>
		</DialogContent>
	</Dialog>;

Def.propTypes = {
	id: PropTypes.string.isRequired,
	indeterminate: PropTypes.bool,
	open: PropTypes.bool,
	progress: PropTypes.number,
	title: PropTypes.string.isRequired,
	children: PropTypes.oneOfType([
		PropTypes.arrayOf(PropTypes.node),
		PropTypes.node,
		PropTypes.string
	])
};

Def.defaultProps = {
	id: 'dialog',
	title: 'Loading...'
};

const ProgressDialog = Def;
export default ProgressDialog;