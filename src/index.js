/* global COMMIT_HASH, DEBUG, DEBUG_SERVICE_WORKER, APP_TITLE, DEBUG_PROMISES */
import React from 'react';
import ReactDOM from 'react-dom';

// todo: remove this if not in use
import onNewServiceWorker from './util/onNewServiceWorker';
import reportError from './util/reportError';

import './index.css';
import Main from './components/Main';

if (DEBUG) {
	require('typeface-roboto');
}

const ENABLE_SERVICE_WORKER = true;

if (DEBUG_PROMISES) {
	const Promise = require('bluebird');
	window.Promise = Promise;

	// Configure
	Promise.config({
		longStackTraces: true,
		warnings: true // note, run node with --trace-warnings to see full stack traces for warnings
	});
}

console.log(`${APP_TITLE} (build ${COMMIT_HASH})`);

if (window.ga) {
	window.ga('set', {
		appName: APP_TITLE,
		appVersion: COMMIT_HASH
	});
	window.addEventListener('error', reportError);
	window.addEventListener('unhandledrejection', reportError);

	const ReportingObserver = self.ReportingObserver;
	if (typeof ReportingObserver !== 'undefined') {
		const observer = new ReportingObserver((reports/*, observer*/) => {
			for (const report of reports) {
				console.log('ReportingObserver', report);
			}
		}, {
			buffered: true
		});

		observer.observe();
	}
}

const rootEl = document.getElementById('root');

let upgradeReady = false;
let render = () => {};
const MainWithProps = () => <Main upgradeReady={upgradeReady} onError={reportError}/>;

if (module.hot) {
	const { AppContainer } = require('react-hot-loader');
	render = () => {
		ReactDOM.render(<AppContainer>
			<MainWithProps/>
		</AppContainer>, rootEl);
	};

	render();
	module.hot.accept('./components/Main', render);
} else {
	render = () => {
		ReactDOM.render(<MainWithProps/>, rootEl);
	};
	render();
}

if (!module.hot && ENABLE_SERVICE_WORKER || DEBUG_SERVICE_WORKER) {
	if ('serviceWorker' in navigator) {
		if (DEBUG) {
			navigator.serviceWorker.addEventListener('message', evt => {
				console.log('serviceWorker message', evt);
			});

			navigator.serviceWorker.addEventListener('controllerchange', evt => {
				console.log('controllerchange', evt);
			});
		}

		// Use the window load event to keep the page load performant
		window.addEventListener('load', () => {
			navigator.serviceWorker.register('/sw.js').then(reg => {
				// check once an hour
				setInterval(() => reg.update(), 1000 * 60 * 60);

				onNewServiceWorker(reg, () => {
					upgradeReady = true;
					render();
				});

				if (DEBUG) {
					if (reg.installing) {
						console.log('Service worker installing');
					} else if (reg.waiting) {
						console.log('Service worker installed');
					} else if (reg.active) {
						console.log('Service worker active');
					}

					reg.addEventListener('updatefound', () => {
						// If updatefound is fired, it means that there's
						// a new service worker being installed.
						const installingWorker = reg.installing;
						console.log('A new service worker is being installed:',
							installingWorker);

						// You can listen for changes to the installing service worker's
						// state via installingWorker.onstatechange
						if (installingWorker) {
							installingWorker.addEventListener('statechange', evt => {
								console.log('service worker statechange', evt);
							});
						}
					});
				}
			}).catch(error => {
				if (DEBUG) {
					console.log('Service worker registration failed', error);
				}
			});
		});
	}
}
