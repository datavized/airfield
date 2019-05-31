/* global FEEDBACK_URL */
import React from 'react';
import PropTypes from 'prop-types';
// import { connect } from 'unistore/react';
import { connect } from 'unistore/src/integrations/react';
import { actions } from '../store';
import '../engine/live-events';
import findClip from '../store/findClip';
import touchBackend from 'react-dnd-touch-backend';
import { DragDropContext as dragDropContext } from 'react-dnd/lib/esm/DragDropContext';

/*
Theme/Style stuff
*/
import withStyles from '@material-ui/core/styles/withStyles';

/*
Material UI components
*/
import WelcomeDialog from './WelcomeDialog';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import Shell from './Shell';
import AudioLibrary from './AudioLibrary';
import ClipEditForm from './ClipEditForm';
import Timeline from './DropTargetTimeline';
import PlayControls from './PlayControls';
import IconButton from './IconButton';
import VUMeterCollection from './VUMeterCollection';
import ViewListIcon from '@material-ui/icons/ViewList';
import SpatialIcon from 'mdi-material-ui/AxisArrow';
import HelpIcon from '@material-ui/icons/Help';
import FeedBackIcon from 'mdi-material-ui/MessageDraw';

import AudioFileRowDragPreview from './AudioFileRowDragPreview';

// import Spatialize from './Spatialize';
import SectionLoader from './SectionLoader';
import LoadFailure from './LoadFailure';
import asyncComponent from './hoc/asyncComponent';
const Spatialize = asyncComponent(() => import('./Spatialize'), {
	load: SectionLoader,
	fail: LoadFailure,
	defer: true
});

const Tour = asyncComponent(() => import('./Tour'));

const styles = theme => ({
	container: {
		flex: 1,
		display: 'flex',
		overflow: 'hidden',
		minHeight: 0,
		flexDirection: 'column'
	},
	top: {
		display: 'flex',
		flexDirection: 'row',
		flexBasis: '40%',
		flexGrow: 1,
		flexShrink: 0,
		overflow: 'hidden',
		'& > *:first-child': {
			width: '60%',
			display: 'flex'
		},
		'& > *': {
			width: '40%'
		}
	},
	icons: {
		flex: 1,
		textAlign: 'right'
	},
	bottom: {
		flexGrow: 1,
		overflow: 'hidden',
		display: 'flex',
		flexDirection: 'column'
	},
	full: {
		flex: 1,
		display: 'flex',
		overflow: 'hidden'
	},
	screenButton: {
		margin: theme.spacing.unit * 2
	}
});

const Def = class FullSizeApp extends React.Component {
	static propTypes = {
		classes: PropTypes.object.isRequired,
		project: PropTypes.object,
		loading: PropTypes.bool.isRequired,
		setConfig: PropTypes.func.isRequired,
		config: PropTypes.object.isRequired
	}

	toggleScreen = () => {
		const activeScreen = this.props.config.activeScreen === 'spatialize' ?
			'timeline' :
			'spatialize';
		this.props.setConfig({ activeScreen });
	}

	handleHelp = () => {
		this.props.setConfig({
			showTour: true
		});
	}

	render() {
		const {
			classes,
			project,
			loading,
			config,
			setConfig
		} = this.props;

		// todo: if loading, show a loading screen
		const { activeScreen, selectedClipId, showTour } = config;
		const clip = !loading && findClip(project, selectedClipId) || null;
		const isSpatialize = activeScreen === 'spatialize';
		const ScreenIcon = isSpatialize ? ViewListIcon : SpatialIcon;

		const header = <div className={classes.icons}>
			<IconButton label="Give Feedback" color="inherit" href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer">
				<FeedBackIcon/>
			</IconButton>
			<IconButton onClick={this.handleHelp} label="Help" color="inherit">
				<HelpIcon/>
			</IconButton>
		</div>;

		return <Shell controls={header}>
			<div className={classes.container}>
				{isSpatialize ?
					<div className={classes.full}>
						<Spatialize/>
					</div> :
					<React.Fragment>
						<div className={classes.top}>
							<div>
								<AudioLibrary/>
							</div>
							<div>
								{clip ? <ClipEditForm clip={clip}/> : <VUMeterCollection/>}
							</div>
						</div>
						<div className={classes.bottom}>
							{loading ? null : <Timeline/>}
						</div>
					</React.Fragment>
				}
				<Paper className={classes.playBar} square elevation={8}>
					<PlayControls
						classes={{
							root: classes.playControls
						}}
						disabled={false}
						loading={loading}
					>
						<Button
							disabled={loading}
							variant="contained"
							onClick={this.toggleScreen}
							className={classes.screenButton}
							data-tour-id="spatialize-mode"
						>
							<ScreenIcon/>
						</Button>
					</PlayControls>
				</Paper>
			</div>
			<AudioFileRowDragPreview/>
			{showTour && !config.showWelcome && <Tour
				run={!loading && showTour}
			/>}
			{!loading && config.showWelcome && <WelcomeDialog onClose={() => setConfig({ showWelcome: false })}/>}
		</Shell>;
	}
};

const FullSizeApp = [
	dragDropContext(touchBackend({
		enableMouseEvents: true
	})),
	connect(['project', 'config', 'loading'], actions),
	withStyles(styles)
].reduceRight((prev, fn) => fn(prev), Def);

export default FullSizeApp;