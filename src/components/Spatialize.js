import React from 'react';
import { connect } from 'unistore/react';
import { actions } from '../store';
import classNames from 'classnames';
import trackPanMode from '../util/trackPanMode';
import touchDistance from '../util/touchDistance';

import withStyles from '@material-ui/core/styles/withStyles';
import PropTypes from 'prop-types';

import SpatialMarker from './SpatialMarker';
import TrackHeader from './TrackHeader';
import ZoomSlider from './ZoomSlider';
import TrackPositionForm from './TrackPositionForm';

const MAX_SCALE = 256; // pixels per meter
const MIN_SCALE = 8; // pixels per meter
const MAX_ZOOM = Math.log2(MAX_SCALE);
const MIN_ZOOM = Math.log2(MIN_SCALE);

const styles = theme => ({
	root: {
		display: 'flex',
		flexDirection: 'row',
		flex: 1,
		'& > *': {
			flexGrow: 1
		}
	},
	trackHeaders: {
		flexShrink: 0,
		flexGrow: 0,
		overflow: 'auto'//,
		// backgroundColor: theme.palette.background.paper
	},
	selected: {},
	trackHeader: {
		borderBottom: `1px solid ${theme.palette.divider}`,
		cursor: 'pointer',
		'&$selected': {
			backgroundColor: theme.palette.primary.dark
		}
	},
	canvasView: {
		position: 'relative',
		overflow: 'hidden'
	},
	viewControls: {
		position: 'absolute',
		bottom: 0,
		right: 0,
		margin: theme.spacing(1),
		marginBottom: Math.max(theme.spacing(1), 16)
	},
	zoomSlider: {
		width: 200
	}
});

const Def = class Spatialize extends React.Component {
	static propTypes = {
		classes: PropTypes.object,
		theme: PropTypes.object,
		project: PropTypes.object,
		config: PropTypes.object,
		setConfig: PropTypes.func.isRequired,
		updateTrack: PropTypes.func.isRequired
	}

	element = null

	state = {
		pinchStartDistance: 0,
		pinchStartScale: 1
	}

	selectTrack = trackId => () => {
		this.props.setConfig({
			selectedTrackId: trackId
		});
	}

	onZoomChange = (evt, value) => {
		const spatializeScale = Math.pow(2, value);
		this.props.setConfig({ spatializeScale });
	}

	onWheel = event => {
		if (event.altKey) {
			event.preventDefault();

			const spatializeScale = this.props.config.spatializeScale - event.deltaY / 10;
			this.props.setConfig({ spatializeScale });
		}
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

	onTouchStart = evt => {
		if (evt.touches.length === 2) {
			const pinchStartDistance = touchDistance(evt.touches);
			const pinchStartScale = this.props.config.spatializeScale;
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
				pinchStartScale
			} = this.state;
			const distance = touchDistance(evt.touches);
			const spatializeScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchStartScale * distance / pinchStartDistance));
			this.props.setConfig({
				spatializeScale
			});
		}
	}

	onTouchEnd = () => {
		window.removeEventListener('touchmove', this.onTouchMove);
		window.removeEventListener('touchend', this.onTouchEnd);
	}

	handleChangePosition = id => position => {
		this.props.updateTrack({
			id,
			position
		});
	}

	render() {
		const {
			classes,
			theme,
			project,
			config
		} = this.props;

		const { selectedTrackId } = config;

		const {
			tracks
		} = project;

		// spatializeScale = pixels per meter
		const { spatializeScale } = config;
		const zoomLevel = Math.log2(spatializeScale);

		const trackOrder = project.trackOrder && project.trackOrder.length ?
			project.trackOrder :
			[0];

		const spatializedTracks = Array.from(tracks && tracks.values() || [])
			.filter(track => trackPanMode(track, project) === 'spatial');

		const GRADIENT_LINE = `transparent calc(50% - 1px), ${theme.palette.divider} calc(50% - 1px), ${theme.palette.divider} calc(50% + 1px), transparent calc(50% + 1px)`;
		const gradientBackground = [
			`linear-gradient(to right, ${GRADIENT_LINE})`,
			`linear-gradient(to bottom, ${GRADIENT_LINE})`,
			`repeating-radial-gradient(circle, transparent 0px, transparent ${spatializeScale - 1.5}px, ${theme.palette.divider} ${spatializeScale - 1.5}px, ${theme.palette.divider} ${spatializeScale + 0.5}px)`
		].join(', ');

		return <div className={classes.root}>
			<div className={classes.trackHeaders} ref={this.onTrackHeaderRef}>
				{trackOrder.map(trackId => {
					const track = tracks.get(trackId);
					return <div key={trackId} className={classNames(classes.trackHeader, {
						[classes.selected]: trackId === selectedTrackId
					})}>
						<TrackHeader track={track} onClick={this.selectTrack(trackId)}>
							{trackId === selectedTrackId && spatializedTracks.indexOf(track) >= 0 ?
								<TrackPositionForm position={track.position} onChange={this.handleChangePosition(trackId)}/> :
								null
							}
						</TrackHeader>
					</div>;
				})}
			</div>
			<div
				ref={this.onRef}
				className={classes.canvasView}
				style={{
					background: gradientBackground
				}}
				data-tour-id="spatialize-canvas"
			>
				{spatializedTracks.map(track =>
					<SpatialMarker
						key={track.id}
						track={track}
						scale={spatializeScale}
						onClick={this.selectTrack(track.id)}
						onDrag={this.props.updateTrack}
						selected={track.id === selectedTrackId}
					/>)}
				<div className={classes.viewControls}>
					<ZoomSlider min={MIN_ZOOM} max={MAX_ZOOM} step={0} increment={1} value={zoomLevel} onChange={this.onZoomChange} className={classes.zoomSlider}/>
				</div>
			</div>
		</div>;
	}
};

const Spatialize = [
	connect(['project', 'config'], actions),
	withStyles(styles, { withTheme: true })
].reduceRight((prev, fn) => fn(prev), Def);

// const ExportAudio = Def;
export default Spatialize;