import React from 'react';
import ReactDOM from 'react-dom';

import withStyles from '@material-ui/core/styles/withStyles';
import PropTypes from 'prop-types';

import Paper from '@material-ui/core/Paper';
import Popper from '@material-ui/core/Popper';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';

import IconButton from './IconButton';

const styles = theme => ({
	button: {
		color: theme.palette.primary.main
	},
	// icon: {
	// },
	popper: {
		zIndex: 10000,
		'& $arrow': {
			bottom: 0,
			left: 0,
			marginBottom: '-0.9em',
			width: '3em',
			height: '1em',
			'&::before': {
				borderWidth: '1em 1em 0 1em',
				borderColor: `${theme.palette.background.paper} transparent transparent transparent`
			}
		}
	},
	arrow: {
		position: 'absolute',
		fontSize: 7,
		width: '3em',
		height: '3em',
		'&::before': {
			content: '""',
			margin: 'auto',
			display: 'block',
			width: 0,
			height: 0,
			borderStyle: 'solid'
		}
	},
	paper: {
		maxWidth: 400
		// overflow: 'auto'//,
		// padding: theme.spacing(1),
		// fontSize: '0.8em'
	}
});

const Def = class PopperControl extends React.Component {
	static propTypes = {
		className: PropTypes.string,
		classes: PropTypes.object,
		disabled: PropTypes.bool,
		placement: PropTypes.string,
		icon: PropTypes.oneOfType([
			PropTypes.func,
			PropTypes.node
		]),
		children: PropTypes.oneOfType([
			PropTypes.arrayOf(PropTypes.node),
			PropTypes.node
		])
	}

	state = {
		open: false,
		anchorEl: null,
		arrowRef: null
	}

	anchorEl = null
	popper = null

	anchorRef = anchorEl => {
		this.anchorEl = anchorEl;
	}

	popperRef = popper => {
		this.popper = popper;
	}

	handleArrowRef = arrowRef => {
		this.setState({
			arrowRef
		});
	}

	onClick = () => {
		this.setState(state => ({
			open: !state.open
		}));
	}

	onClose = ({target}) => {
		// eslint-disable-next-line react/no-find-dom-node
		const popperEl = this.popper && ReactDOM.findDOMNode(this.popper);
		if (!target || !popperEl || !popperEl.contains(target)) {
			this.setState({
				open: false
			});
		}
	}

	render() {
		const {
			classes,
			children,
			placement,
			disabled,
			...iconButtonProps
		} = this.props;

		const {
			open,
			arrowRef
		} = this.state;

		const Icon = this.props.icon;
		const icon = typeof Icon === 'function' ?
			<Icon className={classes.icon} ref={this.anchorRef}/> :
			<span className={classes.icon} ref={this.anchorRef}>{this.props.icon}</span>;

		return <ClickAwayListener onClickAway={this.onClose} mouseEvent="onClick">
			<span ref={this.anchorRef}>
				<IconButton
					className={classes.button}
					disabled={disabled}
					{...iconButtonProps}
					onClick={this.onClick}
				>
					{icon}
				</IconButton>
				<Popper
					placement={placement || 'top'}
					className={classes.popper}
					disablePortal={false}
					open={open}
					anchorEl={this.anchorEl}
					ref={this.popperRef}
					modifiers={{
						flip: {
							enabled: true
						},
						preventOverflow: {
							enabled: true,
							boundariesElement: 'viewport'
						},
						arrow: {
							enabled: true,
							element: arrowRef
						}
					}}
				>
					<span className={classes.arrow} ref={this.handleArrowRef} />
					<Paper className={classes.paper}>
						{children}
					</Paper>
				</Popper>
			</span>
		</ClickAwayListener>;
	}
};

const PopperControl = withStyles(styles)(Def);
// const PopperControl = Def;
export default PopperControl;