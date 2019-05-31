import React from 'react';
// import getAudioFileId from '../util/getAudioFileId';
import {
	saveAudioFile
} from '../engine/audioStorage';
import setStateFromEvent from '../util/setStateFromEvent';
import MicrophoneRecorder from '../util/mic/MicrophoneRecorder';
import Chunkifier from '../util/media/Chunkifier';

/*
Material UI components
*/
import PropTypes from 'prop-types';
import withStyles from '@material-ui/core/styles/withStyles';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import TextField from '@material-ui/core/TextField';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Button from '@material-ui/core/Button';
import Fab from '@material-ui/core/Fab';

import MicIcon from '@material-ui/icons/Mic';
import StopIcon from '@material-ui/icons/Stop';
import IconButton from './IconButton';

import ReactMic from 'react-mic-record/src';

const dateFormat = new Intl.DateTimeFormat(navigator.languages, {
	year: 'numeric',
	month: 'short',
	day: 'numeric',
	hour: 'numeric',
	minute: 'numeric'
});

const styles = theme => ({
	dialog: {
		minWidth: '50%',
		maxWidth: '80%',
		minHeight: '40%',
		maxHeight: '80%'
	},
	fullScreen: {
		maxWidth: '100%',
		maxHeight: '100%',
		'& $title': {
			paddingTop: theme.spacing.unit,
			paddingBottom: theme.spacing.unit
		}
	},
	title: {},
	formControl: {
		display: 'flex',
		margin: theme.spacing.unit,
		'&:first-child': {
			marginLeft: 0
		}
	},
	recordControls: {
		display: 'flex',
		flexDirection: 'row',
		margin: `${theme.spacing.unit}px 0`
	},
	recordButtonSection: {
		minWidth: 120,
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		'& > *': {
			margin: theme.spacing.unit
		}
	},
	visualizerContainer: {
		flex: 1,
		alignSelf: 'center'
	},
	mic: {
		maxWidth: '100%'
	}
});

const autoFileName = () => 'Recorded Audio ' + dateFormat.format(new Date());

const Def = class RecordAudioDialog extends React.Component {
	static propTypes = {
		classes: PropTypes.object.isRequired,
		theme: PropTypes.object.isRequired,
		open: PropTypes.bool,
		onClose: PropTypes.func.isRequired
	}

	state = {
		devices: [],
		deviceId: '',
		stream: null,
		loaded: false,
		recording: false,
		waiting: false,
		result: null,
		fileName: '',
		error: ''
	}

	reactMic = null
	recorder = null
	chunkifier = null
	audioContext = null

	onStartMic = stream => {
		this.setState({
			stream,
			error: ''
		});
		this.updateDeviceList();
	}

	startRecord = () => {
		const {
			recording,
			waiting,
			stream
		} = this.state;
		if (!recording && !waiting && this.reactMic && stream) {
			const audioTracks = stream.getAudioTracks();
			const audioTrack = audioTracks && audioTracks[0];
			const settings = audioTrack && audioTrack.getSettings && audioTrack.getSettings();
			const sampleRate = settings && settings.sampleRate ||
				this.reactMic.audioContext.audioCtx.sampleRate ||
				44100;

			this.recorder = new MicrophoneRecorder(stream, {
				sampleRate
			});

			/*
			Chrome ignores sample rate, so we have to read it back to find what it actually is
			https://bugs.chromium.org/p/chromium/issues/detail?id=432248&q=samplerate&colspec=ID%20Pri%20M%20Stars%20ReleaseBlock%20Component%20Status%20Owner%20Summary%20OS%20Modified
			*/
			this.chunkifier = new Chunkifier({
				channelsPerFrame: 1,
				sampleRate: this.recorder.sampleRate
			});
			this.recorder.on('data', this.chunkifier.add);
			this.recorder.start();
			this.setState({
				recording: true
			});
		}
	}

	stopRecord = async () => {
		if (this.state.recording && this.recorder) {
			this.setState({
				recording: false,
				waiting: true
			});
			await this.recorder.destroy();

			const result = this.chunkifier.close();
			this.chunkifier = null;

			const sampleRate = this.recorder.sampleRate;
			this.setState({
				waiting: false,
				result: {
					...result,
					format: {
						channelsPerFrame: 1,
						sampleRate
					}
				}
			});
		}
	}

	onMicError = error => {
		console.warn('Unable to access microphone', error);
		this.setState({
			error: 'Unable to access microphone'
		});
	}

	onSave = async () => {
		const { result, fileName, waiting } = this.state;
		if (result && !waiting) {
			this.setState({
				waiting: true
			});
			const name = fileName || autoFileName() + '.wav';

			// todo: save file
			// const id = await getAudioFileId(file);

			const id = 'mic-record-' + Date.now() + '-' + Math.floor(Math.random() * 1e8);
			await saveAudioFile(id, {
				...result,
				file: {
					name
				}
			});
			this.setState({
				waiting: false
			});
			this.props.onClose();
		}
	}

	cancel = () => {
		if (this.state.recording) {
			this.stopRecord();
		} else if (this.props.onClose) {
			this.props.onClose();
		}
	}

	gotDevices = allDevices => {
		const devices = allDevices.filter(device => device.kind === 'audioinput') || [];
		const deviceId = this.state.deviceId && devices.find(device => device.deviceId === this.state.deviceId) ?
			this.state.deviceId :
			devices.length ? devices[0].deviceId : '';

		const state = {
			devices
		};
		if (deviceId !== this.state.deviceId) {
			state.deviceId = deviceId;
		}
		this.setState(state);
	}

	updateDeviceList = () => {
		const promise = navigator.mediaDevices.enumerateDevices();
		promise.then(this.gotDevices);
		return promise;
	}

	handleChangeValue = setStateFromEvent(this)

	componentDidMount() {
		/*
		todo: this may trigger a warning if it returns after
		this component has unmounted.
		*/
		Promise.all([
			this.updateDeviceList()
		]).then(() => {
			this.setState({
				loaded: true
			});
		});
		if (navigator.mediaDevices.addEventListener) {
			navigator.mediaDevices.addEventListener('devicechange', this.updateDeviceList);
		} else {
			// safari!!
			navigator.mediaDevices.ondevicechange = this.updateDeviceList;
		}
	}

	componentWillUnmount() {
		this.stopRecord();

		if (navigator.mediaDevices.removeEventListener) {
			navigator.mediaDevices.removeEventListener('devicechange', this.updateDeviceList);
		} else {
			// safari!!
			navigator.mediaDevices.ondevicechange = null;
		}
	}

	render() {
		const {
			classes,
			theme,
			open,
			...dialogProps
		} = this.props;

		const {
			recording,
			devices,
			deviceId,
			loaded,
			waiting,
			result,
			error
		} = this.state;

		const hasDevices = devices.length > 0;
		const disabled = !hasDevices || !loaded || waiting || !!error;

		return <Dialog
			{...dialogProps}
			open={open !== false}
			onClose={this.close}
			keepMounted={true}
			disableBackdropClick={recording}
			classes={{
				paper: classes.dialog,
				paperFullScreen: classes.fullScreen
			}}
			aria-labelledby="record-audio-dialog-title"
			aria-describedby="record-audio-dialog-description"
		>
			<DialogTitle id="record-audio-dialog-title" className={classes.title}>Record Audio</DialogTitle>
			<DialogContent>
				{/*<DialogContentText id="record-audio-dialog-description">
					Record audio
				</DialogContentText>*/}
				<FormControl className={classes.formControl}>
					<InputLabel htmlFor="record-select-device" shrink={hasDevices && !!deviceId}>Microphone</InputLabel>
					<Select
						value={hasDevices ? deviceId : ''}
						onChange={this.handleChangeValue}
						name="deviceId"
						disabled={disabled || devices.length <= 1}
						inputProps={{
							id: 'record-select-device',
							name: 'deviceId'
						}}
					>
						{hasDevices ?
							devices.map(({deviceId, label}, i) => <MenuItem key={deviceId} value={deviceId}>{label || 'Mic #' + (i + 1)}</MenuItem>) :
							<MenuItem value=""><em>None Available</em></MenuItem>
						}
					</Select>
					<TextField
						id="record-audio-name"
						label="Name"
						name="fileName"
						className={classes.textField}
						value={this.state.fileName}
						onChange={this.handleChangeValue}
						placeholder={autoFileName()}
						margin="normal"
						InputLabelProps={{
							shrink: true
						}}
					/>
				</FormControl>
				<div className={classes.recordControls}>
					<div className={classes.visualizerContainer}><ReactMic
						width={400}
						constraints={deviceId ? {
							audio: {
								deviceId: {
									exact: deviceId
								}
							}
						} : null}
						mimeType="audio/wav"
						ref={ref => this.reactMic = ref}
						save={false} // set to true if you want to save
						className={classes.mic} // provide css class name
						onStartMic={this.onStartMic}
						onError={this.onMicError}
						strokeColor={theme.palette.secondary.main} // sound wave color
						backgroundColor={theme.palette.background.default} // background color
						keepMicOpen={true}
					/></div>
					{recording ?
						<div className={classes.recordButtonSection}>
							<IconButton
								component={Fab}
								color="secondary"
								label="Stop"
								onClick={this.stopRecord}
							>
								<StopIcon />
							</IconButton>
						</div> :
						<div className={classes.recordButtonSection}>
							<IconButton
								component={Fab}
								color="secondary"
								label="Record"
								onClick={this.startRecord}
								disabled={disabled}
							>
								<MicIcon />
							</IconButton>
						</div>
					}
				</div>
				{error && <DialogContentText variant="subtitle1" color="error">{error}</DialogContentText>}
			</DialogContent>
			<DialogActions>
				<Button onClick={this.cancel} color="secondary">
					Cancel
				</Button>
				<Button onClick={this.onSave} color="secondary" autoFocus disabled={recording || !result || waiting || !!error}>
					Save
				</Button>
			</DialogActions>
		</Dialog>;
	}
};

const RecordAudioDialog = withStyles(styles, {withTheme: true})(Def);
export default RecordAudioDialog;