/**
 * Main file
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * This is the main Pokemon Showdown app, and the file you should be
 * running to start Pokemon Showdown if you're using it normally.
 *
 * This file sets up our SockJS server, which handles communication
 * between users and your server, and also sets up globals. You can
 * see details in their corresponding files, but here's an overview:
 *
 * Users - from users.js
 *
 *   Most of the communication with users happens in users.js, we just
 *   forward messages between the sockets.js and users.js.
 *
 * Rooms - from rooms.js
 *
 *   Every chat room and battle is a room, and what they do is done in
 *   rooms.js. There's also a global room which every user is in, and
 *   handles miscellaneous things like welcoming the user.
 *
 * Tools - from tools.js
 *
 *   Handles getting data about Pokemon, items, etc.
 *
 * Ladders - from ladders.js and ladders-remote.js
 *
 *   Handles Elo rating tracking for players.
 *
 * Simulator - from simulator.js
 *
 *   Used to access the simulator itself.
 *
 * CommandParser - from command-parser.js
 *
 *   Parses text commands like /me
 *
 * Sockets - from sockets.js
 *
 *   Used to abstract out network connections. sockets.js handles
 *   the actual server and connection set-up.
 *
 * @license MIT license
 */

'use strict';

const fs = require('fs');
const path = require('path');

/*********************************************************
 * Make sure we have everything set up correctly
 *********************************************************/

// Make sure our dependencies are available, and install them if they
// aren't

try {
	require.resolve('sockjs');
} catch (e) {
	if (require.main !== module) throw new Error("Dependencies unmet");

	let command = 'npm install --production';
	console.log('Installing dependencies: `' + command + '`...');
	require('child_process').spawnSync('sh', ['-c', command], {stdio: 'inherit'});
}

/*********************************************************
 * Load configuration
 *********************************************************/

try {
	require.resolve('./config/config.js');
} catch (err) {
	if (err.code !== 'MODULE_NOT_FOUND') throw err; // should never happen

	// Copy it over synchronously from config-example.js since it's needed before we can start the server
	console.log("config.js doesn't exist - creating one with default settings...");
	fs.writeFileSync(path.resolve(__dirname, 'config/config.js'),
		fs.readFileSync(path.resolve(__dirname, 'config/config-example.js'))
	);
} finally {
	global.Config = require('./config/config.js');
}

if (Config.watchconfig) {
	fs.watchFile(path.resolve(__dirname, 'config/config.js'), (curr, prev) => {
		if (curr.mtime <= prev.mtime) return;
		try {
			delete require.cache[require.resolve('./config/config.js')];
			global.Config = require('./config/config.js');
			if (global.Users) Users.cacheGroupData();
			console.log('Reloaded config/config.js');
		} catch (e) {
			console.log('Error reloading config/config.js: ' + e.stack);
		}
	});
}

/*********************************************************
 * Set up most of our globals
 *********************************************************/

global.splint = function (target, separator, length) {
	if (!separator) separator = ',';

	let cmdArr = [];
	if (length > 0) {
		let sepIndex = -1;
		for (let count = 0; ; count++) { // jscs:ignore disallowSpaceBeforeSemicolon
			sepIndex = target.indexOf(separator);
			if (count + 1 === length) {
				cmdArr.push(target);
				break;
			} else if (sepIndex === -1) {
				cmdArr.push(target);
				break;
			} else {
				cmdArr.push(target.to(sepIndex));
				target = target.from(sepIndex + 1);
			}
		}
	} else if (length < 0) {
		let sepIndex = -1;
		for (let count = length; ; count++) { // jscs:ignore disallowSpaceBeforeSemicolon
			sepIndex = target.lastIndexOf(separator);
			if (count === -1) {
				cmdArr.unshift(target);
				break;
			} else if (sepIndex === -1) {
				cmdArr.unshift(target);
				break;
			} else {
				cmdArr.unshift(target.from(sepIndex + 1));
				target = target.to(sepIndex);
			}
		}
	} else {
		cmdArr = target.split(separator);
	}
	return cmdArr.map('trim');
};

global.toUserName = function (userid) {
	let user = Users.getExact(userid);
	if (user) return user.name;
	if (Users.usergroups[userid]) return Users.usergroups[userid].slice(1).trim();
	return userid;
};

global.Monitor = require('./monitor.js');

global.Tools = require('./tools.js');
global.toId = Tools.getId;

global.LoginServer = require('./loginserver.js');

global.Ladders = require(Config.remoteladder ? './ladders-remote.js' : './ladders.js');

global.Users = require('./users.js');

global.Punishments = require('./punishments.js');

global.Rooms = require('./rooms.js');

delete process.send; // in case we're a child process
global.Verifier = require('./verifier.js');
Verifier.PM.spawn();

global.CommandParser = require('./command-parser.js');

global.Simulator = require('./simulator.js');

global.Tournaments = require('./tournaments');

global.Dnsbl = require('./dnsbl.js');
Dnsbl.loadDatacenters();

if (Config.crashguard) {
	// graceful crash - allow current battles to finish before restarting
	process.on('uncaughtException', err => {
		let crashMessage = require('./crashlogger.js')(err, 'The main process');
		if (crashMessage !== 'lockdown') return;
		let stack = Tools.escapeHTML(err.stack).split("\n").slice(0, 2).join("<br />");
		if (Rooms.lobby) {
			Rooms.lobby.addRaw('<div class="broadcast-red"><b>THE SERVER HAS CRASHED:</b> ' + stack + '<br />Please restart the server.</div>');
			Rooms.lobby.addRaw('<div class="broadcast-red">You will not be able to start new battles until the server restarts.</div>');
			Rooms.lobby.update();
		}
		Rooms.global.lockdown = true;
	});
	process.on('unhandledRejection', err => {
		throw err;
	});
}

/*********************************************************
 * Start networking processes to be connected to
 *********************************************************/

global.Sockets = require('./sockets.js');

exports.listen = function (port, bindAddress, workerCount) {
	Sockets.listen(port, bindAddress, workerCount);
};

if (require.main === module) {
	// if running with node app.js, set up the server directly
	// (otherwise, wait for app.listen())
	let port;
	if (process.argv[2]) {
		port = parseInt(process.argv[2]); // eslint-disable-line radix
	}
	Sockets.listen(port);
}

/*********************************************************
 * Set up our last global
 *********************************************************/

// Generate and cache the format list.
Tools.includeFormats();
Rooms.global.formatListText = Rooms.global.getFormatListText();

global.TeamValidator = require('./team-validator.js');
TeamValidator.PM.spawn();

/*********************************************************
 * Instalar plugins
 *********************************************************/
global.Plugins = require('./plugins');

Plugins.init();
Plugins.eventEmitter.setMaxListeners(Object.size(Plugins.plugins));

Plugins.forEach(function (plugin) {
	if (plugin.commands && typeof plugin.commands === 'object') {
		Object.merge(CommandParser.commands, plugin.commands, true);
	}
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

Tools.includeMods();

/*********************************************************
 * Start up the REPL server
 *********************************************************/

require('./repl.js').start('app', cmd => eval(cmd));
