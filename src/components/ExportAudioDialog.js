/* global GOOGLE_API_KEY, GOOGLE_CLIENT_ID */
import React from 'react'; // import classNames from 'classnames';
import { connect } from 'unistore/react';
import { actions } from '../store';
import ExportEngine from '../engine/ExportEngine';
import setStateFromEvent from '../util/setStateFromEvent';
import importScript from '../util/importScript';
import { saveAs } from 'file-saver';
import GoogleDriveUploader from '../util/GoogleDriveUploader';

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
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Button from '@material-ui/core/Button';
import LinearProgress from '@material-ui/core/LinearProgress';

const styles = theme => ({
	dialog: {
		minWidth: '50%',
		maxWidth: '80%',
		minHeight: '40%',
		maxHeight: '80%'
	},
	formControl: {
		margin: theme.spacing(1),
		'&:first-child': {
			marginLeft: 0
		}
	}
});

// Array of API discovery doc URLs for APIs used by the quickstart
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
// https://developers.google.com/identity/protocols/googlescopes#drivev3
const SCOPES = 'https://www.googleapis.com/auth/drive';

const bitRates = [
	64,
	128,
	192,
	320
];
const SAMPLE_RATE = 44100; // todo: make configurable
const DEFAULT_CHANNEL_MODE = 'stereo';
const isIOS = /(iPad|iPhone|iPod)/g.test(navigator.userAgent);

const formatCapabilities = {
	wav: {
		bitRate: false,
		channelModes: ['mono', 'stereo', 'ambisonic']
	},
	mp3: {
		bitRate: true,
		channelModes: ['stereo']
	}
};
const modeChannelCount = {
	mono: 1,
	stereo: 2,
	ambisonic: 4
};

// mac seems to use 1000, not 1024
const KB_DIVIDER = 1000;

const kbFormat = new Intl.NumberFormat(navigator.language, {
	minimumFractionDigits: 0,
	maximumFractionDigits: 0
});
const mbFormat = new Intl.NumberFormat(navigator.language, {
	minimumFractionDigits: 0,
	maximumFractionDigits: 1
});

function formatFileSize(bytes) {
	if (bytes < 1000) {
		return kbFormat.format(bytes) + 'B';
	}

	if (bytes < 1e6) {
		return kbFormat.format(bytes / KB_DIVIDER) + 'KB';
	}

	return mbFormat.format(bytes / (KB_DIVIDER * KB_DIVIDER)) + 'MB';
}

const dateFormat = new Intl.DateTimeFormat(navigator.languages, {
	year: 'numeric',
	month: 'short',
	day: 'numeric',
	hour: 'numeric',
	minute: 'numeric'
});
const autoFileName = () => 'Exported Audio ' + dateFormat.format(new Date());

const Def = class ExportAudioDialog extends React.Component {
	static propTypes = {
		classes: PropTypes.object,
		open: PropTypes.bool,
		onClose: PropTypes.func.isRequired,
		project: PropTypes.object,
		blockPlayback: PropTypes.func.isRequired,
		releasePlayback: PropTypes.func.isRequired
	}

	state = {
		exporting: false,
		format: 'wav',
		bitRate: 128,
		progress: 0,
		channelMode: DEFAULT_CHANNEL_MODE,
		error: '',
		googleAuth: false,
		googleEnabled: false
	}

	playBlockClaim = Symbol()
	uploader = null

	engine = null

	onProgress = () => {
		const progress = this.engine && this.engine.progress || 0;
		this.setState({ progress });
	}

	save = encodedBlob => {
		// todo: report event to analytics
		saveAs(encodedBlob, autoFileName() + '.' + this.state.format);
		return {
			successMessage: 'File saved.'
		};
	}

	upload = file => {
		return new Promise((resolve, reject) => {
			// todo: report event to analytics
			this.uploader = new GoogleDriveUploader({
				file,
				metadata: {
					name: autoFileName()
				},
				chunkSize: 256 * 1024 * 4,
				onComplete: response => {
					const resultState = {
						successMessage: 'File saved to Google Drive'
					};
					try {
						const result = JSON.parse(response);
						const { id } = result;
						if (id) {
							resultState.successLink = `https://drive.google.com/open?id=${encodeURIComponent(id)}`;
						}
					} catch (e) {}
					resolve(resultState);
				},
				onError: e => {
					reject(new Error(e.message));
				}
			});
			this.uploader.upload();
		});
	}

	exportAudio = async saveCallback => {
		this.props.blockPlayback(this.playBlockClaim);

		const { format, bitRate } = this.state;

		const capabilities = formatCapabilities[format];
		const channelMode = capabilities.channelModes.indexOf(this.state.channelMode) >= 0 ?
			this.state.channelMode :
			DEFAULT_CHANNEL_MODE;

		const engine = new ExportEngine(this.props.project, {
			format,
			bitRate,
			sampleRate: SAMPLE_RATE,
			channelMode
		});
		this.engine = engine;

		engine.on('progress', this.onProgress);
		this.setState({
			error: '',
			exporting: true,
			progress: 0
		});

		let error = '';
		let result = null;
		try {
			const encodedBlob = await engine.start();
			if (encodedBlob) {
				let saveResponse = await saveCallback(encodedBlob);
				if (saveResponse instanceof Promise) {
					saveResponse = await saveResponse;
				}
				if (saveResponse && typeof saveResponse === 'object') {
					result = saveResponse;
				}
			}
		} catch (e) {
			// todo: report error to analytics
			if (e.name !== 'AbortError') {
				console.error('Error exporting audio', e, e.stack);
				error = 'Failed to export audio';
			}
		}

		engine.destroy();
		this.finish(error);

		if (!error && this.props.onClose) {
			this.props.onClose(result);
		}
	}

	finish = error => {
		if (this.uploader) {
			this.uploader.abort();
			this.uploader = null;
		}

		if (this.engine) {
			this.engine.destroy();
		}

		this.engine = null;
		this.props.releasePlayback(this.playBlockClaim);
		this.setState({
			error: typeof error === 'string' && error ? error : '',
			progress: 0,
			exporting: false
		});
	}

	cancel = () => {
		if (this.state.exporting) {
			this.finish();
		} else if (this.props.onClose) {
			this.props.onClose();
		}
	}

	// todo: save to persistent config
	handleChangeValue = setStateFromEvent(this)

	updateGoogleAuthStatus = googleAuth => {
		this.setState({
			googleAuth
		});
	}

	authorizeGoogle = () => {
		if (window.gapi && window.gapi.auth2) {
			window.gapi.auth2.getAuthInstance().signIn();
		}
	}

	signoutGoogle = () => {
		if (window.gapi && window.gapi.auth2) {
			window.gapi.auth2.getAuthInstance().signOut();
		}
	}

	componentDidMount() {
		importScript('https://apis.google.com/js/api.js').then(() => {
			const gapi = window.gapi;
			gapi.load('client:auth2', () => {
				gapi.client.init({
					apiKey: GOOGLE_API_KEY,
					clientId: GOOGLE_CLIENT_ID,
					discoveryDocs: DISCOVERY_DOCS,
					scope: SCOPES
				}).then(() => {
					const authInstance = gapi.auth2.getAuthInstance();
					authInstance.currentUser.listen(this.updateGoogleAuthStatus);
					this.setState({
						googleAuth: authInstance.currentUser.get(),
						googleEnabled: true
					});
				});
			});
		});
	}

	componentWillUnmount() {
		this.finish();
	}

	render() {
		const {
			classes,
			project,
			open
		} = this.props;

		const {
			exporting,
			error,
			progress,
			format,
			bitRate,
			googleAuth,
			googleEnabled
		} = this.state;

		const {
			duration
		} = project;

		const capabilities = formatCapabilities[format];
		const channelMode = capabilities.channelModes.indexOf(this.state.channelMode) >= 0 ?
			this.state.channelMode :
			DEFAULT_CHANNEL_MODE;
		const channelCount = modeChannelCount[channelMode];

		const fileSize = capabilities.bitRate ?
			2 * channelCount * SAMPLE_RATE * duration : // 16 bits per sample * channels
			channelCount * duration * bitRate * 1024 / 16;

		const googleIsSignedIn = !!googleAuth && googleAuth.isSignedIn();

		const content = exporting ?
			<div>
				<DialogContentText id="export-audio-dialog-description">
					Exporting project to audio file
				</DialogContentText>
				<LinearProgress
					variant="determinate"
					value={progress * 100}
				/>
			</div> :
			<div>
				<DialogContentText id="export-audio-dialog-description">
					Export project to audio file. Estimated file size: {formatFileSize(fileSize)}.
				</DialogContentText>
				{error && <DialogContentText variant="subtitle1" color="error">{error}</DialogContentText>}
				<div>
					<FormControl className={classes.formControl}>
						<InputLabel htmlFor="export-format">Format</InputLabel>
						<Select
							value={format}
							onChange={this.handleChangeValue}
							name="format"
							input={<Input id="export-format" />}
						>
							<MenuItem value="mp3">MP3</MenuItem>
							<MenuItem value="wav">Waveform (PCM)</MenuItem>
						</Select>
					</FormControl>
					{ capabilities.bitRate && <FormControl className={classes.formControl}>
						<InputLabel htmlFor="export-bit-rate">Bit Rate</InputLabel>
						<Select
							value={bitRate}
							onChange={this.handleChangeValue}
							name="bitRate"
							input={<Input id="export-bit-rate" />}
						>
							{bitRates.map(bitRate => <MenuItem value={bitRate} key={bitRate}>{bitRate} kbps</MenuItem>)}
						</Select>
					</FormControl> }
				</div>
				<div>
					<FormControl className={classes.formControl}>
						<InputLabel htmlFor="export-channel-mode">Mode</InputLabel>
						<Select
							value={channelMode}
							onChange={this.handleChangeValue}
							disabled={capabilities.channelModes.length <= 1}
							name="channelMode"
							input={<Input id="export-channel-mode" />}
						>
							{capabilities.channelModes.map(mode =>
								<MenuItem value={mode} key={mode}>{mode.charAt(0).toUpperCase() + mode.slice(1)}</MenuItem>
							)}
						</Select>
					</FormControl>
				</div>
				<Button onClick={googleIsSignedIn ? this.signoutGoogle : this.authorizeGoogle} color="secondary" variant="contained" disabled={!googleEnabled}>
					{ googleIsSignedIn ?
						`Sign out GDrive (${googleAuth.getBasicProfile().getEmail()})` :
						'Sign in to GDrive'
					}
				</Button>
			</div>;

		return <Dialog
			open={open !== false}
			onClose={this.close}
			keepMounted={true}
			disableBackdropClick={exporting}
			classes={{
				paper: classes.dialog
			}}
			aria-labelledby="export-audio-dialog-title"
			aria-describedby="export-audio-dialog-description"
		>
			<DialogTitle id="export-audio-dialog-title">Export Audio</DialogTitle>
			<DialogContent>
				{content}
			</DialogContent>
			<DialogActions>
				<Button onClick={this.cancel} color="secondary">
					Cancel
				</Button>
				{!isIOS && <Button onClick={() => this.exportAudio(this.save)} color="secondary" autoFocus disabled={exporting}>
					Export
				</Button>}
				{<Button onClick={() => this.exportAudio(this.upload)} color="secondary" autoFocus disabled={exporting || !googleIsSignedIn}>
					Export to GDrive
				</Button>}
			</DialogActions>
		</Dialog>;
	}
};

const ExportAudioDialog = withStyles(styles)(
	connect([
		'project'
	], actions)(Def)
);
// const ExportAudioDialog = Def;
export default ExportAudioDialog;