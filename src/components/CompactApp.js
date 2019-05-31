/* global FEEDBACK_URL */
import React from 'react';
import PropTypes from 'prop-types';
// import { connect } from 'unistore/react';
import { connect } from 'unistore/src/integrations/react';
import { actions } from '../store';
import '../engine/live-events';

/*
Theme/Style stuff
*/
import withStyles from '@material-ui/core/styles/withStyles';

/*
Material UI components
*/
import WelcomeDialog from './WelcomeDialog';
import Paper from '@material-ui/core/Paper';
import Shell from './Shell';
import AudioLibrary from './AudioLibrary';
import Timeline from './Timeline';
import PlayControls from './PlayControls';
import ContextMenu from './ContextMenu';
import InspectClipDialog from './InspectClipDialog';
import MenuIcon from '@material-ui/icons/Menu';
import LibraryMusicIcon from '@material-ui/icons/LibraryMusic';
import ViewListIcon from '@material-ui/icons/ViewList';
import SpatialIcon from 'mdi-material-ui/AxisArrow';
import HelpIcon from '@material-ui/icons/Help';
import FeedBackIcon from 'mdi-material-ui/MessageDraw';

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
	content: {
		flex: 1,
		overflow: 'hidden',
		display: 'flex'
	},
	appBar: {
		// hide app bar if window is too small
		[`@media (max-height: ${theme.breakpoints.values.sm}px)`]: {
			display: 'none'
		}
	},
	playBar: {
		display: 'flex',
		flexDirection: 'row'
	},
	playControls: {
		flex: 1
	}
});

const screenControls = {
	timeline: Timeline,
	library: AudioLibrary,
	spatialize: Spatialize
};

const Def = class CompactApp extends React.Component {
	static propTypes = {
		classes: PropTypes.object.isRequired,
		width: PropTypes.string.isRequired,
		loading: PropTypes.bool.isRequired,
		setConfig: PropTypes.func.isRequired,
		config: PropTypes.object.isRequired
	}

	screenMenuItems = [
		{
			key: 'help',
			label: 'Help',
			icon: <HelpIcon/>,
			config: {
				showTour: true
			}
		},
		{
			key: 'feedback',
			label: 'Give Feedback',
			icon: <FeedBackIcon/>,
			component: ({children, ...props}) =>
				<a
					{...props}
					href={FEEDBACK_URL}
					target="_blank"
					rel="noopener noreferrer"
				>{children}</a>,
			onClick: null
			// onClick: evt => {
			// 	console.log('click', evt);
			// 	//<a href="https://docs.google.com/forms/d/e/1FAIpQLScCDNx-izqcWLEDs5ZzMXt7Psnz5Tf72fiOcaj1IGOMonW7Bw/viewform" target="_blank" rel="noopener noreferrer">
			// }
		},
		{
			key: 'spatialize',
			label: 'Audio Spatialization',
			icon: <SpatialIcon/>
		},
		{
			key: 'timeline',
			label: 'Timeline',
			icon: <ViewListIcon/>
		},
		{
			key: 'library',
			label: 'Audio Library',
			icon: <LibraryMusicIcon/>
		}
	].map(({config, ...item}) => ({
		onClick: () => {
			this.props.setConfig(config || {
				activeScreen: item.key
			});
		},
		...item
	}))

	state = {
		editingClip: null
	}

	onEditClip = clipId => {
		const editingClip = clipId;
		this.setState({ editingClip });
	}

	onCloseClipInspector = () => {
		this.setState({ editingClip: null });
	}

	render() {
		const {
			classes,
			loading,
			config,
			setConfig
		} = this.props;

		const { editingClip } = this.state;

		let content = null;
		if (loading) {
			content = null;
		} else if (editingClip) {
			content = <InspectClipDialog id={editingClip} onClose={this.onCloseClipInspector}/>;
		} else {
			const ContentComponent = screenControls[config.activeScreen] || screenControls.timeline;
			content = <ContentComponent onEditClip={this.onEditClip}/>;
		}

		return <Shell classes={{
			appBar: classes.appBar
		}}>
			<div className={classes.container + ' compact-app'}>
				<div className={classes.content}>
					{content}
				</div>
				<Paper className={classes.playBar} square elevation={8}>
					<PlayControls
						classes={{
							root: classes.playControls
						}}
						disabled={false}
						loading={loading}
					>
						<ContextMenu
							label="Select View"
							id={'screens'}
							menuItems={this.screenMenuItems}
							menuProps={{
								disableAutoFocusItem: true
							}}
							data-tour-id="spatialize-mode"
							icon={<MenuIcon/>}
						/>
					</PlayControls>
				</Paper>
			</div>
			{config.showTour && !config.showWelcome && <Tour
				run={!loading && config.showTour}
			/>}
			{!loading && config.showWelcome && <WelcomeDialog onClose={() => setConfig({ showWelcome: false })}/>}
		</Shell>;
	}
};

const CompactApp = withStyles(styles)(
	connect(['loading', 'config'], actions)(Def)
);

export default CompactApp;