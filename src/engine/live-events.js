import liveEngine from './live';
import { store, actions } from '../store';
import { mapActions } from 'unistore/src/util';
import num from '../util/num';

store.subscribe(state => {
	liveEngine.setProject(state.project);
	liveEngine.volume = num(state.volume, 1);
});
liveEngine.setProject(store.getState().project);

liveEngine.on('play', () => {
	store.setState({
		paused: false
	});
});

liveEngine.on('pause', () => {
	store.setState({
		paused: true
	});
});

const boundActions = mapActions(actions, store);
const loadingPlayBlocker = Symbol();
const updateLoaded = () => {
	const canPlay = liveEngine.canPlay;
	if (canPlay) {
		boundActions.releasePlayback(loadingPlayBlocker);
	} else {
		boundActions.blockPlayback(loadingPlayBlocker);
	}

	store.setState({
		canPlay
	});
};

// liveEngine.on('loading', updateLoaded);
// liveEngine.on('loaded', updateLoaded);
// delay a tiny bit so we don't have to see a quick flash of button change
liveEngine.on('waiting', () => setTimeout(updateLoaded, 250));
liveEngine.on('unload', () => setTimeout(updateLoaded, 250));
liveEngine.on('canplay', () => setTimeout(updateLoaded, 250));

liveEngine.on('timeupdate', () => {
	store.setState({
		// todo: make an action function to query this?
		currentTime: liveEngine.paused ?
			liveEngine.currentTime :
			Math.round(liveEngine.currentTime * 12) / 12
	});
});
