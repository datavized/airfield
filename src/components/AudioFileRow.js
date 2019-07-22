import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import formatTime from '../util/formatTime';

/*
Theme/Style stuff
*/
import withStyles from '@material-ui/core/styles/withStyles';

/*
Material UI components
*/
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import AlbumCover from './AlbumCover';
import ContextMenu from './ContextMenu';
import MoreVertIcon from '@material-ui/icons/MoreVert';

const identity = x => x;

const styles = theme => ({
	tr: {
		display: 'grid',
		gridTemplateColumns: '42fr 60px 32fr 26fr 48px',
		height: 42,
		alignItems: 'center',

		'& > th, & > td': {
			display: 'flex',
			minWidth: 0,
			alignItems: 'center',
			height: 38,
			padding: `2px ${theme.spacing(12)}px`,

			'& > p': {
				textOverflow: 'ellipsis',
				whiteSpace: 'nowrap',
				overflow: 'hidden'
			}
		},
		'& > $colTitle': {
			paddingLeft: 2
		}
	},
	albumCover: {},
	draggable: {
		'& $albumCover': {
			cursor: 'pointer'
		}
	},
	colDuration: {
		'& > svg': {
			width: 16,
			height: 16
		}
	},
	colDelete: {
		justifyContent: 'center'
	},
	colTitle: {
		'& > p:not(:first-child)': {
			paddingLeft: theme.spacing(1)
		}
	}
});

const Cell = ({children, padding, ...props}) =>
	<TableCell
		{...props}
		padding={!children ? 'none' : padding || 'default'}
	>
		{ children && <Typography>{children}</Typography> }
	</TableCell>;

Cell.propTypes = {
	children: PropTypes.oneOfType([
		PropTypes.arrayOf(PropTypes.node),
		PropTypes.node
	]),
	padding: PropTypes.string
};

const Def = ({audioFile, menuItems, classes, connectDragSource, ...props}) => {
	const { id, duration, metadata } = audioFile;
	const { artist = '', album = '' } = metadata || {};
	const titleText = metadata && metadata.title || audioFile.file.name;

	const makeDraggable = connectDragSource || identity;

	return <TableRow
		className={classNames(classes.tr, {
			[classes.draggable]: !!connectDragSource
		})}
		{...props}
	>
		<TableCell className={classes.colTitle} title={titleText}>
			{makeDraggable(<div className={classes.albumCover}><AlbumCover id={id}/></div>)}
			<Typography>{titleText}</Typography>
		</TableCell>
		<Cell align="right" className={classes.colDuration}>{formatTime(duration, 2)}</Cell>
		<Cell className={classes.colArtist} title={artist}>{artist}</Cell>
		<Cell className={classes.colAlbum} title={album}>{album}</Cell>
		{/* add genre? */}
		<TableCell className={classes.colDelete}>
			<ContextMenu
				id={id}
				menuItems={menuItems}
				menuProps={{
					disableAutoFocusItem: true
				}}
				icon={<MoreVertIcon/>}
			/>
		</TableCell>
	</TableRow>;
};

Def.propTypes = {
	classes: PropTypes.object.isRequired,
	audioFile: PropTypes.object.isRequired,
	selectedId: PropTypes.string.isRequired,
	menuItems: PropTypes.arrayOf(PropTypes.object).isRequired,
	connectDragSource: PropTypes.func
};

Def.defaultProps = {
};

const AudioFileRow = withStyles(styles)(Def);

export default AudioFileRow;