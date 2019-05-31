/*
We build a manifest.json full of icons with favicons-webpack-plugin
but it does not properly inject it into the HTML
(bug: https://github.com/jantimon/favicons-webpack-plugin/pull/10)

This custom plugin lets us do that and modify it with some of
our own preferred properties
*/

const { RawSource } = require('webpack-sources');
function InjectManifestPlugin(options, versions) {
	this.options = options;
	this.versions = versions || {};
}

InjectManifestPlugin.prototype.apply = function (compiler) {
	let manifestLocation = '';
	const versionManifests = [];
	const options = this.options;

	compiler.hooks.compilation.tap('InjectManifestPlugin', (compilation) => {
		if (compilation.hooks.htmlWebpackPluginAfterHtmlProcessing) {
			compilation.hooks.htmlWebpackPluginAfterHtmlProcessing.tapAsync(
				'InjectManifestPlugin',
				(data, cb) => {
					if (manifestLocation) {
						data.html = data.html.replace(
							/(<\/head>)/i,
							`<link rel="manifest" href="${encodeURI(manifestLocation)}" /></head>`
						);
					}
					if (versionManifests.length) {
						const links = versionManifests
							.map(([key, loc]) => `<link rel="manifest-${key}" href="${encodeURI(loc)}" />`)
							.join('');
						data.html = data.html.replace(
							/(<\/head>)/i,
							`${links}</head>`
						);
					}
					cb(null, data);
				}
			);
		}

		if (compilation.hooks.additionalAssets) {
			compilation.hooks.additionalAssets.tapAsync(
				'InjectManifestPlugin',
				cb => {
					Object.keys(compilation.assets).forEach(name => {
						if (/manifest\.json$/.test(name)) {
							try {
								if (options) {
									const asset = compilation.assets[name];
									const manifest = JSON.parse(asset.source());
									const modifiedManifest = Object.assign(manifest, options || {});
									compilation.assets[name] = new RawSource(JSON.stringify(modifiedManifest));
								}
								manifestLocation = name;
								const mainManifest = JSON.parse(compilation.assets[name].source());
								Object.keys(this.versions).forEach(version => {
									const versionName = name.replace(/manifest\.json$/, `manifest-${version}.json`);
									if (!compilation.assets[versionName]) {
										const changes = this.versions[version] || {};
										const versionManifest = Object.assign(mainManifest, changes);
										compilation.assets[versionName] = new RawSource(JSON.stringify(versionManifest));
										versionManifests.push([version, versionName]);
									}
								});
							} catch (e) {
								console.warn('failed to update manifest', e);
							}
						}
					});

					cb(null);
				}
			);
		}
	});
};

module.exports = InjectManifestPlugin;