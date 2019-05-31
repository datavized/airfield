import React from 'react';
import PropTypes from 'prop-types';
import dragSource from 'react-dnd/lib/esm/DragSource';
import titleText from '../util/audioFileTitleText';

/*
Material UI components
*/
import AudioFileRow from './AudioFileRow';

// Only `beginDrag` function is required.
const audioFileSource = {
	isDragging(props, monitor) {
		// If your component gets unmounted while dragged
		// (like a card in Kanban board dragged between lists)
		// you can implement something like this to keep its
		// appearance dragged:
		return monitor.getItem().id === props.audioFile.id;
	},

	beginDrag({audioFile}/*, monitor, component*/) {
		// Return the data describing the dragged item
		const {
			file,
			duration,
			id,
			format
		} = audioFile;

		return {
			start: 0,
			offset: 0,
			duration,
			name: titleText(audioFile),
			sourceId: id,
			source: {
				duration,
				fileName: file.name,
				channels: format.channelsPerFrame
			}
		};
	}
};


function collect(connect/*, monitor*/) {
	return {
		// Call this function inside render()
		// to let React DnD handle the drag events:
		connectDragSource: connect.dragSource()
		// You can ask the monitor about the current drag state:
		// isDragging: monitor.isDragging()
	};
}

const Def = ({/*isDragging,*/ connectDragSource, ...props}) => {
	return <AudioFileRow {...props} connectDragSource={connectDragSource}/>;
};

Def.propTypes = {
	connectDragSource: PropTypes.func.isRequired
};

const DraggableAudioFileRow = dragSource('audio-file', audioFileSource, collect)(Def);

export default DraggableAudioFileRow;