import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'unistore/src/integrations/react';
import { actions } from '../store';
import titleText from '../util/audioFileTitleText';

import classNames from 'classnames';
import Dropzone from 'react-dropzone';
import { createConfirmation } from 'react-confirm';
import AudioImporter from '../util/media/AudioImporter';
import getAudioFileId from '../util/getAudioFileId';
import {
	saveAudioFile,
	loadAudioFile,
	removeAudioFile,
	getAudioIds,
	on as listenAudioStorage,
	off as unlistenAudioStorage
} from '../engine/audioStorage';
import { findClips } from '../store/findClip';
import RecordAudioDialog from './RecordAudioDialog';

/*
Theme/Style stuff
*/
import withStyles from '@material-ui/core/styles/withStyles';
import withLayout from './hoc/withLayout';

/*
Material UI components
*/
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import AudioFileRow from './AudioFileRow';
import DraggableAudioFileRow from './DraggableAudioFileRow';
import ConfirmationDialog from './ConfirmationDialog';
import ProgressDialog from './ProgressDialog';
import DialogContentText from '@material-ui/core/DialogContentText';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Button from '@material-ui/core/Button';
import FileMusicIcon from 'mdi-material-ui/FileMusic';
import DeleteIcon from '@material-ui/icons/Delete';
import PlaylistAddIcon from '@material-ui/icons/PlaylistAdd';
import MicIcon from '@material-ui/icons/Mic';

const supportsRecording = !!navigator.mediaDevices;

const confirm = createConfirmation(ConfirmationDialog);

const styles = theme => ({
	dropZone: {
		display: 'flex',
		flex: 1,
		flexDirection: 'column',
		overflow: 'hidden',
		userSelect: 'none',
		minHeight: 0,
		minWidth: 0
	},
	tableContainer: {
		flex: 1,
		overflow: 'auto'
	},
	compact: {},
	appBar: {
		zIndex: 'auto'
	},
	toolbar: {
		justifyContent: 'flex-end',
		backgroundColor: theme.palette.background.paper,
		'& > button': {
			margin: theme.spacing(1)
		},
		'$compact &': {
			paddingBottom: 6
		}
	},
	rightIcon: {
		marginLeft: theme.spacing(1)
	},
	em: {
		color: theme.palette.text.primary
	}
});

/*
todo: more complex sorting by different keys. ascending, descending
*/
function sortAudioFiles(a, b) {
	a = titleText(a).toLowerCase();
	b = titleText(b).toLowerCase();
	return a < b ? -1 : 1;
}

/*
Workaround for react-dropzone bug
https://github.com/react-dropzone/react-dropzone/issues/853
*/
const dropZoneBugWorkaround = (reactDropZoneProps) =>
	({
		...reactDropZoneProps,
		onClick: () => {
			// do nothing
		}
	});

const Def = class AudioLibrary extends React.Component {
	static propTypes = {
		classes: PropTypes.object.isRequired,
		project: PropTypes.object,
		layout: PropTypes.string.isRequired,
		deleteClips: PropTypes.func.isRequired,
		setConfig: PropTypes.func.isRequired,
		addClip: PropTypes.func.isRequired
	}

	state = {
		audioFiles: [],
		importing: false,
		recording: false,
		progress: 0
	}

	openMicRecord = () => {
		this.setState({
			recording: true
		});
	}

	closeMicRecord = () => {
		this.setState({
			recording: false
		});
	}

	loadAudioFiles = () => {
		getAudioIds().then(ids => {
			Promise.all(ids.map(loadAudioFile)).then(audioFiles => {
				audioFiles.sort(sortAudioFiles);
				this.setState({ audioFiles });
			});
		});
	}

	onDelete = id => {
		const audioFile = this.state.audioFiles.find(file => file.id === id);
		if (!audioFile) {
			return;
		}

		const title = audioFile.metadata && audioFile.metadata.title || audioFile.file.name;
		const clips = findClips(this.props.project, clip => clip.sourceId === id);
		const inUseWarning = clips && clips.length ? <React.Fragment>It is in use in your project timeline. </React.Fragment> : null;

		const confirmation = <DialogContentText>Are you sure you want to delete <em className={this.props.classes.em}>{title}</em>? {inUseWarning}This cannot be undone.</DialogContentText>;
		confirm({
			confirmation,
			options: {
				no: 'Cancel',
				yes: 'Delete'
			}
		}).then(() => {
			removeAudioFile(id).then(() => {
				const audioFiles = this.state.audioFiles.filter(file => file.id !== id);
				this.setState({ audioFiles });

				// remove any clips that use this audio file
				this.props.deleteClips(clips.map(clip => clip.id));
			});
		});
	}

	onDrop = async (acceptedFiles/*, rejectedFiles*/) => {
		if (!acceptedFiles.length) {
			return;
		}

		this.setState({
			importing: true
		});

		const audioFiles = [...this.state.audioFiles];
		for (let i = 0; i < acceptedFiles.length; i++) {
			const file = acceptedFiles[i];
			const importer = new AudioImporter(file);
			const result = await importer.load(progress => {
				// todo: Allow aborting?
				this.setState({
					progress: (progress / 100 + i) / acceptedFiles.length
				});
			});

			const id = await getAudioFileId(file);
			const audioFile = await saveAudioFile(id, result);

			// eliminate duplicates
			for (let i = 0; i < audioFiles.length; i++) {
				const file = audioFiles[i];
				if (file.id === audioFile.id) {
					audioFiles.splice(i, 1);
					break;
				}
			}

			audioFiles.push(audioFile);
		}

		audioFiles.sort(sortAudioFiles);
		this.setState({
			audioFiles,
			importing: false,
			progress: 0
		});

		/*
		If there is an error, we may try native decoding?
		*/
	}

	menuItems = [
		{
			key: 'delete',
			label: 'Delete File',
			icon: <DeleteIcon/>,
			onClick: id => this.onDelete(id)
		},
		{
			key: 'add',
			label: 'Add to Timeline',
			icon: <PlaylistAddIcon/>,
			onClick: id => {
				this.props.addClip(id);
				this.props.setConfig({
					activeScreen: 'timeline'
				});
			}
		}
	];

	componentDidMount() {
		listenAudioStorage('update', this.loadAudioFiles);
		this.loadAudioFiles();
	}

	compnentWillUnmount() {
		unlistenAudioStorage('update', this.loadAudioFiles);
	}

	render() {
		const { classes, layout } = this.props;

		const {
			audioFiles,
			importing,
			recording,
			progress
		} = this.state;

		/*
		todo:
		- scroll table (virtualized?)
		- enable click on empty space below table and/or show a button
		- replace table with prompt while dragging
		- make rows draggable to timeline
		- style table (very dense)
		- album cover icons
		- give each row a pop-up menu
		  - more info
		  - download original file
		  - play preview
		  - delete
		- remove delete icon button
		- record audio button (if available)
		- status bar
		  - total number and size of files
		  - free space available
		  - persistence of storage
		- allow multiple files dragged
		- warn about over-writing
		- search by text
		*/
		const isCompact = layout === 'compact';
		const AudioFile = isCompact ? AudioFileRow : DraggableAudioFileRow;
		return <React.Fragment>
			<Dropzone
				accept={['audio/*', 'x-audio/*']}
				onDrop={this.onDrop}
				onDragEnter={null}
				noClick={false /* temporary bug workaround */}
				noKeyboard
				minSize={1}
				maxSize={/*this.props.maxSize || */Infinity}
				multiple={true}
			>
				{({getRootProps, getInputProps, isDragAccept, isDragReject, open}) =>
					<div
						{...dropZoneBugWorkaround(getRootProps({}))}
						className={classNames(classes.dropZone, {
							[classes.dropZoneRejected]: isDragReject,
							[classes.dropzoneAccepted]: isDragAccept,
							[classes.compact]: isCompact
						})}
					>
						<div className={classes.tableContainer}>
							<Table className={classes.table} size="small">
								{/*<TableHead className={classNames(classes.tableSection, classes.tableHead)}>
									<TableRow className={classes.tr}>
										<TableCell className={classes.colTitle}><Typography>Name</Typography></TableCell>
										<TableCell align="right" className={classes.colDuration}><TimeIcon height={16}/></TableCell>
										<TableCell className={classes.colArtist}><Typography>Artist</Typography></TableCell>
										<TableCell className={classes.colAlbum}><Typography>Album</Typography></TableCell>
										<TableCell/>
									</TableRow>
								</TableHead>*/}
								<TableBody className={classNames(classes.tableSection, classes.tableBody)}>
									{audioFiles.map(audioFile =>
										<AudioFile key={audioFile.id} audioFile={audioFile} menuItems={this.menuItems}/>
									)}
								</TableBody>
							</Table>
						</div>
						<AppBar position="static" component="div" className={classes.appBar}>
							<Toolbar className={classes.toolbar} variant="dense">
								<Button
									variant="contained"
									size="small"
									color="primary"
									data-tour-id="import-audio-file"
									onClick={open}
								>
									Import
									<FileMusicIcon className={classes.rightIcon} fontSize="small"/>
								</Button>
								{supportsRecording ? <Button
									variant="contained"
									size="small"
									color="primary"
									data-tour-id="record-audio"
									onClick={this.openMicRecord}
								>
									Record
									<MicIcon className={classes.rightIcon} fontSize="small"/>
								</Button> : null}
							</Toolbar>
						</AppBar>
						<input {...getInputProps()} />
					</div>
				}
			</Dropzone>
			{importing ?
				<ProgressDialog progress={progress} title="Importing files..." id="import-file-progress"/> :
				null}
			{recording ?
				<RecordAudioDialog
					id="record-audio"
					open={true}
					onClose={this.closeMicRecord}
					fullScreen={layout === 'compact'}
				/> :
				null}
		</React.Fragment>;
	}
};

const AudioLibrary = withLayout(withStyles(styles)(
	connect(['project'], actions)(Def)
));

export default AudioLibrary;