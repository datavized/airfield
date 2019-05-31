import React from 'react';
import { componentPropType } from '@material-ui/utils';
import PropTypes from 'prop-types';

import withStyles from '@material-ui/core/styles/withStyles';

import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';

const styles = () => ({
	button: {},
	tooltip: {
		pointerEvents: 'none'
	}
});

const Def = class FancyIconButton extends React.Component {
	static propTypes = {
		classes: PropTypes.object,
		iconClasses: PropTypes.object,
		children: PropTypes.oneOfType([
			PropTypes.arrayOf(PropTypes.node),
			PropTypes.node
		]),
		className: PropTypes.string,
		onClick: PropTypes.func,
		component: componentPropType,
		label: PropTypes.string,
		enterDelay: PropTypes.number.isRequired,
		leaveDelay: PropTypes.number.isRequired
	}

	static defaultProps = {
		enterDelay: 50,
		leaveDelay: 300
	}

	state = {
		open: false
	}

	handleTooltipClose = () => {
		this.setState({ open: false });
	}

	handleTooltipOpen = () => {
		this.setState({ open: true });
	}

	onClick = event => {
		event.stopPropagation();
		if (this.props.onClick) {
			this.props.onClick(event);
		}
	}

	render() {
		const {
			classes,
			iconClasses,
			className,
			children,
			component,
			label,
			enterDelay,
			leaveDelay,
			...otherProps
		} = this.props;

		const C = component || IconButton;
		const buttonContent = <C
			aria-label={label || null}
			{...otherProps}
			classes={iconClasses}
			onClick={this.onClick}
		>
			{children}
		</C>;

		if (!label) {
			return buttonContent;
		}

		return <Tooltip
			enterDelay={enterDelay}
			leaveDelay={leaveDelay}
			onClose={this.handleTooltipClose}
			onOpen={this.handleTooltipOpen}
			open={this.state.open}
			placement="bottom"
			title={label}
			classes={{
				popper: classes.tooltip
			}}
		>
			<span className={classes.button + ' ' + (className || '')}>{buttonContent}</span>
		</Tooltip>;
	}
};

const FancyIconButton = withStyles(styles)(Def);
// const FancyIconButton = Def;
export default FancyIconButton;