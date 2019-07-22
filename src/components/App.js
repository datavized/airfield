import React from 'react';
import PropTypes from 'prop-types';

/*
Material UI components
*/
import withTheme from '@material-ui/core/styles/withTheme';
import useMediaQuery from '@material-ui/core/useMediaQuery';

import UpgradePrompt from './UpgradePrompt';
import AppLoader from './AppLoader';
import LoadFailure from './LoadFailure';

// removed as long as media stream destination is disabled
// doesn't really work anyway
// import MediaSession from './MediaSession';

import asyncComponent from './hoc/asyncComponent';
import { AppLayoutContext } from './hoc/withLayout';

const FullSizeApp = asyncComponent(() => import('./FullSizeApp'), {
	load: AppLoader,
	fail: LoadFailure,
	defer: true
});
const CompactApp = asyncComponent(() => import('./CompactApp'), {
	load: AppLoader,
	fail: LoadFailure,
	defer: true
});

const Def = ({upgradeReady, theme, ...props}) => {
	const breakpoint = theme.breakpoints.values.sm;
	const maxSize = breakpoint - 5 / 100;
	const query = `@media (max-width:${maxSize}px), (max-height:${maxSize}px)`;
	const isCompact = useMediaQuery(query, {
		noSsr: true
	});
	return <AppLayoutContext.Provider value={isCompact ? 'compact' : 'full'}>
		{isCompact ?
			<CompactApp {...props}/> :
			<FullSizeApp {...props}/>
		}
		{/*<MediaSession/>*/}
		<UpgradePrompt upgradeReady={upgradeReady}/>
	</AppLayoutContext.Provider>;
};

Def.propTypes = {
	theme: PropTypes.object.isRequired,
	upgradeReady: PropTypes.bool
};


const App = withTheme(Def);

export default App;