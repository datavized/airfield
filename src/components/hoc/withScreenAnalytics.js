/* global DEBUG */
import React from 'react';

const stack = [];

// This function takes a component...
function withScreenAnalytics(WrappedComponent, name = WrappedComponent.name) {
	if (!name) {
		if (DEBUG) {
			console.warn('withScreenAnalytics needs a name', WrappedComponent);
		}

		return WrappedComponent;
	}

	return class ScreenComponent extends React.Component {

		logScreenView = screenName => {
			if (window.ga) {
				window.ga('send', 'screenview', {
					screenName
				});
			}
		}

		componentDidMount() {
			stack.push([this, name]);
			this.logScreenView(name);
		}

		componentWillUnmount() {
			let top = true;
			for (let i = stack.length - 1; i >= 0; i--) {
				const [comp] = stack[i];
				if (comp === this) {
					stack.splice(i, 1);
					if (top && stack.length) {
						this.logScreenView(stack[i - 1][1]);
					}
					return;
				}
				top = false;
			}
		}

		render() {
			return <WrappedComponent {...this.props}/>;
		}
	};
}

export default withScreenAnalytics;