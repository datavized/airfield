import React from 'react';
import PropTypes from 'prop-types';
import dragLayer from 'react-dnd/lib/esm/DragLayer';

/*
Theme/Style stuff
*/
import withStyles from '@material-ui/core/styles/withStyles';

/*
Material UI components
*/
import AlbumCover from './AlbumCover';

function collect(monitor) {
	const item = monitor.getItem();
	return {
		id: item && item.sourceId,
		currentOffset: monitor.getSourceClientOffset(),
		isDragging: monitor.isDragging()
	};
}

const styles = () => ({
	preview: {
		position: 'absolute',
		top: 0,
		left: 0,
		opacity: 0.8,
		zIndex: 99999999,
		userSelect: 'none',
		pointerEvents: 'none'
	}
});

const Def = ({isDragging, id, classes, currentOffset}) => {
	if (!isDragging || !currentOffset) {
		return null;
	}

	const { x, y } = currentOffset;
	const style = {
		transform: `translate(${x}px, ${y}px)`
	};
	return <AlbumCover
		id={id}
		className={classes.preview}
		style={style}
	/>;
};

Def.propTypes = {
	classes: PropTypes.object.isRequired,
	isDragging: PropTypes.bool.isRequired,
	currentOffset: PropTypes.object.isRequired,
	id: PropTypes.string
};

const AudioFileRowDragPreview = dragLayer(collect)(
	withStyles(styles)(Def)
);

export default AudioFileRowDragPreview;