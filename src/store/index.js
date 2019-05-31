/* global DEBUG */
import createStore from 'unistore';
import * as idb from 'idb-keyval';
import equal from '../util/equal';
import objectMap from '../util/objectMap';
import * as actionFunctions from './actions';
import { on as onAudioStorageEvent } from '../engine/audioStorage';
import * as persistence from './persistence';
import debounce from 'debounce';
// import defaultProject from './default-project.json';

const persistentKeys = [
	'project',
	'newProject',
	'config'
];

const defaultState = Object.assign({
	newProject: true,
	loading: true,
	canPlay: true,
	audioLoaded: false,
	currentTime: 0,
	paused: true,
	persistent: false,
	storageEstimate: null,
	// project: Object.assign({}, defaultProject)
	project: {
		tracks: new Map(),
		trackOrder: [],
		clips: new Map()
	},
	config: {
		selectedClipId: ''
	}
});

const initialState = {
	...defaultState,
	config: {
		showWelcome: true,
		showData: false,
		showTour: true,
		timeScale: 32,
		leftVisibleTime: 0,
		spatializeScale: 64
	}
};

const db = new idb.Store('app-state', 'app-state');

export const store = DEBUG ?
	require('unistore/devtools')(createStore(initialState)) :
	createStore(initialState);

let persistentState = initialState;
let requestedPersistence = false;

const updatePersistence = debounce(function (persistent) {
	if (DEBUG) {
		if (persistent) {
			console.log('Storage will not be cleared except by explicit user action');
		} else {
			console.log('Storage may be cleared by the UA under storage pressure.');
		}
	}
	store.setState({ persistent });
}, 5000);

const updateStorageEstimate = debounce(function (storageEstimate) {
	if (DEBUG) {
		if (storageEstimate) {
			const numberFormat = new Intl.NumberFormat();
			const {usage, quota} = storageEstimate;
			console.log(`Using ${numberFormat.format(usage)} out of ${numberFormat.format(quota)} bytes.`);
		} else {
			console.log('Storage estimate not available');
		}
	}
	store.setState({ storageEstimate });
}, 5000);

function requestPersistence() {
	persistence.estimate().then(updateStorageEstimate);
	if (requestedPersistence) {
		persistence.persisted().then(updatePersistence);
	} else {
		persistence.persist().then(updatePersistence);
		requestedPersistence = true;
	}
}

const saveState = debounce(async function (state) {
	const firstTime = persistentState.loading;
	let persistentChanges = false;
	for (let i = 0; i < persistentKeys.length; i++) {
		const key = persistentKeys[i];
		const prev = persistentState[key];
		const val = state[key];
		if (!equal(prev, val)) {
			await idb.set(key, val, db);
			persistentChanges = true;
		}
	}
	persistentState = state;
	if (persistentChanges && !firstTime) {
		requestPersistence();
	}
}, 500);

async function restoreState() {
	const newState = {
		loading: false
	};
	const keys = await idb.keys(db);
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		newState[key] = await idb.get(key, db);
	}

	// include any added config options
	const newConfig = newState.config;
	newState.config = {
		...initialState.config,
		...newConfig
	};

	store.setState(newState);
	store.subscribe(saveState);
	onAudioStorageEvent('add', requestPersistence);
	persistence.estimate().then(updateStorageEstimate);
	persistence.persisted().then(updatePersistence);
}

/*
todo:
https://github.com/developit/unistore/issues/3
*/
export const actions = store => objectMap({
	resetState: () => ({...defaultState}),
	...actionFunctions
}, action => (state, ...args) => {
	const result = action(state, ...args);
	if (result instanceof Promise) {
		result.then(newState => store.setState(newState));
	} else if (result) {
		store.setState(result);
	}
});

restoreState();