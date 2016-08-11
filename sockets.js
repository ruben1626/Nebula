/**
 * Connections
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * Abstraction layer for multi-process SockJS connections.
 *
 * This file handles all the communications between the users'
 * browsers, the networking processes, and users.js in the
 * main process.
 *
 * @license MIT license
 */

'use strict';

const cluster = require('cluster');
global.Config = require('./config/config');

if (cluster.isMaster) {
	cluster.setupMaster({
		exec: require('path').resolve(__dirname, 'sockets.js'),
	});

	let workers = exports.workers = {};

	const PublicPromise = require('./plugins/utils/promise-public');
	let customTasks = new Map();

	let spawnWorker = exports.spawnWorker = function () {
		let localhostPort = 0;
		if (Config.localhost) {
			localhostPort = parseInt(Config.localhost, 10);
			if (isNaN(localhostPort)) localhostPort = 0;
		}
		let worker = cluster.fork({
			PSPORT: Config.port,
			PSBINDADDR: Config.bindaddress || '',
			PSNOSSL: Config.ssl ? 0 : 1,
			PSLOCALHOST: localhostPort,
			PSSTATICSERVER: Config.staticserver || '',
		});
		let id = worker.id;
		workers[id] = worker;
		worker.on('message', data => {
			// console.log('master received: ' + data);
			switch (data.charAt(0)) {
			case '*': {
				// *socketid, ip
				// connect
				let nlPos = data.indexOf('\n');
				let nlPos2 = data.indexOf('\n', nlPos + 1);
				Users.socketConnect(worker, id, data.slice(1, nlPos), data.slice(nlPos + 1, nlPos2), data.slice(nlPos2 + 1));
				break;
			}

			case '!': {
				// !socketid
				// disconnect
				Users.socketDisconnect(worker, id, data.substr(1));
				break;
			}

			case '<': {
				// <socketid, message
				// message
				let nlPos = data.indexOf('\n');
				Users.socketReceive(worker, id, data.substr(1, nlPos - 1), data.substr(nlPos + 1));
				break;
			}

			case '$': {
				if (data === '$exit') return process.exit();
				if (data === '$reload') {
					for (let id in workers) {
						workers[id].send('$Servers[\'log\'].reloadAuth()');
					}
				}
				break;
			}

			case '@': {
				// Worker requests work for the master process
				//
				// @namespace|identifier?\nparameters
				// Store the worker id in a variable.
				//
				// If no identifier is provided: try to execute the task.
				//
				// Otherwise, if an identifier is given:
				// Promise the execution of the task.
				// **Then**, send to the worker the result, passing the task identifying-data.
				// **Catch** any error, passing it to the worker, together with the task-identifying-data.

				let pipeLoc = data.indexOf('|');
				let nlLoc = data.indexOf('\n');
				let namespace = data.slice(1, pipeLoc);
				let identifier = pipeLoc >= 0 ? data.slice(pipeLoc + 1, nlLoc) : '';
				let result = data.slice(nlLoc + 1);
				Plugins.eventEmitter.emit('Message', worker, namespace, identifier, result).flush();
				break;
			}

			case '%': {
				// Worker reports back
				//
				// %namespace|identifier?\nparameters
				// Store the worker id in a variable.
				//
				// If no identifier is provided: try to execute the task.
				//
				// Otherwise, if an identifier is given:
				// Promise the execution of the task.
				// **Then**, send to the worker the result, passing the task identifying-data.
				// **Catch** any error, passing it to the worker, together with the task-identifying-data.

				let nlLoc = data.indexOf('\n');
				let prefix = data.slice(0, nlLoc);
				let result = data.slice(nlLoc + 1);

				if (!customTasks.has(prefix)) {
					require('./crashlogger.js')(new Error("Invalid task " + JSON.stringify(prefix) + "`. Valid tasks: " + JSON.stringify(Array.from(customTasks.keys()))));
					break;
				}

				customTasks.get(prefix).subPromises.get(worker.id).resolve(result);
				break;
			}

			default:
			// unhandled
			}
		});
	};

	cluster.on('disconnect', worker => {
		// worker crashed, try our best to clean up
		require('./crashlogger.js')(new Error("Worker " + worker.id + " abruptly died"), "The main process");

		// this could get called during cleanup; prevent it from crashing
		worker.send = () => {};

		let count = 0;
		Users.connections.forEach(connection => {
			if (connection.worker === worker) {
				Users.socketDisconnect(worker, worker.id, connection.socketid);
				count++;
			}
		});
		console.error("" + count + " connections were lost.");

		// don't delete the worker, so we can investigate it if necessary.

		// attempt to recover
		spawnWorker();
	});

	exports.listen = function (port, bindAddress, workerCount, customOptions) {
		if (port !== undefined && !isNaN(port)) {
			Config.port = port;
			// Config.ssl = null;
		} else {
			port = Config.port;
			// Autoconfigure the app when running in cloud hosting environments:
			try {
				let cloudenv = require('cloud-env');
				bindAddress = cloudenv.get('IP', bindAddress);
				port = cloudenv.get('PORT', port);
			} catch (e) {}
		}
		if (bindAddress !== undefined) {
			Config.bindaddress = bindAddress;
		}
		if (workerCount === undefined) {
			workerCount = (Config.workers !== undefined ? Config.workers : 1);
		}
		if (customOptions) {
			if (customOptions.devPort) Config.localhost = customOptions.devPort;
			if (customOptions.staticPath) Config.staticserver = customOptions.staticPath;
		}
		for (let i = 0; i < workerCount; i++) {
			spawnWorker();
		}
	};

	exports.killWorker = function (worker) {
		let idd = worker.id + '-';
		let count = 0;
		Users.connections.forEach((connection, connectionid) => {
			if (connectionid.substr(idd.length) === idd) {
				Users.socketDisconnect(worker, worker.id, connection.socketid);
				count++;
			}
		});
		try {
			worker.kill();
		} catch (e) {}
		delete workers[worker.id];
		return count;
	};

	exports.killPid = function (pid) {
		pid = '' + pid;
		for (let id in workers) {
			let worker = workers[id];
			if (pid === '' + worker.process.pid) {
				return this.killWorker(worker);
			}
		}
		return false;
	};

	exports.socketSend = function (worker, socketid, message) {
		worker.send('>' + socketid + '\n' + message);
	};
	exports.socketDisconnect = function (worker, socketid) {
		worker.send('!' + socketid);
	};

	let mergedChannels = exports.mergedChannels = new Map();

	exports.channelBroadcast = (() => {
		function isJoinMessage(message) {
			if (message.charAt(0) !== '>') return message.startsWith('|J|') || message.startsWith('|L|');
			let nlIndex = message.indexOf('\n');
			if (nlIndex < 0) return false;
			let joinType = message.substr(nlIndex + 1, 3);
			return joinType === '|J|' || joinType === '|L|';
		}
		return function (channelid, message) {
			if (mergedChannels.has(channelid) && !isJoinMessage(message)) return exports.channelBroadcastShared(channelid, message);
			for (let workerid in workers) {
				workers[workerid].send('#' + channelid + '\n' + message);
			}
		};
	})();
	exports.channelSend = function (worker, channelid, message) {
		worker.send('#' + channelid + '\n' + message);
	};
	exports.channelAdd = function (worker, channelid, socketid) {
		worker.send('+' + channelid + '\n' + socketid);
	};
	exports.channelRemove = function (worker, channelid, socketid) {
		worker.send('-' + channelid + '\n' + socketid);
	};
	exports.subchannelBroadcast = function (channelid, message) {
		for (let workerid in workers) {
			workers[workerid].send(':' + channelid + '\n' + message);
		}
	};
	exports.subchannelMove = function (worker, channelid, subchannelid, socketid) {
		worker.send('.' + channelid + '\n' + subchannelid + '\n' + socketid);
	};

	exports.channelBroadcastShared = (() => {
		function replaceMessage(message, sourceChannel, targetChannel) {
			if (sourceChannel === targetChannel) return message;
			if (sourceChannel === 'lobby') return '>' + targetChannel + '\n' + message;
			if (targetChannel === 'lobby') return message.slice(7);
			return '>' + targetChannel + '\n' + message.slice(2 + sourceChannel.length);
		}
		return function (channelid, message) {
			let channelList = mergedChannels.get(channelid);
			for (let workerid in workers) {
				for (let i = 0; i < channelList.length; i++) {
					workers[workerid].send('#' + channelList[i] + '\n' + replaceMessage(message, channelid, channelList[i]));
				}
			}
		};
	})();
	exports.mergeChannels = function (channelList) {
		for (let i = 0; i < channelList.length; i++) {
			mergedChannels.set(channelList[i], channelList);
		}
	};
	exports.unmergeChannels = function (channelList) {
		for (let i = 0; i < channelList.length; i++) {
			mergedChannels.delete(channelList[i]);
		}
	};

	exports.commandBroadcast = function (namespace, message, identifier) {
		identifier = identifier ? '' + identifier : '';
		let prefix = '%' + namespace + (identifier ? '|' + identifier : '') + '\n';

		let anySent = false;
		for (let workerid in workers) {
			workers[workerid].send(prefix + message);
			anySent = true;
		}
		if (!identifier || !anySent) return Promise.resolve(null);

		const promiseIds = Object.keys(workers).map(s => Number(s));
		const subPromises = new Array(promiseIds.length).fill(0).map(() => new PublicPromise());

		const batchPromise = PublicPromise.all(subPromises);
		const promiseWrapper = batchPromise.then(function (values) {
			customTasks.delete(prefix.slice(0, -1));
			return Promise.resolve(values);
		});

		promiseWrapper.resolve = batchPromise.resolve; // already bound
		promiseWrapper.reject = batchPromise.reject; // already bound
		promiseWrapper.subPromises = new Map(promiseIds.map((id, index) => [id, subPromises[index]]));

		customTasks.set(prefix.slice(0, -1), promiseWrapper);
		return promiseWrapper;
	};
} else {
	// is worker

	if (process.env.PSPORT) Config.port = +process.env.PSPORT;
	if (process.env.PSBINDADDR) Config.bindaddress = process.env.PSBINDADDR;
	if (+process.env.PSNOSSL) Config.ssl = null;
	if (+process.env.PSLOCALHOST) Config.localhost = true;
	if (process.env.PSSTATICSERVER) Config.staticserver = process.env.PSSTATICSERVER;

	// ofe is optional
	// if installed, it will heap dump if the process runs out of memory
	try {
		require('ofe').call();
	} catch (e) {}

	// Static HTTP server

	// This handles the custom CSS and custom avatar features, and also
	// redirects yourserver:8001 to yourserver-8001.psim.us

	// It's optional if you don't need these features.

	const http = require('http');
	const https = require('https');

	require('sugar');

	global.Dnsbl = require('./dnsbl.js');
	global.Tools = require('./tools');

	global.toId = function (text) {
		if (text && text.id) {
			text = text.id;
		} else if (text && text.userid) {
			text = text.userid;
		}
		if (typeof text !== 'string' && typeof text !== 'number') return '';
		return ('' + text).toLowerCase().replace(/[^a-z0-9]+/g, '');
	};

	global.Servers = {};

	if (Config.crashguard) {
		// graceful crash
		process.on('uncaughtException', err => {
			require('./crashlogger.js')(err, 'Socket process ' + cluster.worker.id + ' (' + process.pid + ')', true);
		});
	}

	/*********************************************************
	 * Instalar plugins
	 *********************************************************/

	const PublicPromise = require('./plugins/utils/promise-public');
	const object_merge = require('./plugins/utils/object-merge');

	let customTasks = new Map();

	process.request = function (namespace, message, identifier) {
		identifier = identifier ? '' + identifier : '';
		let prefix = '@' + namespace + (identifier ? '|' + identifier : '') + '\n';

		process.send(prefix + message);
		if (identifier) {
			let promise = new PublicPromise().then(function (value) {
				customTasks.delete(prefix.slice(0, -1));
				return Promise.resolve(value);
			});
			customTasks.set(prefix.slice(0, -1), promise);
			return promise;
		} else {
			return Promise.resolve(null);
		}
	};

	function loadPlugins() { // eslint-disable-line no-inner-declarations
		global.Plugins = require('./plugins');

		Plugins.init();
		Plugins.eventEmitter.setMaxListeners(Object.size(Plugins.plugins));

		Plugins.forEach(plugin => {
			if (typeof plugin.init === 'function') {
				plugin.init();
			}
			if (typeof plugin.loadData === 'function') {
				plugin.loadData();
			}
			if (plugin.globalScope) {
				global[typeof plugin.globalScope === 'string' ? plugin.globalScope : plugin.id] = plugin;
			}
		});
	}

	function reloadPlugins() { // eslint-disable-line
		 const pluginCache = {
			dynamic: {},
			dataLoaded: {},
			version: {},
		};

		Plugins.forEach(plugin => {
			if (!plugin || typeof plugin !== 'object' && typeof plugin !== 'function') return;

			const id = plugin.id;
			if (typeof plugin.deinit === 'function') {
				plugin.deinit();
			}
			if (plugin === global[plugin.globalScope]) {
				delete global[plugin.globalScope];
			}
			if (typeof plugin.dynamic === 'object') {
				pluginCache.dynamic[id] = plugin.dynamic;
			}
			pluginCache.dataLoaded[id] = !!plugin.dataLoaded;
			pluginCache.version[id] = plugin.version;
		});
		delete global.Plugins;
		global.Plugins = Tools.reloadModule('./plugins');

		Plugins.init();
		Plugins.eventEmitter.setMaxListeners(Object.size(Plugins.plugins));

		Plugins.forEach(plugin => {
			if (!plugin || typeof plugin !== 'object' && typeof plugin !== 'function') {
				Plugins.eventEmitter.emit('error', new Error("Plugin inválido.")).flush();
			}
			const id = plugin.id;

			if (typeof plugin.init === 'function') {
				plugin.init(pluginCache.version[id], pluginCache.dynamic[id]);
			}

			if (pluginCache.dynamic[id]) {
				object_merge(plugin.dynamic, pluginCache.dynamic[id], true);
			}

			if (typeof plugin.loadData === 'function' && !pluginCache.dataLoaded[id]) {
				plugin.loadData(pluginCache.version[id]);
			} else {
				plugin.dataLoaded = pluginCache.dataLoaded[id];
			}
			if (plugin.globalScope) {
				global[typeof plugin.globalScope === 'string' ? plugin.globalScope : id] = plugin;
			}
		});
	}

	loadPlugins();

	let app = Servers['app'] = http.createServer();
	let appssl;
	if (Config.ssl) {
		appssl = Servers['appssl'] = https.createServer(Config.ssl.options);
	}
	const nodestatic = (() => {
		try	{
			require.resolve('node-static');
		} catch (err) {
			console.error(err.code === 'MODULE_NOT_FOUND' ? "No se pudo iniciar node-static - Utiliza `npm install` si deseas utilizarlo" : err.stack);
		}
		try {
			return require('node-static');
		} catch (err) {
			console.error(err.stack);
		}
	})();

	let cssserver, avatarserver, staticserver;
	if (nodestatic) {
		cssserver = Servers['css-static'] = new nodestatic.Server('./config');
		avatarserver = Servers['avatar-static'] = new nodestatic.Server('./config/avatars');
		staticserver = Servers['static-static'] = new nodestatic.Server(Config.staticserver || './srv');

		let staticRequestHandler = function (request, response) {
			if (Config.customhttpresponse) {
				for (let urlStart in Config.customhttpresponse) {
					if (request.url.startsWith(urlStart) && Config.customhttpresponse[urlStart](request, response)) {
						return;
					}
				}
			}
			request.resume();
			request.on('end', function () {
				let server;
				if (this.url === '/custom.css') {
					server = cssserver;
				} else if (this.url.substr(0, 9) === '/avatars/') {
					this.url = this.url.substr(8);
					server = avatarserver;
				} else {
					if (/^\/([A-Za-z0-9][A-Za-z0-9-]*)\/?$/.test(this.url)) {
						this.url = '/';
					}
					server = staticserver;
				}
				server.serve(this, response, (e, res) => {
					if (e && (e.status === 404)) {
						staticserver.serveFile('404.html', 404, {}, this, response);
					}
				});
			});
		};

		app.on('request', staticRequestHandler);
		if (appssl) {
			appssl.on('request', staticRequestHandler);
		}
	}

	// SockJS server

	// This is the main server that handles users connecting to our server
	// and doing things on our server.

	let sockjs = require('sockjs');

	let server = Servers['sockjs'] = sockjs.createServer({
		sockjs_url: '//play.pokemonshowdown.com/js/lib/sockjs-0.3.min.js',
		log: (severity, message) => {
			if (severity === 'error') console.log("ERROR: " + message);
		},
		prefix: '/showdown',
	});

	let sockets = {};
	let channels = {};
	let subchannels = {};

	// Deal with phantom connections.
	let sweepClosedSockets = function () {
		for (let s in sockets) {
			if (sockets[s].protocol === 'xhr-streaming' &&
				sockets[s]._session &&
				sockets[s]._session.recv) {
				sockets[s]._session.recv.didClose();
			}

			// A ghost connection's `_session.to_tref._idlePrev` (and `_idleNext`) property is `null` while
			// it is an object for normal users. Under normal circumstances, those properties should only be
			// `null` when the timeout has already been called, but somehow it's not happening for some connections.
			// Simply calling `_session.timeout_cb` (the function bound to the aformentioned timeout) manually
			// on those connections kills those connections. For a bit of background, this timeout is the timeout
			// that sockjs sets to wait for users to reconnect within that time to continue their session.
			if (sockets[s]._session &&
				sockets[s]._session.to_tref &&
				!sockets[s]._session.to_tref._idlePrev) {
				sockets[s]._session.timeout_cb();
			}
		}
	};
	let interval = setInterval(sweepClosedSockets, 1000 * 60 * 10); // eslint-disable-line no-unused-vars

	process.on('message', data => {
		// console.log('worker received: ' + data);
		let socket = null, socketid = '';
		let channel = null, channelid = '';
		let subchannel = null, subchannelid = '';

		switch (data.charAt(0)) {
		case '%': {
			// Master requests work
			let nlLoc = data.indexOf('\n');
			let prefix = data.slice(1, nlLoc);
			let pipeLoc = prefix.indexOf('|');

			let namespace = pipeLoc >= 0 ? prefix.slice(0, pipeLoc) : prefix;
			let identifier = pipeLoc >= 0 ? prefix.slice(pipeLoc + 1) : '';
			let result = data.slice(nlLoc + 1);
			Plugins.eventEmitter.emit('Message', process, namespace, identifier, result).flush();
			break;
		}

		case '@': {
			// Master reporting back!
			let nlLoc = data.indexOf('\n');
			let prefix = data.slice(0, nlLoc);
			let result = data.slice(nlLoc + 1);

			if (!customTasks.has(prefix)) {
				require('./crashlogger.js')(new Error("Invalid task " + JSON.stringify(prefix) + "`. Valid tasks: " + Array.from(customTasks.keys())));
				break;
			}
			customTasks.get(prefix).resolve(result);
			break;
		}

		case '$': // $code
			eval(data.substr(1));
			break;

		case '!': // !socketid
			// destroy
			socketid = data.substr(1);
			socket = sockets[socketid];
			if (!socket) return;
			socket.end();
			// After sending the FIN packet, we make sure the I/O is totally blocked for this socket
			socket.destroy();
			delete sockets[socketid];
			for (channelid in channels) {
				delete channels[channelid][socketid];
			}
			break;

		case '>': {
			// >socketid, message
			// message
			let nlLoc = data.indexOf('\n');
			socket = sockets[data.substr(1, nlLoc - 1)];
			if (!socket) return;
			socket.write(data.substr(nlLoc + 1));
			break;
		}

		case '#': {
			// #channelid, message
			// message to channel
			let nlLoc = data.indexOf('\n');
			channel = channels[data.substr(1, nlLoc - 1)];
			let message = data.substr(nlLoc + 1);
			for (socketid in channel) {
				channel[socketid].write(message);
			}
			break;
		}

		case '+': {
			// +channelid, socketid
			// add to channel
			let nlLoc = data.indexOf('\n');
			socketid = data.substr(nlLoc + 1);
			socket = sockets[socketid];
			if (!socket) return;
			channelid = data.substr(1, nlLoc - 1);
			channel = channels[channelid];
			if (!channel) channel = channels[channelid] = Object.create(null);
			channel[socketid] = socket;
			break;
		}

		case '-': {
			// -channelid, socketid
			// remove from channel
			let nlLoc = data.indexOf('\n');
			channelid = data.slice(1, nlLoc);
			channel = channels[channelid];
			if (!channel) return;
			socketid = data.slice(nlLoc + 1);
			delete channel[socketid];
			if (subchannels[channelid]) delete subchannels[channelid][socketid];
			let isEmpty = true;
			for (let socketid in channel) { // eslint-disable-line no-unused-vars
				isEmpty = false;
				break;
			}
			if (isEmpty) {
				delete channels[channelid];
				delete subchannels[channelid];
			}
			break;
		}

		case '.': {
			// .channelid, subchannelid, socketid
			// move subchannel
			let nlLoc = data.indexOf('\n');
			channelid = data.slice(1, nlLoc);
			let nlLoc2 = data.indexOf('\n', nlLoc + 1);
			subchannelid = data.slice(nlLoc + 1, nlLoc2);
			socketid = data.slice(nlLoc2 + 1);

			subchannel = subchannels[channelid];
			if (!subchannel) subchannel = subchannels[channelid] = Object.create(null);
			if (subchannelid === '0') {
				delete subchannel[socketid];
			} else {
				subchannel[socketid] = subchannelid;
			}
			break;
		}

		case ':': {
			// :channelid, message
			// message to subchannel
			let nlLoc = data.indexOf('\n');
			channelid = data.slice(1, nlLoc);
			channel = channels[channelid];
			subchannel = subchannels[channelid];
			let message = data.substr(nlLoc + 1);
			let messages = [null, null, null];
			for (socketid in channel) {
				switch (subchannel ? subchannel[socketid] : '0') {
				case '1':
					if (!messages[1]) {
						messages[1] = message.replace(/\n\|split\n[^\n]*\n([^\n]*)\n[^\n]*\n[^\n]*/g, '\n$1');
					}
					channel[socketid].write(messages[1]);
					break;
				case '2':
					if (!messages[2]) {
						messages[2] = message.replace(/\n\|split\n[^\n]*\n[^\n]*\n([^\n]*)\n[^\n]*/g, '\n$1');
					}
					channel[socketid].write(messages[2]);
					break;
				default:
					if (!messages[0]) {
						messages[0] = message.replace(/\n\|split\n([^\n]*)\n[^\n]*\n[^\n]*\n[^\n]*/g, '\n$1');
					}
					channel[socketid].write(messages[0]);
					break;
				}
			}
			break;
		}

		default:
		}
	});

	process.on('disconnect', () => {
		process.exit();
	});

	// this is global so it can be hotpatched if necessary
	let isTrustedProxyIp = Dnsbl.checker(Config.proxyip);
	let socketCounter = 0;
	server.on('connection', socket => {
		if (!socket) {
			// For reasons that are not entirely clear, SockJS sometimes triggers
			// this event with a null `socket` argument.
			return;
		} else if (!socket.remoteAddress) {
			// This condition occurs several times per day. It may be a SockJS bug.
			try {
				socket.end();
			} catch (e) {}
			return;
		} else if (socket.remoteAddress.startsWith('::ffff:')) {
			socket.remoteAddress = socket.remoteAddress.slice(7);
		}
		let socketid = socket.id = (++socketCounter);

		sockets[socket.id] = socket;

		if (isTrustedProxyIp(socket.remoteAddress)) {
			let ips = (socket.headers['x-forwarded-for'] || '').split(',');
			let ip;
			while ((ip = ips.pop())) {
				ip = ip.trim();
				if (!isTrustedProxyIp(ip)) {
					socket.remoteAddress = ip;
					break;
				}
			}
		}

		process.send('*' + socketid + '\n' + socket.remoteAddress.replace(/\n/g, '') + '\n' + (socket.headers['user-agent'] || ''));

		socket.on('data', message => {
			// drop empty messages (DDoS?)
			if (!message) return;
			// drop legacy JSON messages
			if (typeof message !== 'string' || message.charAt(0) === '{') return;
			// drop blank messages (DDoS?)
			let pipeIndex = message.indexOf('|');
			if (pipeIndex < 0 || pipeIndex === message.length - 1) return;

			process.send('<' + socketid + '\n' + message);
		});

		socket.on('close', () => {
			process.send('!' + socketid);
			delete sockets[socketid];
			for (let channelid in channels) {
				delete channels[channelid][socketid];
			}
		});
	});
	server.installHandlers(app, {});
	if (Config.bindaddress === '0.0.0.0') Config.bindaddress = undefined;
	app.listen(Config.port, Config.bindaddress || undefined);
	console.log("Trabajador ahora escuchando en " + (Config.bindaddress || "*") + ":" + Config.port);

	if (appssl) {
		server.installHandlers(appssl, {});
		appssl.listen(Config.ssl.port);
		console.log("Trabajador ahora escuchando de forma segura en el puerto " + Config.ssl.port);
	}

	console.log("Prueba el servidor en http://" + (Config.bindaddress || "localhost") + ":" + Config.port);

	//require('./repl.js').start('sockets-', cluster.worker.id + '-' + process.pid, cmd => eval(cmd));
//}
}
