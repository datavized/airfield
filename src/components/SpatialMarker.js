import React from 'react';
import classNames from 'classnames';
import { TRACK_COLORS } from '../constants';

import withStyles from '@material-ui/core/styles/withStyles';
import PropTypes from 'prop-types';

import { DraggableCore } from 'react-draggable';

const styles = () => ({
	root: {
		position: 'absolute',
		width: 30,
		height: 30,
		top: '50%',
		left: '50%',
		borderRadius: 30,
		margin: [[-15, 0, 0, -15]],
		backgroundColor: 'lightgray',
		cursor: 'pointer',
		userSelect: 'none',
		'-webkit-tap-highlight-color': 'transparent',
		opacity: 0.7,
		'&:hover': {
			opacity: 0.85
		}
	},
	selected: {
		border: 'white solid 2px'
	}
});

const Def = class SpatialMarker extends React.Component {
	static propTypes = {
		classes: PropTypes.object,
		track: PropTypes.object.isRequired,
		scale: PropTypes.number.isRequired,
		onDrag: PropTypes.func,
		onClick: PropTypes.func,
		selected: PropTypes.bool
	}

	state = {
		dragging: false,
		dragStart: null,
		dragStartTrack: null
	}

	onDragStart = (evt, details) => {
		evt.stopPropagation();
		evt.preventDefault();
		this.setState({
			dragging: true,
			dragStart: details,
			dragStartTrack: this.props.track
		});
		if (this.props.onClick) {
			this.props.onClick(evt);
		}
	}

	onDrag = (evt, details) => {
		evt.stopPropagation();
		evt.preventDefault();

		// this.props.onDrag()
		const {
			dragStart,
			dragStartTrack
		} = this.state;

		const dx = (details.x - dragStart.x) / this.props.scale;
		const dy = (details.y - dragStart.y) / this.props.scale;
		const position = dragStartTrack.position || [0, 0, 0];
		const track = {
			...dragStartTrack,
			position: [
				(position[0] || 0) + dx,
				position[1] || 0,
				(position[2] || 0) + dy
			]
		};
		this.props.onDrag(track);
	}

	onDragStop = (evt, details) => {
		// evt.stopPropagation();
		// evt.preventDefault();
		this.onDrag(evt, details);
		this.setState({
			dragging: false,
			dragStart: null,
			dragStartTrack: null
		});
	}

	render() {
		const {
			classes,
			track,
			scale,
			selected,
			...props
		} = this.props;

		const {
			position,
			color,
			order
		} = track;

		const xOffset = selected ? 1.5 : 0.5;
		const yOffset = selected ? 3 : 0;

		return <DraggableCore onStart={this.onDragStart} onDrag={this.onDrag} onDragStop={this.onDragStop}>
			<div
				{...props}
				className={classNames(classes.root, {
					[classes.selected]: selected
				})}
				style={{
					backgroundColor: color || TRACK_COLORS[order || 0],
					transform: `translate(${(position && position[0] || 0) * scale - xOffset}px, ${(position && position[2] || 0) * scale - yOffset}px)`
				}}
			/>
		</DraggableCore>;
	}
};

const SpatialMarker = withStyles(styles)(Def);
export default SpatialMarker;