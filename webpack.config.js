/* eslint-env node, browser: false */

// configuration
const TITLE = 'Airfield';
const description = 'Interdimensional Audio Editor';
const port = 4000;
const themeColor = '#344955';
const browsers = [
	'>1%',
	'last 4 versions',
	'Firefox ESR',
	'ie >= 12',
	'not dead'
];
const DEBUG_SERVICE_WORKER = false;
const DEBUG_PROMISES = false;
process.traceDeprecation = true;

// Variables in .env will be added to process.env
require('dotenv').config();
const env = process.env.NODE_ENV || 'development';

const isDev = env !== 'production';
const isStagingBuild = isDev || process.env.MODE !== 'public';

// get current github branch
const BRANCH = (() => {
	const spawn = require('child_process')
		.spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
	const errorText = spawn.stderr.toString().trim();
	if (errorText) {
		console.warn('error getting git branch', errorText);
		// process.exit(1);
		return '';
	}

	return spawn.stdout.toString().trim();
})();

// Enforce build mode on appropriate branch so we don't deploy dev build to public server
if (isStagingBuild) {
	if (BRANCH === 'master') {
		console.warn('Attempting to run staging build on master branch');
		process.exit(1);
	}
} else {
	if (BRANCH !== 'master') {
		console.error(`Must run public production build on master branch. Currently on ${BRANCH}.`);
		process.exit(1);
	}
}

const titleQualifier = isDev ?
	'DEV' :
	process.env.MODE !== 'public' ? 'STAGING' : '';
const title = titleQualifier ? `${TITLE} [${titleQualifier}]` : TITLE;

const webpack = require('webpack');
const fs = require('fs');
const path = require('path');
const merge = require('webpack-merge');

const pkg = require('./package.json');
const banner = [
	pkg.name + ' - ' + description,
	'@version v' + pkg.version,
	'@link ' + pkg.homepage,
	'@license ' + pkg.license
].join('\n');

const buildPath = path.resolve(__dirname, 'build', isStagingBuild ? 'staging' : 'public');

// webpack plugins and related utils
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WorkboxPlugin = require('workbox-webpack-plugin');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');
const InjectManifestPlugin = require('./tools/inject-manifest-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const WatchMissingNodeModulesPlugin = require('react-dev-utils/WatchMissingNodeModulesPlugin');
const WebpackBuildNotifierPlugin = require('webpack-build-notifier');
const ImageminPlugin = require('imagemin-webpack-plugin').default;
const imageminMozjpeg = require('imagemin-mozjpeg');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const eslintFormatter = require('react-dev-utils/eslintFormatter');
const autoprefixer = require('autoprefixer');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const HtmlWebpackExcludeEmptyAssetsPlugin = require('html-webpack-exclude-empty-assets-plugin');

// Make sure any symlinks in the project folder are resolved:
// https://github.com/facebookincubator/create-react-app/issues/637
const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

const mediaFilesRegex = /\.(?:webm|ogg|oga|mp3|wav|aiff|flac|mp4|m4a|aac|opus|webp)$/;

const eslintConfig = require('./.eslintrc.js');
const babelPlugins = env === 'development' ? [
	'react-hot-loader/babel',

	// Adds component stack to warning messages
	require.resolve('@babel/plugin-transform-react-jsx-source'),

	// Adds __self attribute to JSX which React will use for some warnings
	require.resolve('@babel/plugin-transform-react-jsx-self')
] : [];

const nodeModulesRegex = /node_modules\//;
const babelTranspileWhitelist = [
	'react-mic-record'
];

const VERSION = (() => {
	let timestamp = new Date().toISOString();
	try {
		const spawn = require('child_process')
			.spawnSync('git', ['show', '-s', '--format=%cD', 'HEAD']);
		const errorText = spawn.stderr.toString().trim();
		if (errorText) {
			console.warn('git timestamp error', errorText);
		} else {
			const timeString = spawn.stdout.toString().trim();
			const time = new Date(timeString);
			timestamp = time.toISOString();
		}
	} catch (e) {
		console.warn('timestamp error', e && e.message, e);
	}

	let version = 'dev';
	try {
		const spawn = require('child_process')
			.spawnSync('git', ['rev-parse', '--short', 'HEAD']);
		const errorText = spawn.stderr.toString().trim();
		if (errorText) {
			console.warn('git version error', errorText);
		} else {
			version = spawn.stdout.toString().trim();
		}
	} catch (e) {}

	return JSON.stringify(`${timestamp} ${version}`);
})();

const plugins = [
	new CaseSensitivePathsPlugin()
];

const cssLoaders = [
	{
		loader: require.resolve('css-loader'),
		options: {
			importLoaders: 1
		}
	},
	{
		loader: require.resolve('postcss-loader'),
		options: {
			// Necessary for external CSS imports to work
			// https://github.com/facebookincubator/create-react-app/issues/2677
			ident: 'postcss',
			plugins: () => [
				require('postcss-flexbugs-fixes'),
				require('postcss-input-range'),
				autoprefixer({
					browsers,
					grid: true,
					flexbox: 'no-2009'
				})
			]
		}
	}
];

const config = {
	entry: './src/index.js',
	devtool: 'cheap-module-source-map',
	output: {
		path: buildPath,
		filename: 'index-[hash].js',
		pathinfo: env !== 'production',
		globalObject: 'this'
		// publicPath: __dirname + '/public'
	},
	module: {
		rules: [
			// preLoaders
			{
				test: /(\.jsx|\.js)$/,
				exclude: /node_modules/,
				enforce: 'pre',
				loader: 'eslint-loader',
				options: Object.assign({}, eslintConfig, {
					formatter: eslintFormatter,
					failOnHint: env === 'production',
					emitWarning: true,
					parserOptions: {
						ecmaFeatures: {
							jsx: true
						}
					}
				})
			},

			{
				oneOf: [
					// Process JS with babel
					{
						test: /(\.jsx|\.js)$/,
						exclude(path) {
							/*
							whitelist some dependencies that need to be transpiled
							*/
							const index = path.search(nodeModulesRegex);
							if (index >= 0) {
								const rest = path.slice(index + 'node_modules/'.length);
								if (!babelTranspileWhitelist.some(name => rest.startsWith(name))) {
									return true;
								}
							}
							return false;
						},
						loader: 'babel-loader',
						options: {
							babelrc: false,
							presets: [
								[
									'@babel/env',
									{
										exclude: [
											'transform-regenerator',
											'transform-async-to-generator'
										],
										targets: {
											browsers
										},
										useBuiltIns: false,
										modules: false
									}
								],
								['@babel/react']
							],
							plugins: [
								...babelPlugins,
								'@babel/plugin-proposal-class-properties',
								['@babel/plugin-proposal-object-rest-spread', { useBuiltIns: true }],
								['@babel/plugin-transform-react-jsx', { useBuiltIns: true }],
								['@babel/plugin-transform-runtime', {
									helpers: false,
									regenerator: true
								}],
								'@babel/plugin-syntax-dynamic-import',
								'module:fast-async',

								// todo: for tests
								// https://github.com/facebookincubator/create-react-app/blob/master/packages/babel-preset-react-app/index.js#L72

								['transform-react-remove-prop-types', {
									removeImport: true
								}]
							],
							cacheDirectory: true
						}
					},

					{
						test: /\.coffee$/,
						use: [
							{
								loader: 'coffee-loader',
								options: {
									// transpile: {
									// 	presets: ['@babel/env']
									// }
								}
							}
						]
					},

					{
						// load inline
						test: /\.internal\.css$/,
						use: [
							...cssLoaders
						]
					},

					{
						test: /\.css$/,
						use: [
							// load by script
							require.resolve('style-loader'),
							...cssLoaders
						]
					},

					{
						test: /\.(wav|mp3|m4a|ogg|oga|mp4|ogv|webm|aif|aiff)$/,
						loader: 'media',
						options: {
							name: 'audio/[name]-[hash].[ext]'
						}
					},

					// 'url' loader works like 'file' loader except that it embeds assets
					// smaller than specified limit in bytes as data URLs to avoid requests.
					// A missing `test` is equivalent to a match.
					{
						test: [/\.gif$/, /\.jpe?g$/, /\.png$/, /\.svg$/, /\.mp3$/],
						exclude: [
							/node_modules/
						],
						loader: require.resolve('url-loader'),
						options: {
							limit: 10000,
							name: 'static/media/[name].[hash:8].[ext]'
						}
					},

					{
						test: /\.(glsl|vert|frag)$/,
						loader: 'webpack-glsl-loader'
					},

					{
						test: [/\.svg$/],
						include: [
							/node_modules/
						],
						use: [
							require.resolve('raw-loader'),
							{
								loader: require.resolve('svgo-loader'),
								options: {
									plugins: [
										{ removeViewBox: false }
									]
								}
							}
						]
					},


					// 'file' loader makes sure those assets get served by WebpackDevServer.
					// When you `import` an asset, you get its (virtual) filename.
					// In production, they would get copied to the `build` folder.
					// This loader doesn't use a 'test' so it will catch all modules
					// that fall through the other loaders.
					{
						// Exclude `js` files to keep 'css' loader working as it injects
						// its runtime that would otherwise processed through 'file' loader.
						// Also exclude `html` and `json` extensions so they get processed
						// by webpacks internal loaders.
						exclude: [/\.(js|jsx|mjs)$/, /\.html$/, /\.json$/],
						loader: require.resolve('file-loader'),
						options: {
							name: 'static/media/[name].[hash:8].[ext]'
						}
					}
				]
			}//,

			// {
			// 	test: /\.worker\.js$/,
			// 	// include: [
			// 	// 	path.resolve(__dirname, 'src/workers')
			// 	// ],
			// 	use: [
			// 		{
			// 			loader: 'inspect-loader',
			// 			options: {
			// 				callback(inspect) {
			// 					console.log('\n\n****\nworker\loader');
			// 					console.log(inspect.arguments);
			// 					// console.log(inspect.context);
			// 					console.log(inspect.options);
			// 					console.log('****\n\n');
			// 				}
			// 			}
			// 		},
			// 		{
			// 			loader: 'worker-loader'
			// 		}
			// 	]
			// }
		]
	},
	resolve: {
		extensions: ['.js', '.jsx'],
		alias: {
			'datavized-webxr': 'webpack-vr-template',
			'react-dom': '@hot-loader/react-dom',
			'@material-ui/core': path.resolve(__dirname, 'node_modules/@material-ui/core/es/'),
			'av$': path.resolve(__dirname, 'node_modules/av/src/aurora_base.js/')

			// We can restore this later if we solve issue #11
			// 'preact-compat': 'preact-compat/dist/preact-compat',
			// react: 'preact-compat/dist/preact-compat',
			// 'react-dom': 'preact-compat/dist/preact-compat'
		}
	},
	plugins,
	node: {
		fs: 'empty'
	},
	optimization: {
		runtimeChunk: 'single'//,
		// splitChunks: {
		// 	minChunks: 3
		// }
	},
	resolveLoader: {
		alias: {
			raw: 'raw-loader',
			exports: 'exports-loader',
			imports: 'imports-loader',
			worker: 'worker-loader',
			style: 'style-loader',
			css: 'css-loader',
			utf8: 'utf8-loader'
		},
		modules: [
			'node_modules',
			path.join(__dirname, 'node_modules/webpack-vr-template/src/loaders')
		]
	},
	performance: {
		assetFilter: assetFilename => !mediaFilesRegex.test(assetFilename) &&
			!assetFilename.endsWith('.map')
	}
};

const serviceWorkerPlugin = new WorkboxPlugin.GenerateSW({
	swDest: 'sw.js',
	exclude: [
		/\.map$/, // source maps
		/^manifest.*\.js(?:on)?$/, // web app manifest
		/icons-[a-z0-9]+\/[a-z0-9_-]+\.png$/, // icons
		/icons-[a-z0-9]+\/\.cache$/, // favicons cache file
		/node_modules\/standardized-audio-context\//,
		mediaFilesRegex // media files
	],
	skipWaiting: true,
	clientsClaim: true,
	runtimeCaching: [{
		// Use a custom cache name.
		// cacheName: 'audio',
		urlPattern: mediaFilesRegex,
		handler: 'CacheFirst',
		options: {}
	}]
});

const devConfig = {
	entry: [
		'react-hot-loader/patch', // RHL patch
		'./src/index.js'
	],
	mode: 'development',
	devtool: 'cheap-module-source-map',
	output: {
		// workaround for https://github.com/facebookincubator/create-react-app/issues/2407
		sourceMapFilename: '[file].map'
	},
	plugins: [
		new webpack.DefinePlugin({
			'process.env.NODE_ENV': JSON.stringify('development'),
			DEBUG: true,
			DEBUG_SERVICE_WORKER,
			DEBUG_PROMISES,
			STAGING: true,
			COMMIT_HASH: `'dev'`,
			APP_TITLE: JSON.stringify(title),
			GOOGLE_API_KEY: JSON.stringify(process.env.GOOGLE_API_KEY || ''),
			GOOGLE_CLIENT_ID: JSON.stringify(process.env.GOOGLE_CLIENT_ID || ''),
			FEEDBACK_URL: JSON.stringify(process.env.FEEDBACK_URL || '')
		}),
		new WebpackBuildNotifierPlugin({
			title: path.basename(__dirname),
			suppressSuccess: true
		}),
		new webpack.HotModuleReplacementPlugin(),
		new WatchMissingNodeModulesPlugin(resolveApp('node_modules')),
		new HtmlWebpackPlugin({
			inject: true,
			cache: true,
			ga: false,
			title,
			description,
			template: path.resolve(__dirname, 'src/index.html') // todo: src
		})
	],
	devServer: {
		hot: true,
		progress: true,
		inline: true,
		contentBase: './public',
		stats: {
			all: false,
			colors: true,
			errors: true,
			warnings: true
		},
		port,
		host: '0.0.0.0'
	}
};

if (DEBUG_SERVICE_WORKER) {
	devConfig.plugins.push(serviceWorkerPlugin);
}

const distConfig = {
	output: {
		filename: 'index-[chunkhash].js',
		sourceMapFilename: '[file].map'
	},
	devtool: isStagingBuild ? 'source-map' : 'hidden-source-map',
	mode: 'production',
	resolve: {
		extensions: ['.js', '.jsx'],
		alias: {
			/*
			doesn't work:
			https://github.com/NervJS/nerv/issues/81
			*/
			// 'react': 'nervjs',
			// 'react-dom': 'nervjs',
			// // Not necessary unless you consume a module using `createClass`
			// 'create-react-class': 'nerv-create-class'
		}
	},
	externals: {
	},
	plugins: [
		new CleanWebpackPlugin(),
		new webpack.DefinePlugin({
			'process.env.NODE_ENV': JSON.stringify('production'),
			DEBUG: false,
			DEBUG_SERVICE_WORKER: false,
			DEBUG_PROMISES: false,
			STAGING: isStagingBuild,
			COMMIT_HASH: VERSION,
			APP_TITLE: JSON.stringify(title),
			GOOGLE_API_KEY: JSON.stringify(process.env.GOOGLE_API_KEY || ''),
			GOOGLE_CLIENT_ID: JSON.stringify(process.env.GOOGLE_CLIENT_ID || ''),
			FEEDBACK_URL: JSON.stringify(process.env.FEEDBACK_URL || '')
		}),
		new webpack.BannerPlugin({
			banner
		}),
		new FaviconsWebpackPlugin({
			logo: resolveApp('./src/images/airfield-logo.svg'),
			background: themeColor,
			persistentCache: true,
			version: VERSION,
			emitStats: true,
			// inject: true,
			title: title,
			appDescription: description
		}),
		new ImageminPlugin({
			svgo: {
			},
			// pngquant is not run unless you pass options here
			// pngquant: null,
			plugins: [
				imageminMozjpeg({
					quality: 80
				})
			]
		}),
		new CopyWebpackPlugin([{
			from: __dirname + '/public',
			to: buildPath,
			ignore: ['index.html']
		}]),
		new OptimizeCssAssetsPlugin({}),
		new HtmlWebpackPlugin({
			inject: true,
			cache: true,
			title,
			description,
			template: path.resolve(__dirname, 'src/index.html'), // todo: src
			ga: !isStagingBuild && process.env.GOOGLE_ANALYTICS_KEY || '',
			minify: {
				removeComments: true,
				removeCommentsFromCDATA: true,
				removeCDATASectionsFromCDATA: true,
				collapseWhitespace: true,
				collapseBooleanAttributes: true,
				removeAttributeQuotes: true,
				removeRedundantAttributes: true,
				useShortDoctype: true,
				removeEmptyAttributes: true,
				removeScriptTypeAttributes: true,
				// lint: true,
				caseSensitive: true,
				minifyJS: true,
				minifyCSS: true
			}
		}),
		new InjectManifestPlugin({
			theme_color: themeColor, // eslint-disable-line camelcase
			start_url: '../?utm_source=web_app_manifest', // eslint-disable-line camelcase
			name: title,
			description
		}, {
			ios: {
				// web apps on ios need to be in browser mode for microphone to work
				// https://stackoverflow.com/questions/50800696/getusermedia-in-pwa-with-manifest-on-ios-11
				display: 'browser'
			}
		}),
		new HtmlWebpackExcludeEmptyAssetsPlugin(),
		serviceWorkerPlugin,
		new BundleAnalyzerPlugin({
			openAnalyzer: false,
			analyzerMode: 'static',
			reportFilename: '../report.html'
		})
	]
};

module.exports = merge.smart(config, env === 'production' ? distConfig : devConfig);
