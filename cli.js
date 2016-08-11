'use strict';

module.exports = function (parameters) {
	let config = {};
	if (!parameters) return config;

	for (let i = 0; i < parameters.length; i++) {
		let isOption = parameters[i].startsWith('--');
		if (!isOption) {
			let port = parseInt(parameters[i]); // eslint-disable-line radix
			if (isNaN(port)) throw new Error("Puerto no válido: " + port);
			config.port = port;
			// config.ssl = null;
		} else {
			let parts = parameters[i].slice(2).split('=');
			if (parts.length <= 1 || parts[1] !== 'false') {
				switch (parts[0]) {
				case 'dev':
					if (parts.length <= 1 || parts[1] === 'true') {
						config.localhost = 80;
					} else {
						let port = parseInt(parts[1], 10);
						if (isNaN(port) || port < 0 || port > 0xFFFFF) throw new Error("Invalid value for --dev argument");
						config.localhost = port;
					}
					break;
				case 'init':
					config.isInitialization = true;
					break;
				case 'static':
					config.staticserver = parts[1];
					break;
				case 'sockets':
					config.socketspath = parts[1];
				}
			}
		}
	}

	return config;
};
