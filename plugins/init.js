"use strict";

/**
 *
 *	Plugin initializer
 *
 */

/* global Plugins: true */

const fs = require('fs');
const path = require('path');
const cluster = require('cluster');

const yamljs = require('yamljs');

const object_merge = require('./utils/object-merge');
const ErrorCreator = require('./plugin-error');

let Plugins = require('./');
const LoaderError = new ErrorCreator('@@Loader');
let eventEmitter = null;
let plugins = {};

const errorPreHandler = function (error) {
	if (!(error instanceof Error)) throw new TypeError(`Did not emit a proper Error instance`);
	const severity = error.severity || 'critical';
	this.env('severity', severity);

	const severityTable = ['debug', 'warning', 'minor', 'critical', 'fatal'];
	if (severityTable.indexOf(severity) < 0) {
		console.error(`Error emitted with invalid severity: "${severity}".`);
		this.env('severity', 'fatal'); // RIP
	}
};
const errorPostHandler = function (error, options = {}) {
	if (!error || !options || typeof options !== 'object') throw new Error(`Bad error event parameters`);
	if (!this.isDefaultPrevented()) {
		if (error.source && !(error instanceof LoaderError)) Plugins.addErrorLogger(error.source)("" + error.stack);
		const severity = this.env('severity');
		if (severity === 'fatal') throw error; // bubble-up
		const severityTable = ['debug', 'warning', 'minor', 'critical', 'fatal'];
		if (severityTable.indexOf(severity) >= severityTable.indexOf(Plugins.config.logLevel || 'critical')) {
			const fakeErr = Object.create(Object.getPrototypeOf(error));
			Object.getOwnPropertyNames(error).forEach(function (name) {
				fakeErr[name] = error[name];
			});
			if (error.originalError) options.trueStack = error.originalError.stack;
			require('./../crashlogger')(fakeErr, error.source ? `Plugin ${error.source}` : `A plugin`, options);
		}
	}
};

/**
 * Commands useful for any plugin
 *	The /setlanguage command is currently needed for a server-side multilanguage implementation of tour.js
 *	However, it's expected to be useful for any other plugin supporting more than one language.
 *
 *	The behavior of hotpatch described above is only true if the /hotpatch command implemented here is used.
 *
 *	The command /eval (and, similarly, its shortcut >>) will now support /eval plugin:<name> <code> to call the 'eval' method of a plugin.
 *	The original syntax will still be available. However, the original command /eval in 'chat-commands.js' must be renamed to /evalcommands
 *	in order to keep the context of 'chat-commands.js' available to the hereby provided /eval command.
 *
 */
const pluginCommands = {
	language: 'setlanguage',
	setlanguage: function (target, room, user) {
		if (!this.can('makeroom')) return;
		const targetId = toId(target);
		const validLanguage = {'spanish':1, 'english':1, 'french':1, 'portuguese':1, 'italian':1, 'multilanguage':1};
		if (!(targetId in validLanguage)) return this.sendReply("" + target + " es un idioma no valido por ahora. Son validos: " + Object.keys(validLanguage).join(", "));
		room.language = targetId;
		this.sendReply("El idioma de la sala ha sido cambiado a " + target);
		if (room.chatRoomData) {
			room.chatRoomData.language = targetId;
			Rooms.global.writeChatRoomData();
		}
	},

	hotpatch: function (target, room, user, connection) {
		if (!this.can('hotpatch')) return false;
		if (!target) return this.parse('/help hotpatch');
		if (Monitor.hotpatchLock) return this.errorReply("Los parches instantáneos están desactivados. (" + Monitor.hotpatchLock + ")");

		this.logEntry("" + user.name + " utilizó /hotpatch " + target);
		let staff = Rooms('staff');
		if (staff) staff.add("(" + user.name + " actualizó el servidor)").update();

		if (target === 'chat' || target === 'commands') {
			try {
				global.Chat = Tools.reloadModule('./chat');
				Chat.loadCommands();

				/**
				 * Plugin hotpatch
				 */

				 const pluginCache = {
					dynamic: {},
					dataLoaded: {},
					version: {},
				};

				Plugins.forEach(function (plugin) {
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

				global.Plugins = Tools.reloadModule('./plugins');
				Plugins = global.Plugins; // make sure to override the local variable as well
				eventEmitter = Plugins.eventEmitter;
				plugins = Plugins.init().plugins;
				eventEmitter.setMaxListeners(Object.size(plugins));

				Plugins.forEach(function (plugin) {
					if (!plugin || typeof plugin !== 'object' && typeof plugin !== 'function') {
						eventEmitter.emit('error', new Error("Plugin inválido.")).flush();
					}
					const id = plugin.id;
					if (plugin.commands && typeof plugin.commands === 'object') {
						object_merge(Chat.commands, plugin.commands, {deep: true});
					}
					if (typeof plugin.init === 'function') {
						plugin.init(pluginCache.version[id], pluginCache.dynamic[id]);
					}

					if (pluginCache.dynamic[id]) {
						object_merge(plugin.dynamic, pluginCache.dynamic[id], {deep: true});
					}

					if (typeof plugin.loadData === 'function' && !pluginCache.dataLoaded[id]) {
						plugin.loadData(pluginCache.version[id]);
					} else {
						plugin.dataLoaded = pluginCache.dataLoaded[id];
					}
					if (plugin.globalScope) {
						global[typeof plugin.globalScope === 'string' ? plugin.globalScope : id] = plugin;
					}

					if (typeof plugin.onLoad === 'function') {
						plugin.onLoad();
					}
				});

				const runningTournaments = Tournaments.tournaments;
				Tools.uncacheTree('./tournaments');
				global.Tournaments = require('./../tournaments');
				Tournaments.tournaments = runningTournaments;

				return this.sendReply("Los comandos de chat han sido actualizados.");
			} catch (e) {
				return this.sendReply("Se presento un error al intentar actualizar el chat:\n" + e.stack);
			}
		} else if (target === 'battles') {
			Rooms.SimulatorProcess.respawn();
			return this.sendReply("Las batallas han sido actualizadas. Aquellas que empiecen desde ahora utilizaran el nuevo codigo, pero las que estan en curso usaran el antiguo.");
		} else if (target === 'formats') {
			try {
				const toolsLoaded = Object.values(Tools.dexes).filter(dex => dex.dataLoaded).length;
				global.Tools = Tools.reloadModule('./tools')[toolsLoaded >= 2 ? 'includeModData' : (toolsLoaded ? 'includeData' : 'includeMods')](); // note: this will lock up the server for a few seconds

				global.TeamValidator = Tools.reloadModule('./team-validator');

				// rebuild the formats list
				delete Rooms.global.formatList;
				// respawn validator processes
				/*
				TeamValidator.ValidatorProcess.respawn();
				//*/
				global.battleProtoCache.clear();
				// respawn simulator processes
				/*
				Rooms.SimulatorProcess.respawn();
				//*/
				// broadcast the new formats list to clients
				Rooms.global.send(Rooms.global.formatListText);

				return this.sendReply("Los formatos han sido actualizados.");
			} catch (e) {
				return this.sendReply("Se presento un error al intentar actualizar los formatos:\n" + e.stack);
			}
		} else if (target === 'loginserver') {
			fs.unwatchFile('./config/custom.css');
			global.LoginServer = Tools.reloadModule('./loginserver.js');
			return this.sendReply("El login server ha sido actualizado. Nuevas solicitudes utilizarán el nuevo código.");
		} else if (target === 'dnsbl') {
			Dnsbl.loadDatacenters();
			return this.sendReply("Dnsbl has been hotpatched.");
		} else if (target === 'learnsets') {
			try {
				const toolsLoaded = Object.values(Tools.dexes).filter(dex => dex.dataLoaded).length;
				global.Tools = Tools.reloadModule('./tools')[toolsLoaded >= 2 ? 'includeModData' : (toolsLoaded ? 'includeData' : 'includeMods')](); // note: this will lock up the server for a few seconds
				global.TeamValidator = Tools.reloadModule('./team-validator');

				return this.sendReply("La listas de movimientos aprendidos ha sido actualizada.");
			} catch (e) {
				return this.sendReply("Se presento un error al intentar actualizar las listas de movimientos aprendidos:\n" + e.stack);
			}
		} else if (target.startsWith('disable')) {
			let reason = target.split(', ')[1];
			if (!reason) return this.errorReply("Uso: /hotpatch disable, [razón]");
			Monitor.hotpatchLock = reason;
			return this.sendReply("Has desactivado el uso de hotpatch hasta el próximo reinicio del servidor.");
		}
		this.parse('/help hotpatch');
	},
	hotpatchhelp: ["Un 'hot-patch' permite actualizar partes del servidor sin interrumpir batallas activas. Requiere: ~",
		"El uso de esta función incrementa el consumo de memoria RAM del servidor, comparado con una actualización por medio de un reinicio.",
		"/hotpatch chat - recarga command-parser.js y archivos de comandos",
		"/hotpatch battles - inicia nuevos procesos del simulador de batallas",
		"/hotpatch formats - recarga las dependencias de tools.js, reconstruye y actualiza la lista de formatos; inicia nuevos procesos de batallas asimismo",
	],
	'eval': function (target, room, user, connection, cmd) {
		/* eslint-disable no-unused-vars */
		if (!user.hasConsoleAccess(connection)) {
			return this.sendReply("" + this.cmdToken + cmd + " - Acceso denegado.");
		}
		if (!this.runBroadcast()) return;

		Plugins.eventEmitter.emit('console', cmd, target, connection).flush();

		try {
			const battle = room.battle;
			const me = user;
			let name;
			let plugin;
			let method;
			if (target.startsWith('plugin:')) {
				target = target.slice(7);
				let spaceIndex = -1;
				let startPos = 0;
				let substring = target;
				let escapeCharCount = 0;
				while (spaceIndex === -1) {
					spaceIndex = target.indexOf(' ', startPos);
					if (spaceIndex === -1) {
						name = target.replace(/\\\\/g, '\\');
						target = '';
						break;
					}
					substring = target.substr(0, spaceIndex);
					escapeCharCount = 0;
					for (let i = substring.length - 1; i > 0; i--) {
						if (substring[i] !== '\\') break;
						escapeCharCount++;
					}
					if (escapeCharCount % 2 === 1) {
						// the found space character was actually escaped
						substring = substring.replace('\\ ', ' ');
						target = target.replace('\\ ', ' ');
						startPos = spaceIndex;
						spaceIndex = -1;
					} else {
						name = substring.replace(/\\\\/g, '\\');
						target = target.slice(spaceIndex + 1);
					}
				}
				plugin = plugins[name];
				if (!plugin) throw new Error("No plugin was found to match the name '" + name + "'.");
				method = plugin.eval;
				if (!method) throw new Error("Plugin '" + name + "' has no method 'eval'.");
			}
			if (method) {
				if (!this.broadcasting) this.sendReply('||>> ' + target);
				this.sendReply('||<< ' + Plugins.inspect(method.call(this, target, room, user, connection)));
			} else if (Chat.commands['evalcommands']) {
				this.target = target;
				this.run('evalcommands');
			} else {
				if (!this.runBroadcast()) return;
				if (!this.broadcasting) this.sendReply('||>> ' + target);
				this.sendReply('||<< ' + Plugins.inspect(eval(target, room, user, connection)));
			}
		} catch (e) {
			this.sendReply('||<< error: ' + e.message);
			const stack = '||' + ('' + e.stack).replace(/\n/g, '\n||');
			connection.sendTo(room, stack);
		}
		/* eslint-enable no-unused-vars */
	},
};

/**
 *
 *  Event system applied
 *  Pokémon Showdown's internal methods, adapted to work with plugins.
 *
 */

 /**
 *	GlobalRoom methods
 *	In all the cases, the caller's arguments are passed to the event.
 *  Some other arguments may be added, depending on the case. See the specific method for details.
 *
 *		'startBattle' emits the 'BattleStart' event.
 *			In addition to all the native arguments of `startBattle`, the new room is passed to the event.
 *			If any call of 'onStartBattle' returns exactly null, then the default message for battle start will not be shown regardless of ´Config.reportbattles´.
 */

function startBattle(p1, p2, format, p1team, p2team, options) {
	if (typeof p1 === 'object' && !p1.userid) options = p1;

	if (options && options.logData) {
		p1 = options.logData.p1;
		p2 = options.logData.p2;
		format = options.logData.log.find(elem => elem.startsWith('|tier|')).split('|').slice(2).join('|');
		p1team = Tools.packTeam(options.logData.p1team);
		p2team = Tools.packTeam(options.logData.p2team);
	}

	p1 = Users.get(p1);
	p2 = Users.get(p2);

	if (!p1 || !p2) {
		// most likely, a user was banned during the battle start procedure
		return;
	}
	if (p1 === p2) {
		this.cancelSearch(p1);
		this.cancelSearch(p2);
		p1.popup("No puedes pelear contra ti mismo.");
		return;
	}

	if (this.lockdown === true) {
		this.cancelSearch(p1);
		this.cancelSearch(p2);
		p1.popup("El servidor se reiniciará, no es posible iniciar batallas ahora. Las batallas estarán disponibles nuevamente dentro de unos minutos.");
		p2.popup("El servidor se reiniciará, no es posible iniciar batallas ahora. Las batallas estarán disponibles nuevamente dentro de unos minutos.");
		return;
	}

	/*
	console.log('BATTLE START BETWEEN: '+p1.userid+' '+p2.userid);
	//*/
	let i = this.lastBattle + 1;
	const formaturlid = format.toLowerCase().replace(/[^a-z0-9]+/g, '');
	while (Rooms.rooms.has('battle-' + formaturlid + '-' + i)) {
		i++;
	}
	this.lastBattle = i;
	Rooms.global.writeNumRooms();
	const newRoom = Rooms.createBattle('battle-' + formaturlid + '-' + i, format, p1, p2, options);

	if (options && options.logData) {
		newRoom.battle.readLogData(options.logData);
	}

	p1.joinRoom(newRoom);
	p2.joinRoom(newRoom);
	newRoom.battle.addPlayer(p1, p1team);
	newRoom.battle.addPlayer(p2, p2team);
	this.cancelSearch(p1);
	this.cancelSearch(p2);

	Plugins.eventEmitter.emit('BattleStart', p1, p2, format, p1team, p2team, options, newRoom);
	const suppressReport = !!Plugins.eventEmitter.getData().silent;

	if (Config.reportbattles && !suppressReport) {
		const msg = "<a href=\"/battle-" + formaturlid + "-" + this.lastBattle + "\" class=\"ilink\"><b> Ha empezado una batalla de formato " + Tools.getFormat(format).name + " entre " + Chat.escapeHTML(toUserName(p1.userid)) + " y " + Chat.escapeHTML(toUserName(p2.userid)) + ".</b></a>";
		Rooms.lobby.addRaw(msg).update();
	}
	if (Config.logladderip && options.rated) {
		if (!this.ladderIpLog) {
			this.ladderIpLog = fs.createWriteStream('logs/ladderip/ladderip.txt', {flags: 'a'});
		}
		this.ladderIpLog.write(p1.userid + ': ' + p1.latestIp + '\n');
		this.ladderIpLog.write(p2.userid + ': ' + p2.latestIp + '\n');
	}
	return newRoom;
}

 /**
 *	BattleRoom methods
 *	These methods emit certain events at Plugins.eventEmitter.
 *	In all the cases, the caller's arguments are passed to the event.
 *  The `this` parameter (i.e. the room instance) is passed as an additional argument.
 *
 *		'requestKickInactive' emits the 'RequestKickInactive' event.
 *			The event's default action is to activate the timer. If `preventDefault()` is called, it won't be activated.
 *			Otherwise, if the event data `ticks` is set, then that will be the amount of ticks the timer will last (one tick is 10 seconds).
 *
 *		'win' emits the 'BattleWin' event.
 *
 */

function requestKickInactive(user, force) {
	if (this.resetTimer) {
		if (user) this.sendUser(user, "|inactive|El reloj de batalla esta encendido.");
		return false;
	}

	eventEmitter.emit('RequestKickInactive', user, force, this);
	if (eventEmitter.isDefaultPrevented()) return eventEmitter.end(false);
	const ticks = eventEmitter.getData().ticks;

	if (user) {
		if (!force && !(user in this.game.players)) return false;
		this.resetUser = user.userid;
		this.send("|inactive|Reloj de batalla ENCENDIDO por : " + user.name + ". El jugador inactivo sera descalificado.");
	} else if (user === false) {
		this.resetUser = '~';
		this.add("|inactive|Reloj de batalla ENCENDIDO. El jugador inactivo sera descalificado.");
	}

	// a tick is 10 seconds

	let maxTicksLeft = 15; // 2 minutes 30 seconds
	if (!this.battle.p1 || !this.battle.p2 || !this.battle.p1.active || !this.battle.p2.active) {
		// if a player has left, don't wait longer than 6 ticks (1 minute)
		maxTicksLeft = 6;
	}
	if (!this.rated && !this.tournamentData) {
		maxTicksLeft = 30;
	}

	if (ticks) maxTicksLeft = ticks;

	this.sideTurnTicks = [maxTicksLeft, maxTicksLeft];

	const inactiveSide = this.getInactiveSide();
	if (inactiveSide < 0) {
		// add 10 seconds to bank if they're below 160 seconds
		if (this.sideTicksLeft[0] < 16) this.sideTicksLeft[0]++;
		if (this.sideTicksLeft[1] < 16) this.sideTicksLeft[1]++;
	}
	this.sideTicksLeft[0]++;
	this.sideTicksLeft[1]++;
	if (inactiveSide !== 1) {
		// side 0 is inactive
		const ticksLeft0 = Math.min(this.sideTicksLeft[0] + 1, maxTicksLeft);
		this.sendPlayer(0, "|inactive|Tienes " + (ticksLeft0 * 10) + " segundos para tomar una decision.");
	}
	if (inactiveSide !== 0) {
		// side 1 is inactive
		const ticksLeft1 = Math.min(this.sideTicksLeft[1] + 1, maxTicksLeft);
		this.sendPlayer(1, "|inactive|Tienes " + (ticksLeft1 * 10) + " segundos para tomar una decision.");
	}

	this.resetTimer = setTimeout(this.kickInactive.bind(this), 10 * 1000);
	return true;
}

function win(winner) {
	eventEmitter.emit('BattleWin', winner, this).flush();

	let p1score = 0.5;
	let winnerid = toId(winner);

	if (this.rated) {
		this.rated = false;
		let p1 = this.battle.p1;
		let p2 = this.battle.p2;

		if (winnerid === p1.userid) {
			p1score = 1;
		} else if (winnerid === p2.userid) {
			p1score = 0;
		}

		let p1name = p1.name;
		let p2name = p2.name;

		winner = Users.get(winnerid);
		if (winner && !winner.registered) {
			this.sendUser(winner, '|askreg|' + winner.userid);
		}
		// update rankings
		Ladders(this.battle.format).updateRating(p1name, p2name, p1score, this);
	} else if (Config.logchallenges) {
		// Log challenges if the challenge logging config is enabled.
		if (winnerid === this.p1.userid) {
			p1score = 1;
		} else if (winnerid === this.p2.userid) {
			p1score = 0;
		}
		this.update();
		this.logBattle(p1score);
	}
	if (Config.autosavereplays) {
		// TODO
	}
	if (this.tour) {
		winner = Users.get(winner);
		this.tour.onBattleWin(this, winnerid);
		this.tour = null;
	}
	this.update();
}

exports = module.exports = function () {
	eventEmitter = Plugins.eventEmitter;

	// Initialize error handling for Plugin event emitter
	eventEmitter.on('error', errorPreHandler);
	if (Plugins.config.errorHandler) {
		if (typeof Plugins.config.errorHandler !== 'function') {
			throw new TypeError(
				"Error en configuración de plugins: " +
				"el manipulador de excepciones debe ser una función, " +
				"no un " + typeof Plugins.config.errorHandler + "."
			);
		}
		eventEmitter.on('error', Plugins.config.errorHandler);
	}
	eventEmitter.on('error', errorPostHandler);

	// Create our needed folders in the file system
	try {
		fs.mkdirSync(__dirname + '/logs');
	} catch (err) {
		if (err.code !== 'EEXIST') {
			eventEmitter.emit('error', err);
			if (!eventEmitter.isDefaultPrevented()) {
				Plugins.log = function () {};
			}
			eventEmitter.flush();
		}
	}
	try {
		fs.mkdirSync(__dirname + '/logs/errors');
	} catch (err) {
		if (err.code !== 'EEXIST') {
			eventEmitter.emit('error', err);
			if (!eventEmitter.isDefaultPrevented()) {
				Plugins.log = function () {};
			}
			eventEmitter.flush();
		}
	}

	if (cluster.isMaster) {
		// Implement commands
		Object.assign(Chat.commands, pluginCommands);

		// Implement methods
		Rooms.GlobalRoom.prototype.startBattle = startBattle;
		Rooms.BattleRoom.prototype.requestKickInactive = requestKickInactive;
		Rooms.BattleRoom.prototype.win = win;
	}

	/**
	 *	Time to actually load the plugins
	 */

	try {
		const pluginList = yamljs.load(path.join(__dirname, 'index.yaml'));
		if (!Array.isArray(pluginList)) throw new SyntaxError();
		for (let i = 0, len = pluginList.length; i < len; i++) {
			let pluginPath = pluginList[i];
			if (!Plugins.validateName(pluginPath)) throw new SyntaxError("Nombre de plugin inválido");
			if (plugins[pluginPath]) continue;
			try {
				Plugins.load(pluginPath);
				if (Object.prototype.hasOwnProperty.call(Plugins.plugins, pluginPath)) {
					Object.defineProperty(plugins, pluginPath, Object.getOwnPropertyDescriptor(Plugins.plugins, pluginPath));
				}
			} catch (e) {
				e.source = '@@Loader';
				eventEmitter.emit('error', new LoaderError("Error al cargar plugin `" + pluginPath + "`", e)).flush();
			}
		}
	} catch (err) {
		if (!err.stack && err.snippet) err.stack = "Error al interpretar L" + (err.parsedLine || "?") + ": '" + err.snippet + "'";
		eventEmitter.emit('error', new LoaderError("Formato de lista de plugins inválido", err)).flush();
	}

	if (Config.isInitialization) Plugins.initData();

	return exports;
};
