import React from 'react';

import Shell from './Shell';
import SectionLoader from './SectionLoader';

const Def = () =>
	<Shell>
		<SectionLoader/>
	</Shell>;

const AppLoader = Def;
export default AppLoader;