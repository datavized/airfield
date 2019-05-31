import React from 'react';

import PropTypes from 'prop-types';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import error from '@material-ui/core/colors/amber';

const globalTheme = createMuiTheme({
	palette: {
		type: 'dark',
		// background: {
		// 	default: '#212121',
		// 	paper: '#323232'
		// },
		primary: {
			light: '#5f7481',
			main: '#344955',
			dark: '#0b222c',
			contrastText: '#fff'
		},
		secondary: {
			light: '#fff263',
			main: '#fbc02d', // Yellow[700]
			dark: '#c49000',
			contrastText: '#000'
		},
		// divider: '#e0f7fa',
		error
	},

	typography: {
		useNextVariants: true
	}
});

const Def = ({children}) =>
	<MuiThemeProvider theme={globalTheme}>{children}</MuiThemeProvider>;

Def.propTypes = {
	children: PropTypes.oneOfType([
		PropTypes.arrayOf(PropTypes.node),
		PropTypes.node
	])
};
const Theme = Def;
export default Theme;