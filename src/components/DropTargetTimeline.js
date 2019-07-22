import React from 'react';
import PropTypes from 'prop-types';
import { DropTarget as dropTarget } from 'react-dnd/dist/esm/decorators/DropTarget';
import { connect } from 'unistore/src/integrations/react';
import { actions } from '../store';
import validateClipChanges from '../util/validateClipChanges';
import { TRACK_HEIGHT } from '../constants';

/*
Material UI components
*/
import Timeline from './Timeline';

const audioFileTarget = {
	drop(props, monitor, component) {
		if (component.state.editingClip) {
			props.updateClip(component.state.editingClip);
		}
	}
};

function collect(connect, monitor) {
	const item = monitor.getItem();
	const isOver = monitor.isOver({ shallow: false });
	const clientOffset = isOver ? monitor.getClientOffset() : null;

	return {
		connectDropTarget: connect.dropTarget(),
		isOver,
		item,
		clientOffset
	};
}

const Def = class DropTargetTimeline extends React.Component {
	targetElement = null

	state = {
		editingClip: null
	}

	onDragRef = ref => {
		this.targetElement = ref;
	}

	componentDidUpdate(prevProps) {
		const {
			item,
			clientOffset,
			isOver,
			project,
			config
		} = this.props;

		const prevOffset = prevProps.clientOffset;
		let editingClip = this.state.editingClip;

		if (!isOver || !clientOffset || !item || !this.targetElement) {
			editingClip = null;
		} else if (item !== prevProps.item || !prevOffset || prevOffset.x !== clientOffset.x || prevOffset.y !== clientOffset.y) {
			const {
				timeScale,
				leftVisibleTime
			} = config;
			const { targetElement } = this;

			const targetRect = targetElement.getBoundingClientRect();
			const x = clientOffset.x - targetRect.x;
			const y = clientOffset.y - targetRect.y + targetElement.scrollTop;

			// adjust so center of clip is at left of icon
			const start = leftVisibleTime + (x - 16) / timeScale;
			const trackIndex = Math.min(Math.floor(y / TRACK_HEIGHT), project.tracks && project.tracks.size || 0);
			const track = project.trackOrder[trackIndex] || '';

			editingClip = validateClipChanges({
				...item,
				start,
				track
			}, project);

			// don't do it if the correction is too far away
			if (editingClip && Math.abs(editingClip.start - start) > 150 / timeScale) {
				editingClip = null;
			}
		}

		if (editingClip !== this.state.editingClip) {
			this.setState({
				editingClip
			});
		}
	}

	render() {
		const {
			connectDropTarget,
			...props
		} = this.props;

		return <Timeline
			{...props}
			connectDropTarget={connectDropTarget}
			dragRef={this.onDragRef}
			editingClip={this.state.editingClip}
		/>;
	}
};

Def.propTypes = {
	connectDropTarget: PropTypes.func.isRequired,
	item: PropTypes.object,
	clientOffset: PropTypes.object,
	isOver: PropTypes.bool,
	project: PropTypes.object,
	config: PropTypes.object
};

const DropTargetTimeline = [
	connect(['project', 'config'], actions),
	dropTarget('audio-file', audioFileTarget, collect)
].reduceRight((prev, fn) => fn(prev), Def);


export default DropTargetTimeline;