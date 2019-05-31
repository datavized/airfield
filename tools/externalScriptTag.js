/*
temporary solution until this issue is solved
https://github.com/ampedandwired/html-webpack-plugin/issues/413
*/
const escape = require('lodash.escape');
module.exports = function externalScriptTag(def) {
	const src = def && def.src || def;
	const integrity = def && def.integrity;
	const integrityAttr = integrity ?
		` integrity="${integrity}"` :
		'';

	return `<script src="${escape(encodeURI(src))}" crossorigin="anonymous"${integrityAttr}></script>`;
};