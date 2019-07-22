import React from 'react';
import PropTypes from 'prop-types';
import Draggable, {DraggableCore} from 'react-draggable';
import classNames from 'classnames';

import { TRACK_HEIGHT } from '../constants';
/*
Theme/Style stuff
*/
import withStyles from '@material-ui/core/styles/withStyles';

/*
Material UI components
*/
import Typography from '@material-ui/core/Typography';
import ContextMenu from './ContextMenu';
import MoreHorizIcon from '@material-ui/icons/MoreHoriz';
import DragHandleIcon from '@material-ui/icons/DragHandle';

const MIN_TITLE_DISPLAY_WIDTH = 104;
const MIN_MENU_DISPLAY_WIDTH = 84;

const styles = theme => ({
	clip: {
		display: 'flex',
		flexDirection: 'row',
		alignItems: 'center',
		position: 'absolute',
		overflow: 'hidden',
		// border: `1px solid pink`,
		borderRadius: 4,
		backgroundColor: 'darkgray',
		height: TRACK_HEIGHT,
		top: 0,
		minWidth: 8,
		padding: theme.spacing(1, 0),
		boxSizing: 'border-box',
		cursor: 'grab'
	},
	clipContent: {
		flex: 1,
		display: 'flex',
		alignItems: 'center',
		overflow: 'hidden',
		padding: theme.spacing(0, 1)
	},
	clipName: {
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		flexShrink: 1
	},
	disabled: {
		backgroundColor: 'lightgray'
	},
	selected: {
		backgroundColor: theme.palette.secondary.main,
		'&:not($dragging)': {
			'& $trimHandle': {
				visibility: 'visible'
			},
			'& $menuButton': {
				visibility: 'visible'
			}
		}
	},
	selectedDisabled: {
		backgroundColor: theme.palette.secondary.light
	},
	dragging: {
		boxShadow: theme.shadows[3],
		opacity: 0.2,
		zIndex: 999,
		'& $trimHandle': {
			visibility: 'hidden'
		}
	},
	menuButton: {
		visibility: 'hidden'
	},
	small: {
		'& $clipName': {
			display: 'none'
		}
	},
	tiny: {
		'& $menuButton': {
			display: 'none'
		}
	},
	trimmed: {},
	trimHandle: {
		visibility: 'hidden',
		'& svg': {
			transform: 'translate(-7px) rotate(90deg)'
		},
		width: 10,
		height: 24,
		cursor: 'ew-resize',
		color: 'white',
		'&$trimmed': {
			color: 'black'
		}
	}
});

const Def = class Clip extends React.Component {
	static propTypes = {
		classes: PropTypes.object.isRequired,
		clip: PropTypes.object,
		style: PropTypes.object,
		timeScale: PropTypes.number.isRequired,
		onDrag: PropTypes.func,
		onDragStart: PropTypes.func,
		onDragStop: PropTypes.func,
		onTrim: PropTypes.func,
		onTrimStart: PropTypes.func,
		onTrimStop: PropTypes.func,
		selected: PropTypes.bool,
		menuItems: PropTypes.arrayOf(PropTypes.object).isRequired
	}

	state = {
		dragging: false
	}

	onDragStart = (evt, details) => {
		if (this.props.onDragStart) {
			this.props.onDragStart(evt, details);
		}
	}

	onDrag = (evt, details) => {
		this.setState({ dragging: true });
		if (this.props.onDrag) {
			this.props.onDrag(evt, details);
		}
	}

	onDragStop = (evt, details) => {
		this.setState({ dragging: false });
		if (this.props.onDragStop) {
			this.props.onDragStop(evt, details);
		}
	}

	onTrimStart = direction => (evt, details) => {
		evt.stopPropagation();
		evt.preventDefault();
		if (this.props.onTrimStart) {
			this.props.onTrimStart(evt, details, direction);
		}
	}

	onTrim = direction => (evt, details) => {
		evt.stopPropagation();
		evt.preventDefault();
		this.setState({ dragging: true });
		if (this.props.onTrim) {
			this.props.onTrim(evt, details, direction);
		}
	}

	onTrimStop = direction => (evt, details) => {
		evt.stopPropagation();
		evt.preventDefault();
		this.setState({ dragging: false });
		if (this.props.onTrimStop) {
			this.props.onTrimStop(evt, details, direction);
		}
	}

	render() {
		const {
			classes,
			clip,
			timeScale,
			style,
			selected,
			menuItems,
			...props
		} = this.props;

		const {
			id,
			start,
			duration,
			name,
			source,
			offset
		} = clip;

		const { dragging } = this.state;

		const disabled = clip.enabled === false;

		delete props.onDragStart;
		delete props.onDrag;
		delete props.onDragStop;
		delete props.onTrimStart;
		delete props.onTrim;
		delete props.onTrimStop;

		const width = duration * timeScale;

		return <Draggable
			bounds="parent"
			onDrag={this.onDrag}
			onStart={this.onDragStart}
			onStop={this.onDragStop}
			position={dragging ? null : {x: 0, y: 0}}
		>
			<div
				key={id}
				className={classNames(classes.clip, {
					[classes.dragging]: dragging,
					[classes.selected]: selected,
					[classes.disabled]: disabled,
					[classes.selectedDisabled]: selected && disabled,
					[classes.small]: width < MIN_TITLE_DISPLAY_WIDTH,
					[classes.tiny]: width < MIN_MENU_DISPLAY_WIDTH
				})}
				style={{
					left: start * timeScale,
					width,
					...style
				}}
				{...props}
			>
				<DraggableCore
					onStart={this.onTrimStart('start')}
					onDrag={this.onTrim('start')}
					onStop={this.onTrimStop('start')}
				>
					<div className={classNames(classes.trimHandle, {
						[classes.trimmed]: offset > 0
					})}><DragHandleIcon/></div>
				</DraggableCore>
				<div className={classes.clipContent}>
					<Typography className={classes.clipName}>{name || source.fileName}</Typography>
					{menuItems && menuItems.length ? <ContextMenu
						label="Clip Options"
						id={id}
						menuItems={menuItems}
						className={classes.menuButton}
						icon={<MoreHorizIcon/>}
					/> : null}
				</div>
				<DraggableCore
					onStart={this.onTrimStart('end')}
					onDrag={this.onTrim('end')}
					onStop={this.onTrimStop('end')}
				>
					<div className={classNames(classes.trimHandle, {
						[classes.trimmed]: duration < source.duration
					})}><DragHandleIcon/></div>
				</DraggableCore>
			</div>
		</Draggable>;
	}
};

const Clip = withStyles(styles)(Def);

export default Clip;