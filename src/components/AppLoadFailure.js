import React from 'react';

import Shell from './Shell';
import LoadFailure from './LoadFailure';

const Def = props =>
	<Shell>
		<LoadFailure {...props}/>
	</Shell>;

const AppLoadFailure = Def;
export default AppLoadFailure;