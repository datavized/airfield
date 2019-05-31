import setConfig from './setConfig';
export { setConfig };
export { default as updateClip } from './updateClip';
export { default as deleteClip, deleteClips } from './deleteClip';
export { default as duplicateClip } from './duplicateClip';
export { default as addClip } from './addClip';
export { default as updateTrack } from './updateTrack';
export { default as deleteTrack } from './deleteTrack';
export * from './liveAudio';

export function selectClip(state, selectedClipId) {
	if (selectedClipId === state.config.selectedClipId) {
		return null;
	}
	return setConfig(state, { selectedClipId });
}

export function setProject(state, project) {
	return {
		project: {
			tracks: new Map(),
			trackOrder: [],
			clips: new Map(),
			duration: 0,
			timelineLength: 0,
			...project
		}
	};
}