import React from 'react';
import PropTypes from 'prop-types';
import formatTime from '../util/formatTime';

/*
Theme/Style stuff
*/
import withStyles from '@material-ui/core/styles/withStyles';

/*
Material UI components
*/
import TextField from '@material-ui/core/TextField';

const styles = () => ({
});

const formatTimeValue = value => formatTime(value, 3, 0.001);

// no negative time
const numRegex = /^\s*([0-9]+(\.[0-9]*)?(e[-+]?[0-9]+)?$)\s*/i;
const timePlaceScales = [1, 60, 60 * 60];
function parseTime(str) {
	if (typeof str === 'number') {
		return str;
	}

	const places = str.split(':');

	if (!(places.length > 0) && places.length <= timePlaceScales.length) {
		return NaN;
	}

	let time = 0;
	for (let i = places.length - 1, t = 0; i >= 0; i--, t++) {
		const place = places[i];
		const value = numRegex.test(place) ? parseFloat(place) : NaN;
		if (isNaN(value)) {
			return NaN;
		}

		const scale = timePlaceScales[t];
		time += scale * value;
	}

	return time;
}

const Def = class TimeField extends React.Component {
	static propTypes = {
		classes: PropTypes.object.isRequired,
		value: PropTypes.number,
		disabled: PropTypes.bool,
		onFocus: PropTypes.func,
		onBlur: PropTypes.func,
		onChange: PropTypes.func,
		min: PropTypes.number,
		max: PropTypes.number
	}

	static defaultProps = {
		min: 0,
		max: Infinity
	}

	static getDerivedStateFromProps(props, state) {
		const focused = props.disabled && state.focused ? false : state.focused;
		const value = focused ? state.value : formatTimeValue(props.value);

		return {
			value,
			focused
		};
	}

	state = {
		focused: false,
		value: ''
	}

	onFocus = event => {
		this.setState(state => !state.focused ? { focused: true } : null);
		if (this.props.onFocus) {
			this.props.onFocus(event);
		}
	}

	onBlur = event => {
		this.setState(state => state.focused ? { focused: false } : null);
		if (this.props.onBlur) {
			this.props.onBlur(event);
		}
	}

	onChange = event => {
		const value = parseTime(event.target.value);
		const error = isNaN(value) ?
			'Invalid time value' :
			!(value >= this.props.min && value <= this.props.max) ?
				'Out of range' :
				'';

		this.setState({
			value: event.target.value,
			error
		});

		if (this.props.onChange) {
			if (!error && value !== this.props.value) {
				this.props.onChange(value, event);
			}
		}
	}

	render() {
		const {
			value,
			...props
		} = this.props;

		const { error } = this.state;

		return <TextField
			{...props}
			onFocus={this.onFocus}
			onBlur={this.onBlur}
			onChange={this.onChange}
			error={!!error}
			value={this.state.focused ? this.state.value : formatTimeValue(value)}
		/>;
	}
};

const TimeField = withStyles(styles)(Def);

export default TimeField;