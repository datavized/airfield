import AudioPlayer from './index';
import { AudioContext as StandardizedAudioContext } from 'standardized-audio-context';

const ENABLE_STREAM_DESTINATION = false;

const AudioContext = window.AudioContext || StandardizedAudioContext;
const audioContext = new AudioContext();
const destination = ENABLE_STREAM_DESTINATION && audioContext.createMediaStreamDestination ?
	audioContext.createMediaStreamDestination() :
	audioContext.destination;

const liveEngine = new AudioPlayer({
	audioContext,
	destination
});

let audioElement = null;
if (ENABLE_STREAM_DESTINATION && destination.stream) {
	audioElement = document.createElement('audio');
	audioElement.srcObject = destination.stream;
	liveEngine.on('play', () => audioElement.play());
	liveEngine.on('pause', () => audioElement.pause());
}

export { audioElement };
export default liveEngine;
