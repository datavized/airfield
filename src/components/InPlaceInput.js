import React from 'react';
import objectWithoutProperties from '@babel/runtime/helpers/objectWithoutProperties';

// import withStyles from '@material-ui/core/styles/withStyles';
import PropTypes from 'prop-types';

import InputBase from '@material-ui/core/InputBase';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';

const keys = {
	27: 'Escape',
	13: 'Enter'
};

const Def = class InPlaceInput extends React.Component {
	static propTypes = {
		onChange: PropTypes.func,
		onClose: PropTypes.func,
		value: PropTypes.oneOfType([
			PropTypes.string,
			PropTypes.number,
			PropTypes.bool,
			PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]))
		]),
		disableEscapeKeyDown: PropTypes.bool
	}

	static defaultProps = {
		disableEscapeKeyDown: false
	}

	state = {
		hasFocus: false
	}

	inputRef = null

	onInputRef = ref => {
		const firstTime = ref && !this.inputRef;

		if (this.inputRef) {
			if (!ref) {
				this.inputRef.blur();
			}

			this.inputRef.removeEventListener('focus', this.onFocus);
			this.inputRef.removeEventListener('blur', this.onBlur);
		}

		this.inputRef = ref;
		if (this.inputRef) {
			this.inputRef.addEventListener('focus', this.onFocus);
			this.inputRef.addEventListener('blur', this.onBlur);
		}

		if (firstTime) {
			ref.focus();
			ref.select();
		}

	}

	onFocus = () => {
		this.setState({ hasFocus: true });
	}

	onBlur = () => {
		this.setState({ hasFocus: false });
	}

	save = () => {
		if (this.props.onChange) {
			const value = this.inputRef.value;
			this.props.onChange(value);
		}
		this.close();
	}

	close = () => {
		if (this.props.onClose) {
			this.props.onClose();
		}
	}

	onChange = () => {
		if (this.props.value !== undefined) {
			this.save();
		}
	}

	handleDocumentKeyDown = event => {
		// Ignore events that have been `event.preventDefault()` marked.
		if (event.defaultPrevented) {
			return;
		}

		const code = event.key || event.which || event.keyCode || event.charCode;
		const key = keys[code] || code;

		if (!this.props.disableEscapeKeyDown && key === 'Escape') {
			this.close();
		}

		if (key === 'Enter' && this.state.hasFocus) {
			this.save();
		}

	}

	handleClickAway = () => {
		this.save();
	}

	componentDidMount() {
		document.addEventListener('keydown', this.handleDocumentKeyDown);
	}

	componentWillUnmount() {
		document.removeEventListener('keydown', this.handleDocumentKeyDown);
	}

	render() {
		const props = objectWithoutProperties(this.props, ['disableEscapeKeyDown']);

		return <ClickAwayListener
			onClickAway={this.handleClickAway}
			mouseEvent="onClick"
		>
			<InputBase
				{...props}
				onChange={this.onChange}
				inputRef={this.onInputRef}
			/>
		</ClickAwayListener>;
	}
};

// const InPlaceInput = withStyles(styles)(Def);
const InPlaceInput = Def;
export default InPlaceInput;