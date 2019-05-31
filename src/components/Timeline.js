import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'unistore/src/integrations/react';
import { actions } from '../store';
import validateClipChanges from '../util/validateClipChanges';
import {
	TRACK_HEIGHT,
	MIN_ZOOM_SCALE,
	MAX_ZOOM_SCALE,
	MIN_ZOOM_FACTOR,
	MAX_ZOOM_FACTOR
} from '../constants';
import findClip from '../store/findClip';
import touchDistance from '../util/touchDistance';

/*
Theme/Style stuff
*/
import withStyles from '@material-ui/core/styles/withStyles';
import withLayout from './hoc/withLayout';

/*
Material UI components
*/
import TrackHeader from './TrackHeader';
import Clip from './Clip';
import TimelineCanvas from './TimelineCanvas';
import AddClipMenu from './AddClipMenu';
import ZoomSlider from './ZoomSlider';
import PlayHead from './PlayHead';

import { DraggableCore } from 'react-draggable';

const styles = theme => ({
	root: {
		display: 'flex',
		flexDirection: 'row',
		flex: 1,
		minHeight: 0,
		minWidth: 1
	},
	trackHeaders: {
		flexShrink: 0,
		flexGrow: 0,
		paddingTop: 32,
		paddingBottom: TRACK_HEIGHT,
		overflow: 'hidden',
		background: `linear-gradient(${theme.palette.divider} 1px, transparent 1px) 0% 0% / ${TRACK_HEIGHT}px ${TRACK_HEIGHT}px repeat`,
		backgroundPositionY: 32,
		backgroundAttachment: 'local'
	},
	trackHeader: {
		height: TRACK_HEIGHT
	},
	container: {
		display: 'flex',
		flexDirection: 'column',
		position: 'relative',
		overflow: 'hidden',
		flex: 1,
		userSelect: 'none'
	},
	scroller: {
		overflow: 'auto'
	},
	tracks: {
		flex: 1,
		minWidth: '100%',
		minHeight: '100%',
		position: 'relative',
		background: `linear-gradient(${theme.palette.divider} 1px, transparent 1px) 0% 0% / ${TRACK_HEIGHT}px ${TRACK_HEIGHT}px repeat`
	},
	timeline: {
		cursor: 'pointer'
	},
	buttons: {
		position: 'absolute',
		bottom: 16, // leave room for timeline slider
		right: 0,
		display: 'flex',
		flexDirection: 'row'
	},
	zoomSlider: {
		width: 200
	}
});

const identity = x => x;

function getDraggedClipChanges(project, oldClip, drag, timeScale) {
	const changes = {...oldClip};
	const deltaTrack = Math.round(drag.y / TRACK_HEIGHT);
	const deltaStart = drag.x / timeScale;
	if (deltaTrack) {
		const oldTrack = project.tracks.get(oldClip.track);
		const oldTrackIndex = oldTrack.order;
		const newTrackIndex = oldTrackIndex + deltaTrack;
		changes.track = project.trackOrder[newTrackIndex] || '';
	}
	changes.start += deltaStart;

	return validateClipChanges(changes, project);
}

function getTrimmingClipChanges(project, oldClip, drag, timeScale, direction) {
	const changes = {...oldClip};
	const deltaTime = drag.x / timeScale;
	if (direction === 'start') {
		changes.start += deltaTime;
		changes.offset += deltaTime;
		changes.duration -= deltaTime;
	} else if (direction === 'end') {
		changes.duration += deltaTime;
	}

	return validateClipChanges(changes, project);
}

const Def = class Timeline extends React.Component {
	static propTypes = {
		classes: PropTypes.object.isRequired,
		project: PropTypes.object,
		layout: PropTypes.string.isRequired,
		editingClip: PropTypes.object,
		config: PropTypes.object.isRequired,
		setConfig: PropTypes.func.isRequired,
		onEditClip: PropTypes.func.isRequired,
		selectClip: PropTypes.func.isRequired,
		addClip: PropTypes.func.isRequired,
		updateClip: PropTypes.func.isRequired,
		deleteClip: PropTypes.func.isRequired,
		duplicateClip: PropTypes.func.isRequired,
		setCurrentTime: PropTypes.func.isRequired,
		connectDropTarget: PropTypes.func,
		dragRef: PropTypes.func
	}

	state = {
		// todo: zoom all the way out first time
		minZoomScale: MIN_ZOOM_SCALE,
		selectedClip: null,
		editingClip: null,
		dragging: false,
		pinchStartDistance: 0,
		pinchStartScale: 1,
		dragStart: null
	}

	element = null
	scroller = null
	trackHeader = null

	onWheel = event => {
		if (event.altKey && !this.state.dragging) {
			event.preventDefault();

			// careful: safer with getBoundingClientRect
			const scroller = this.scroller;
			const fraction = (event.pageX - scroller.offsetLeft) / scroller.offsetWidth;

			const originalTimeSpan = scroller.offsetWidth / this.props.config.timeScale;
			const centerTime = this.props.config.leftVisibleTime + originalTimeSpan * fraction;

			const {
				minZoomScale,
				maxZoomScale
			} = this.state;
			const timeScale = Math.min(maxZoomScale, Math.max(minZoomScale, this.props.config.timeScale - event.deltaY / 10));

			// center zoom on mouse cursor
			const timeSpan = scroller.offsetWidth / timeScale;
			const desiredTeftVisibleTime = Math.max(0, centerTime - timeSpan * fraction);
			scroller.scrollLeft = desiredTeftVisibleTime * timeScale;
			const leftVisibleTime = scroller.scrollLeft / timeScale;

			this.props.setConfig({
				timeScale,
				leftVisibleTime
			});
		}
	}

	onScroll = ({target}) => {
		const {
			scrollLeft,
			scrollTop
		} = target;

		const leftVisibleTime = scrollLeft / this.props.config.timeScale;
		this.props.setConfig({ leftVisibleTime });

		// align track controls vertically (scrollTop)
		if (this.trackHeaders) {
			this.trackHeaders.scrollTop = scrollTop;
		}
	}

	onZoomChange = (evt, value) => {
		const scroller = this.scroller;

		const originalTimeSpan = scroller.offsetWidth / this.props.config.timeScale;
		const centerTime = this.props.config.leftVisibleTime + originalTimeSpan / 2;

		const { minZoomScale, maxZoomScale } = this.state;
		const zoomRange = maxZoomScale - minZoomScale;
		// const invertedValue = 1 - value;
		const targetTimeScale = value * value * zoomRange + minZoomScale;
		const timeScale = Math.min(maxZoomScale, Math.max(minZoomScale, targetTimeScale));

		// center zoom on mouse cursor
		const timeSpan = scroller.offsetWidth / timeScale;
		const desiredTeftVisibleTime = Math.max(0, centerTime - timeSpan / 2);
		scroller.scrollLeft = desiredTeftVisibleTime * timeScale;
		const leftVisibleTime = scroller.scrollLeft / timeScale;

		this.props.setConfig({
			timeScale,
			leftVisibleTime
		});
	}

	onRef = ref => {
		if (this.element && this.element !== ref) {
			this.element.removeEventListener('wheel', this.onWheel, { passive: false });
			this.element.removeEventListener('touchstart', this.onTouchStart);
			window.removeEventListener('touchmove', this.onTouchMove);
			window.removeEventListener('touchend', this.onTouchEnd);
		}

		this.element = ref;
		if (this.element) {
			this.element.addEventListener('wheel', this.onWheel, { passive: false });
			this.element.addEventListener('touchstart', this.onTouchStart, { passive: true });
		}
	}

	onScrollerRef = ref => {
		this.scroller = ref;

		if (this.scroller) {
			const {
				timeScale,
				leftVisibleTime
			} = this.props.config;
			this.scroller.scrollLeft = leftVisibleTime * timeScale;
		}

		if (this.props.dragRef) {
			this.props.dragRef(ref);
		}
	}

	onTrackHeaderRef = ref => {
		this.trackHeaders = ref;
		if (this.trackHeaders && this.scroller) {
			this.trackHeaders.scrollTop = this.scroller.scrollTop;
		}
	}

	onTouchStart = evt => {
		if (evt.touches.length === 2) {
			const pinchStartDistance = touchDistance(evt.touches);
			const pinchStartScale = this.props.config.timeScale;
			this.setState({
				pinchStartDistance,
				pinchStartScale
			});
			if (pinchStartDistance) {
				window.addEventListener('touchmove', this.onTouchMove);
				window.addEventListener('touchend', this.onTouchEnd);
			}
		} else {
			window.removeEventListener('touchmove', this.onTouchMove);
			window.removeEventListener('touchend', this.onTouchEnd);
		}
	}

	onTouchMove = evt => {
		if (evt.touches.length === 2) {
			const {
				pinchStartDistance,
				pinchStartScale,
				minZoomScale,
				maxZoomScale
			} = this.state;
			const distance = touchDistance(evt.touches);
			const timeScale = Math.min(maxZoomScale, Math.max(minZoomScale, pinchStartScale * distance / pinchStartDistance));
			this.props.setConfig({
				timeScale
			});
		}
	}

	onTouchEnd = () => {
		window.removeEventListener('touchmove', this.onTouchMove);
		window.removeEventListener('touchend', this.onTouchEnd);
	}

	onSelectClip = selectedClipId => evt => {
		evt.stopPropagation();
		this.props.selectClip(selectedClipId);
	}

	onSelectNone = () => {
		this.props.selectClip('');
	}

	onDragStart = selectedClipId => (evt, drag) => {
		this.props.selectClip(selectedClipId);
		this.setState({
			dragStart: drag
		});
	}

	onDragClip = (evt, drag, direction) => {
		const {
			project,
			config
		} = this.props;

		const {
			dragStart,
			selectClip
		} = this.state;

		const { timeScale } = config;
		const delta = {
			x: drag.x - dragStart.x,
			y: drag.y - dragStart.y
		};

		const editingClip = direction ?
			getTrimmingClipChanges(project, selectClip, delta, timeScale, direction) :
			getDraggedClipChanges(project, selectClip, delta, timeScale);

		this.setState({
			dragging: true,
			editingClip
		});
	}

	onDragStop = (evt, drag, direction) => {
		/*
		todo:
		- make Draggable controlled
		*/
		const {
			project,
			config
		} = this.props;

		const { timeScale } = config;

		const {
			dragStart,
			selectClip,
			dragging
		} = this.state;

		if (dragging) {
			const delta = {
				x: drag.x - dragStart.x,
				y: drag.y - dragStart.y
			};

			const changedClip = direction ?
				getTrimmingClipChanges(project, selectClip, delta, timeScale, direction) :
				getDraggedClipChanges(project, selectClip, delta, timeScale);

			if (changedClip) {
				this.props.updateClip(changedClip);
			}
		}

		this.setState({
			dragging: false,
			editingClip: null
		});
	}

	onDragSeek = (evt, drag) => {
		const {
			timeScale,
			leftVisibleTime
		} = this.props.config;

		this.props.setCurrentTime(leftVisibleTime + drag.x / timeScale);
	}

	onAddClip = sourceId => {
		if (sourceId) {
			this.props.addClip(sourceId);
		} else {
			this.props.setConfig({
				activeScreen: 'library'
			});
		}
	}

	clipMenuItems = [
		{
			key: 'duplicate',
			label: 'Duplicate Clip',
			onClick: this.props.duplicateClip
		},
		{
			key: 'delete',
			label: 'Delete Clip',
			onClick: this.props.deleteClip
		}

		// todo: add option to split into one clip for each channel
	]

	compactClipMenuItems = [
		{
			key: 'edit',
			label: 'Edit Details',
			onClick: clipId => {
				if (this.props.onEditClip) {
					this.props.onEditClip(clipId);
				}
			}
		},

		...this.clipMenuItems
	]

	componentDidUpdate(prevProps) {
		const {
			config,
			project
		} = this.props;

		const newState = {};
		let update = false;

		const { selectedClipId } = config;
		if (selectedClipId !== prevProps.config.selectedClipId || prevProps.project.tracks !== project.tracks) {
			newState.selectClip = selectedClipId && findClip(this.props.project, selectedClipId) || null;
			update = true;
		}

		const duration = project && project.duration || 0;
		if (duration !== (prevProps.project && prevProps.project.duration || 0)) {
			newState.minZoomScale = Math.max(1000 / (duration * MAX_ZOOM_FACTOR), MIN_ZOOM_SCALE);
			newState.maxZoomScale = Math.min(1000 / (duration * MIN_ZOOM_FACTOR), MAX_ZOOM_SCALE);
			update = true;
		}

		if (update) {
			this.setState(newState);
		}
	}

	componentDidMount() {
		const {
			project,
			config
		} = this.props;

		const { selectedClipId } = config;
		const selectClip = selectedClipId && findClip(project, selectedClipId) || null;

		const duration = project && project.duration || 0;
		this.setState({
			selectClip,
			minZoomScale: Math.max(1000 / (duration * MAX_ZOOM_FACTOR), MIN_ZOOM_SCALE),
			maxZoomScale: Math.min(1000 / (duration * MIN_ZOOM_FACTOR), MAX_ZOOM_SCALE)
		});
	}

	render() {
		const {
			minZoomScale,
			maxZoomScale
		} = this.state;

		const {
			classes,
			project,
			layout,
			config,
			connectDropTarget
		} = this.props;

		const {
			selectedClipId,
			timeScale,
			leftVisibleTime
		} = config;

		const {
			tracks,
			trackOrder = [],
			clips
		} = project;

		const clipArray = clips && Array.from(clips.values()) || [];

		const editingClip = this.props.editingClip || this.state.editingClip || null;
		const editingTrack = editingClip && tracks.get(editingClip.track) || null;
		const editingTrackIndex = editingTrack && editingTrack.order > -1 ? editingTrack.order : tracks.size;

		const timelineLength = project && (project.timelineLength || project.duration) || 0;
		const paddedLength = Math.min(timelineLength * 1.1, timelineLength + 10);

		const zoomRange = maxZoomScale - minZoomScale;
		const zoomLevel = Math.sqrt(Math.max(0, timeScale - minZoomScale) / zoomRange);
		const zoomStep = 1 / Math.max(5, Math.log2(zoomRange));

		const makeDropTarget = connectDropTarget || identity;

		return <div className={classes.root} data-tour-id="timeline-root">
			<div className={classes.trackHeaders} ref={this.onTrackHeaderRef}>
				{trackOrder.map(trackId => <div key={trackId} className={classes.trackHeader}><TrackHeader track={tracks.get(trackId)}/></div>)}
				<div><TrackHeader track={{order: trackOrder.length}}/></div>
			</div>
			<div className={classes.container} ref={this.onRef}>
				<DraggableCore onStart={this.onDragSeek} onDrag={this.onDragSeek}>
					<div className={classes.timeline}><TimelineCanvas timeScale={timeScale} startTime={leftVisibleTime}/></div>
				</DraggableCore>
				<div className={classes.scroller} onScroll={this.onScroll} onClick={this.onSelectNone} ref={this.onScrollerRef}>
					{makeDropTarget(<div
						className={classes.tracks}
						style={{
							width: timeScale * paddedLength,
							height: ((tracks.size || 0) + 1) * TRACK_HEIGHT
						}}
					>
						{clipArray.map(clip => <Clip
							key={clip.id}
							selected={selectedClipId === clip.id}
							clip={clip}
							timeScale={timeScale}
							style={{
								top: tracks.get(clip.track).order * TRACK_HEIGHT
							}}
							menuItems={layout === 'compact' ? this.compactClipMenuItems : this.clipMenuItems}
							onClick={this.onSelectClip(clip.id)}
							onDragStart={this.onDragStart(clip.id)}
							onDrag={this.onDragClip}
							onDragStop={this.onDragStop}
							onTrimStart={this.onDragStart(clip.id)}
							onTrim={this.onDragClip}
							onTrimStop={this.onDragStop}
						/>)}
						{editingClip && <Clip
							selected
							clip={editingClip}
							timeScale={timeScale}
							style={{
								top: editingTrackIndex * TRACK_HEIGHT
							}}
						/>}
					</div>)}
				</div>
				<PlayHead
					leftVisibleTime={leftVisibleTime}
					timeScale={timeScale}
				/>
				<div className={classes.buttons}>
					<ZoomSlider min={0} max={1} step={0} increment={zoomStep} value={zoomLevel} onChange={this.onZoomChange} className={classes.zoomSlider}/>
					<AddClipMenu onSelect={this.onAddClip}/>
				</div>
			</div>
		</div>;
	}
};

const Timeline = [
	withLayout,
	withStyles(styles),
	connect(['project', 'config'], actions)
].reduceRight((prev, fn) => fn(prev), Def);

export default Timeline;