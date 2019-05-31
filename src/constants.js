export const TRACK_HEIGHT = 96;
export const SKIP_TIME = 10;
export const MIN_ZOOM_SCALE = 0.1; // pixels per second
export const MAX_ZOOM_SCALE = 10000; // pixels per second
export const MAX_ZOOM_FACTOR = 3; // times total duration
export const MIN_ZOOM_FACTOR = 1 / 100;

import * as MATERIAL_COLORS from '@material-ui/core/colors';
const {
	common,
	...paletteColors
} = MATERIAL_COLORS;

export const TRACK_COLORS = [
	...Object.keys(paletteColors)
		.map(key => MATERIAL_COLORS[key][500]),
	// common.black,
	common.white
];