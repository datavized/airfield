import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'unistore/src/integrations/react';
import { actions } from '../store';
import trackName from '../util/trackName';
import num from '../util/num';
import trackPanMode from '../util/trackPanMode';
import classNames from 'classnames';
import { createConfirmation } from 'react-confirm';
// import { lighten, darken } from '@material-ui/core/styles/colorManipulator';
import { TRACK_COLORS, TRACK_HEIGHT } from '../constants';

/*
Theme/Style stuff
*/
import withStyles from '@material-ui/core/styles/withStyles';

/*
Material UI components
*/
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import Typography from '@material-ui/core/Typography';
import Tooltip from '@material-ui/core/Tooltip';
import Slider from '@material-ui/core/Slider';
import ConfirmationDialog from './ConfirmationDialog';
import InPlaceInput from './InPlaceInput';
import ContextMenu from './ContextMenu';
import PopperControl from './PopperControl';
import MoreHorizIcon from '@material-ui/icons/MoreHoriz';
import HeadphonesIcon from 'mdi-material-ui/Headphones';
import SpatialIcon from 'mdi-material-ui/AxisArrow';
import AmbisonicIcon from 'mdi-material-ui/VectorCircle';
import MonoIcon from 'mdi-material-ui/CircleMedium';
import VolumeUpIcon from '@material-ui/icons/VolumeUp';
import AutoIcon from 'mdi-material-ui/AutoFix';

const styles = theme => ({
	container: {
		padding: theme.spacing(1),
		paddingTop: 0, // icon button give us plenty of padding
		// padding: [[0, theme.spacing(1), theme.spacing(1), 0]],
		// marginLeft: theme.spacing(1),
		display: 'flex',
		position: 'relative',
		flexBasis: 200,
		flexDirection: 'column',
		minHeight: TRACK_HEIGHT - 1
		// backgroundColor: theme.palette.type === 'light' ?
		// 	lighten(theme.palette.background.paper, 0.25) :
		// 	darken(theme.palette.background.paper, 0.25)
	},
	top: {
		display: 'flex',
		flexDirection: 'row',
		alignItems: 'center',
		marginRight: -theme.spacing(1) // account for icon padding
	},
	colorColumn: {
		position: 'absolute',
		left: 0,
		top: 1,
		height: '100%',
		width: theme.spacing(0.5)
	},
	nameEditor: {
		...theme.typography.body1,
		padding: 0
	},
	trackName: {
		flex: 1,
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		width: 160
	},
	autoName: {
		fontStyle: 'italic'
	},
	slider: {
		width: 300,
		// display: 'inline-block',
		padding: [[22, theme.spacing(2)]]
	},
	button: {
		color: theme.palette.text.primary
	}
});

const confirm = createConfirmation(ConfirmationDialog);

const iconButtonProps = { leaveDelay: 100 };
const menuProps = {
	disableRestoreFocus: true,
	disableEnforceFocus: true,
	disableAutoFocus: true,
	disableAutoFocusItem: true
};

const panModeIcons = {
	'': <AutoIcon/>,
	mono: <MonoIcon/>,
	stereo: <HeadphonesIcon/>,
	spatial: <SpatialIcon/>,
	ambisonic: <AmbisonicIcon/>
};

const Def = class TrackHeader extends React.Component {
	static propTypes = {
		classes: PropTypes.object.isRequired,
		children: PropTypes.oneOfType([
			PropTypes.arrayOf(PropTypes.node),
			PropTypes.node
		]),
		track: PropTypes.object,
		project: PropTypes.object,
		updateTrack: PropTypes.func.isRequired,
		deleteTrack: PropTypes.func.isRequired,
		onClick: PropTypes.func
	}

	state = {
		editingName: false
	}

	menuItems = [
		{
			key: 'delete',
			label: 'Delete',
			onClick: async index => {
				// todo: don't need to confirm if track is empty
				try {
					await confirm({
						confirmation: 'Are you sure you want to delete this track? All clips will be permanently deleted.',
						options: {
							no: 'Cancel',
							yes: 'Delete'
						}
					});
				} catch (e) {
					return;
				}
				this.props.deleteTrack(index);
			}
		},
		{
			key: 'rename',
			label: 'Rename',
			onClick: () => this.openNameEditor()
		}
	]

	panModeMenuItems = Object.keys(panModeIcons).map(key => ({
		key,
		label: key ?
			key.charAt(0).toUpperCase() + key.slice(1) :
			'Auto',
		icon: panModeIcons[key],
		onClick: () => this.updateProperty('mode', key)
	}))

	updateProperty = (propertyName, value) => {
		const track = {
			...this.props.track,
			[propertyName]: value
		};
		this.props.updateTrack(track);
	}

	// handleChangeProperty = propertyName => event => {
	// 	const { target } = event;
	// 	const value = target.type === 'checkbox' ? target.checked : target.value;
	// 	this.updateProperty(propertyName, value);
	// }

	handleChangeName = value => {
		this.updateProperty('name', value);
	}

	handleChangeSlider = propertyName => (event, value) => {
		this.updateProperty(propertyName, value);
	}

	toggleProperty = propertyName => () => {
		this.updateProperty(propertyName, !this.props.track[propertyName]);
	}

	openNameEditor = () => {
		this.setState({
			editingName: true
		});
	}

	closeNameEditor = () => {
		this.setState({
			editingName: false
		});
	}

	/*
	todo: menu items (see geometric slide tabs)
	- Rename
	- delete (with confirmation if not empty, delete all clips)
	- move up/down?
	*/

	render() {
		const {
			classes,
			track = {},
			project,
			children,
			onClick
		} = this.props;

		const {
			name,
			id
		} = track;

		const { editingName } = this.state;

		// select default based on max number of channels in source clip(s)
		const panMode = trackPanMode(track, project) || 'stereo';

		const menuItems = id ? this.menuItems : this.menuItems.filter(({key}) => key !== 'delete');

		return <div className={classes.container} onClick={onClick}>
			<div className={classes.top}>
				{editingName ? <InPlaceInput
					defaultValue={name || ''}
					onClose={this.closeNameEditor}
					onChange={this.handleChangeName}
					placeholder="Track Name"
					inputProps={{
						'aria-label': 'Track Name'
					}}
					fullWidth
					classes={{
						input: classes.nameEditor
					}}
				/> : <Typography onDoubleClick={this.openNameEditor} className={classNames(classes.trackName, {
					[classes.autoName]: !editingName && !track.name
				})}>{trackName(track, project)}</Typography>}
				<ContextMenu
					label="Track options"
					id={id || 'empty-track'}
					menuItems={menuItems}
					dense
					{...iconButtonProps}
					icon={<MoreHorizIcon/>}
					disabled={false}
					menuProps={menuProps}
				/>
			</div>
			<ToggleButtonGroup selected>
				<ToggleButton selected={!!track.mute} onClick={this.toggleProperty('mute')} value="">
					<Tooltip title="Mute" placement="top">
						<Typography>M</Typography>
					</Tooltip>
				</ToggleButton>
				<ToggleButton selected={!!track.solo} onClick={this.toggleProperty('solo')} value="">
					<Tooltip title="Solo" placement="top">
						<Typography>S</Typography>
					</Tooltip>
				</ToggleButton>
				<ContextMenu
					label="Pan Mode"
					id={id || 'empty-track'}
					menuItems={this.panModeMenuItems}
					dense
					component={ToggleButton}
					{...iconButtonProps}
					value=""
					icon={panModeIcons[panMode]}
					menuProps={menuProps}
					iconClasses={{
						root: track.mode ? classes.button : ''
					}}
				/>
				<PopperControl
					label="Volume"
					placement="top-start"
					component={ToggleButton}
					{...iconButtonProps}
					iconClasses={{
						root: classes.button
					}}
					value=""
					icon={<VolumeUpIcon/>}
				>
					<Slider
						className={classes.slider}
						min={0}
						max={1}
						id="track-volume"
						step={0.000001}
						value={num(track.gain, 1)}
						onChange={this.handleChangeSlider('gain')}
					/>
				</PopperControl>
			</ToggleButtonGroup>
			{children}
			<div className={classes.colorColumn} style={{
				backgroundColor: track.color || TRACK_COLORS[track.order || 0]
			}}/>
		</div>;
	}
};

const TrackHeader = withStyles(styles)(
	connect(['project'], actions)(Def)
);

export default TrackHeader;