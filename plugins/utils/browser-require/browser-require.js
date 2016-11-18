'use strict';

const fs = require('fs');
const vm = require('vm');
const Module = require('module');

require('mock-fs-require-fix');
const RESOLUTION_STEP_KEY = Object.getOwnPropertySymbols(Module).find(sym => sym.toString() === `Symbol(resolvingModule)`);

module.exports = function (path, options, transformer) {
	if (arguments.length < 3 && typeof options === 'function') {
		transformer = options;
		options = {encoding: 'utf8', timers: false};
	} else if (!options) {
		options = {encoding: 'utf8', timers: false};
	} else if (!options.encoding) {
		options.encoding = 'utf8';
	}

	const sandbox = {window: {}};
	if (options.timers) {
		Object.assign(sandbox, {
			setTimeout: setTimeout,
			clearTimeout: clearTimeout,
			setImmediate: setImmediate,
			clearImmediate: clearImmediate,
		});
	}

	Module[RESOLUTION_STEP_KEY] = true;
	let fileContents = fs.readFileSync(path, options.encoding);
	Module[RESOLUTION_STEP_KEY] = false;

	if (typeof transformer === 'function') {
		fileContents = transformer(fileContents);
	}

	vm.runInNewContext(fileContents, sandbox);
	return sandbox;
};
