'use strict';

const fs = require('fs');
const vm = require('vm');

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

	let fileContents = (function () {
		let error = null;
		try {
			return fs.readFileSync(path, options.encoding);
		} catch (err) {
			error = err;
			require('mock-fs').restore();
			return fs.readFileSync(path, options.encoding);
		} finally {
			if (error) {
				const fsMock = require('mock-fs');
				fsMock(fsMock.currentSandbox);
			}
		}
	})();
	if (typeof transformer === 'function') {
		fileContents = transformer(fileContents);
	}
	vm.runInNewContext(fileContents, sandbox);
	return sandbox;
};
