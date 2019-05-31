/* global APP_TITLE */
import React from 'react';
import PropTypes from 'prop-types';
// import { connect } from 'unistore/react';
import { connect } from 'unistore/src/integrations/react';
import { actions } from '../store';
import { SKIP_TIME } from '../constants';

/*
todo:
- this will probably require going through an audio element to work
  we'll need that for selecting output device anyway
- album artwork - default to app logo
*/

const actionHandlers = [
	'play',
	'pause',
	'seekbackward',
	'seekforward',
	'previoustrack',
	'nexttrack'
];

const { mediaSession } = navigator;

const Def = class MediaSession extends React.Component {
	static propTypes = {
		title: PropTypes.string.isRequired,
		artist: PropTypes.string.isRequired,
		album: PropTypes.string.isRequired,
		loading: PropTypes.bool,
		canPlay: PropTypes.bool,
		paused: PropTypes.bool,
		pause: PropTypes.func.isRequired,
		play: PropTypes.func.isRequired,
		setCurrentTime: PropTypes.func.isRequired,
		project: PropTypes.object,
		currentTime: PropTypes.number
	}

	static defaultProps = {
		title: APP_TITLE,
		artist: APP_TITLE,
		album: ''
	}

	resetHandlers = () => {
		if (mediaSession) {
			actionHandlers.forEach(handler => {
				mediaSession.setActionHandler(handler, null);
			});
		}
	}

	seekBackward = () => {
		const {
			currentTime,
			setCurrentTime
		} = this.props;

		setCurrentTime(Math.max(0, currentTime - SKIP_TIME));
	}

	seekForward = () => {
		const {
			currentTime,
			project,
			setCurrentTime
		} = this.props;

		if (project.duration - currentTime > SKIP_TIME) {
			setCurrentTime(currentTime + SKIP_TIME);
		}
	}

	rewind = () => {
		this.props.setCurrentTime(0);
	}

	componentDidUpdate() {
		if (mediaSession) {
			const {
				paused,
				title,
				artist,
				album
			} = this.props;

			// playback state
			mediaSession.playbackState = paused ? 'paused' : 'playing';

			// metadata
			const { metadata } = mediaSession;
			Object.assign(metadata, {
				title,
				artist,
				album
			});
		}
	}

	componentDidMount() {
		if (mediaSession) {
			mediaSession.metadata = new window.MediaMetadata({});
			mediaSession.playbackState = 'none';

			// attach event listeners
			this.resetHandlers();

			const {
				play,
				pause
			} = this.props;
			mediaSession.setActionHandler('play', play);
			mediaSession.setActionHandler('pause', pause);
			mediaSession.setActionHandler('seekbackward', this.seekBackward);
			mediaSession.setActionHandler('seekforward', this.seekForward);
			mediaSession.setActionHandler('previoustrack', this.rewind);
		}
	}

	componentWillUnMount() {
		if (mediaSession) {
			mediaSession.metadata = null;

			// remove event listeners
			this.resetHandlers();
		}
	}

	render() {
		return null;
	}
};

const MediaSession = connect([
	'currentTime',
	'paused',
	'canPlay'
], actions)(Def);

export default MediaSession;