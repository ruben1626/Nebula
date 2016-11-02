'use strict';

const path = require('path');
const browserRequire = require('./../browser-require');

const CAJA_EXTRA_ELEMENTS = {
	// Non-standard HTML
	'marquee': 0,
	'blink': 0,

	// Untrusted HTML
	'form': 84,

	// Custom elements
	'countup': 0,
	'countdown': 0,
};

const CAJA_EXTRA_ATTRIBUTES = {
	// Non-standard HTML
	'marquee::behavior': 0,
	'marquee::bgcolor': 0,
	'marquee::direction': 0,
	'marquee::height': 0,
	'marquee::hspace': 0,
	'marquee::loop': 0,
	'marquee::scrollamount': 0,
	'marquee::scrolldelay': 0,
	'marquee::truespeed': 0,
	'marquee::vspace': 0,
	'marquee::width': 0,

	// Custom elements
	'countup::data-max': 0,
	'countup::data-value': 0,
	'countup::data-zone': 0,
	'countup::data-hour': 0,
	'countup::time': 0,
	'countdown::data-min': 0,
	'countdown::data-value': 0,
	'countdown::data-zone': 0,
	'countdown::data-hour': 0,
	'countdown::time': 0,
};

Object.assign(exports, (function () {
	const cajaPath = path.resolve(__dirname, 'html-css-sanitizer-bundle.js');
	const sandbox = browserRequire(cajaPath, function (fileContents) {
		// return fileContents.replace(/ALLOWED_URI_SCHEMES\s*=\s*\/\^\(\?\:([^\/\$\)]+)\)\$\/i/g, 'ALLOWED_URI_SCHEMES = /^(?:$1|data)$/i');
		return fileContents;
	});

	Object.assign(sandbox.html4.ELEMENTS, CAJA_EXTRA_ELEMENTS);
	Object.assign(sandbox.html4.ATTRIBS, CAJA_EXTRA_ATTRIBUTES);

	return {
		caja: sandbox.html,
		URI: sandbox.URI,
	};
})());