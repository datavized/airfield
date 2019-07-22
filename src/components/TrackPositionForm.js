import React from 'react';

import withStyles from '@material-ui/core/styles/withStyles';
import PropTypes from 'prop-types';

import FormControl from '@material-ui/core/FormControl';
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';

const POSITION_INDEXES = ['X', 'Y', 'Z'];

const styles = theme => ({
	root: {
		display: 'flex',
		flexDirection: 'row',
		marginTop: theme.spacing(1)
	},
	input: {
		fontVariantNumeric: 'tabular-nums',
		marginTop: theme.spacing(2),
		width: 66,
		'& > input': {
			textAlign: 'right'
		}
	}
});

const Def = class TrackPositionForm extends React.Component {
	static propTypes = {
		classes: PropTypes.object,
		position: PropTypes.arrayOf(PropTypes.number),
		onChange: PropTypes.func
	}

	handleChangePosition = index => evt => {
		if (this.props.onChange) {
			const position = (this.props.position || [0, 0, 0]).map(val => val || 0);
			position[index] = parseFloat(evt.target.value);
			this.props.onChange(position, evt);
		}
	}

	render() {
		const {
			classes,
			position
		} = this.props;

		return <FormControl className={classes.root}>
			<InputLabel shrink={true}>Position</InputLabel>
			{POSITION_INDEXES.map((label, i) =>
				<Input
					key={i}
					type="number"
					className={classes.input}
					inputProps={{
						step: 0.1
					}}
					aria-label={`Track Position ${label}`}
					value={(position && position[i] || 0).toFixed(3)}
					onChange={this.handleChangePosition(i)}
				/>)}
		</FormControl>;
	}
};

const TrackPositionForm = withStyles(styles)(Def);
export default TrackPositionForm;