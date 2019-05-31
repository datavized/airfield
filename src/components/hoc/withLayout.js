import React from 'react';

export const AppLayoutContext = React.createContext('full');

export default function withLayout(WrappedComponent) {
	return function LayoutComponent(props) {
		return <AppLayoutContext.Consumer>
			{layout => <WrappedComponent layout={layout} {...props} />}
		</AppLayoutContext.Consumer>;
	};
}