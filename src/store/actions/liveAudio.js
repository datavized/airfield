import liveEngine from '../../engine/live';
import { store } from '../index';

export function pause() {
	liveEngine.pause();
}

export function play() {
	const { canPlay } = store.getState();
	if (canPlay) {
		liveEngine.play()
			.catch(error => {
				console.warn('not playing 😢', error);
			});
	}
}

export function setCurrentTime(state, currentTime) {
	liveEngine.currentTime = Math.min(currentTime, liveEngine.duration || 0);
}

const playBlockers = new Set();
export function blockPlayback(state, symbol) {
	if (symbol) {
		playBlockers.add(symbol);
	}

	pause();
	return {
		canPlay: !playBlockers.size
	};
}

export function releasePlayback(state, symbol) {
	playBlockers.delete(symbol);
	return {
		canPlay: !playBlockers.size
	};
}