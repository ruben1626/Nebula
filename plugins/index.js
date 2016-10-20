"use strict";

/**
 *
 *	Plugins for Pokémon Showdown
 *
 *	This file, plugins.js, is loaded directly from app.js
 *
 *	Plugins are pieces of code that can be added to PS code. They are treated as objects.
 *	They have some reserved properties, which you may use in new plugins, according to what is needed.
 *
 *		'version'
 *			This is a string that specifies the version of the plugin.
 *			When the chat is hotpatched, the old version is passed as a parameter for ´init´ and ´loadData´ (see below).
 *
 *		'commands'
 *			This object is expected to contain functions, each one being a command
 *			If there are any two commands with the same name, the last loaded one will override the first one
 *			When the chat is hotpatched, commands will be reloaded.
 *
 *		'dynamic'
 *			This object is expected to contain data relevant to the plugin, that will change while the server is running
 *			When the chat is hotpatched, anything contained in 'dynamic' will be recovered after the plugin loads.
 *			However, any new direct property will still be added to it.
 *			This is done through a deep merge, so if a variable was defined pointing to something in the default 'dynamic' object,
 *			after the merge the variable will point to the values it had before hotpatching.
 *			Note that this implies that, if for whatever reason, a dynamic property is deleted,
 *			it will be restored on hotpatch, provided that it is still in the plugin file.
 *
 *		'init'
 *			This is a function that will be called after the plugin has finished loading, but
 *			before the dynamic data is recovered.
 *			When the chat is hotpatched, only the new version of the function will be executed.
 *
 *		'deinit'
 *			This is a function that will be called before anything is reloaded when hotpatching the chat.
 *
 *		'loadData'
 *			This is a function that will be called when first initialized -just after 'init' is (or isn't) executed-.
 *			It will be called on hotpatch, after the dynamic data is recovered, if and only if 'dataLoaded' is falsy.
 *
 *		'dataLoaded'
 *			This is the boolean property that determines whether 'loadData' is called or not as the last step of hotpatching plugins.
 *			Its value should be set to true or false depending on the success of the loading process.
 *			Also, if it's true, it's value is kept true after hotpatching.
 *
 *		'globalScope'
 *			This is the boolean property that determines whether or not the plugin can be accessed directly from the global scope,
 *			and not only as a property of the Plugins global.
 *
 *		'eval'
 *			This method will be called from Plugins.eval or the hereby provided custom /eval command for specific plugin syntax.
 *
 *
 *	In addition, each plugin may have any other property or method.
 *
 *	Each plugin is loaded as a property of the 'plugins' property in the global object 'Plugins'.
 *	They can be easily accessed with ´Plugins.get('myPlugin')´ or, with shorthand notation: ´Plugins('myPlugin')´.
 *
 *	To add any plugins, you must first create a subdirectory named 'plugins' within the plugins directory.
 *  Each plugin gets a subdirectory there, so if you are copying it to the server, just copy the plugin directory and enable it.
 *  In order to enable a plugin, you must first create a file named `index.yaml' in the root plugins folder.
 *  Enabled plugins must be listed there, as a YAML list (i.e. prefix each item with a hyphen `-`).
 *
 *	To disable any plugin, just delete the line where it's loaded. Alternatively, you can comment it out with the symbol '#'.
 *
 *  Plugin creation
 *  Soon™...
 *
 */

/* global Plugins: true */

const cluster = require('cluster');
const path = require('path');
const fs = require('fs');
const util = require('util');

const validate = require('validate-npm-package-name');
const events = require('./events');

const Plugins = function (plugin, required) {
	if (!Plugins.plugins[plugin] && required) throw new Error("No se encontró el plugin " + plugin + ".");
	return Plugins.plugins[plugin];
};
const plugins = Plugins.plugins = Object.create(null);
Plugins.get = Plugins;
Plugins.forEach = function (callback, thisArg) {
	return Object.values(plugins).forEach(callback, thisArg);
};
Plugins.each = function (callback, thisArg) {
	return Object.values(plugins).each(callback, thisArg);
};
Plugins.validateName = function (name) {
	return validate(name).validForNewPackages && encodeURIComponent(name) === name;
};
Plugins.load = function (pluginPath) {
	const plugin = require('./plugins/' + pluginPath);
	if (!plugin || typeof plugin !== 'object' && typeof plugin !== 'function') {
		throw new Error("Plugin inválido: ´" + pluginPath + "´.");
	}
	plugin.id = pluginPath;
	if (!cluster.isMaster && !plugin.multiProcess) {
		Object.defineProperty(plugins, pluginPath, {
			value: plugin,
			enumerable: false,
			writable: true,
			configurable: true,
		});
		return;
	}
	return (plugins[pluginPath] = plugin);
};
Plugins.initData = function () {
	const dataFolders = ['config', 'custom-data', 'data'];

	for (let id of Object.getOwnPropertyNames(plugins)) {
		if (plugins[id].dataLoaded) continue;
		if (plugins[id].initData) {
			plugins[id].initData();
			continue;
		}
		for (let i = 0; i < dataFolders.length; i++) {
			let dataFolder = dataFolders[i];
			try {
				let fileList = fs.readdirSync(path.join(__dirname, 'plugins', id, dataFolder));
				let fileDict = Object.create(null);
				let exampleFiles = [];
				for (let fileName of fileList) {
					let ext = path.extname(fileName);
					if (ext !== '.json' && ext !== '.js' && ext !== '.txt' && ext !== '.tsv' && ext !== '.csv' && ext !== '.pem') continue;
					let name = fileName.slice(0, -ext.length);
					if (!fileDict[name]) fileDict[name] = Object.create(null);
					fileDict[name][ext] = 1;
					if (name.slice(-8) === '-example') exampleFiles.push({name: name.slice(0, -8), ext: ext});
				}
				for (let fileData of exampleFiles) {
					if (fileDict[fileData.name] && fileDict[fileData.name][fileData.ext]) continue;
					let baseFileName = path.join(__dirname, 'plugins', id, dataFolder, fileData.name);
					fs.writeFileSync("" + baseFileName + fileData.ext, fs.readFileSync("" + baseFileName + "-example" + fileData.ext));
				}
			} catch (e) {
				if (e.code !== 'ENOENT' && e.code !== 'ENOTDIR') throw e;
			}
		}
	}
};
Plugins.inspect = function (target, options) {
	if (typeof target === 'string') return "[String: " + target + "]";
	if (typeof target === 'function') return "[Function: " + target.toString() + "]";
	return util.inspect(target, options || {depth: 1});
};
Plugins.eval = function (target, id) {
	if (typeof id !== 'undefined') return plugins[id].eval(target);
	return eval(target);
};
Plugins.path = __dirname;
Plugins.config = {};
try {
	Plugins.config = require('./config');
	Plugins.configLoaded = true;
} catch (err) {
	if (typeof err.stack === 'string') {
		const stack = err.stack.split('\n');
		stack[0] = stack[0].replace(/(.*)(Error\:\s)(.*)/, "$1$2Archivo de configuración de plugins `config.js` inexistente o inválido: $3");
		err.stack = stack.join('\n');
	}
	require('./../crashlogger')(err);
}

const eventEmitter = Plugins.eventEmitter = new events.EventEmitter();

const logs = Plugins.logs = Object.create(null);
Plugins.addLogger = function (id, details, options, fn) {
	if (!plugins[id] || details && !Plugins.validateName(details)) throw new Error("Parámetros inválidos para registro");

	if (!options) options = {};
	if (!options.relativeDir || typeof options.relativeDir !== 'string') options.relativeDir = '';

	const hideTimeStamps = !!options.hideTimeStamps;
	const fullname = options.relativeDir + (details ? details + 'Log_' + id : id);

	if (typeof logs[fullname] === 'undefined') {
		logs[fullname] = fs.createWriteStream(__dirname + '/logs/' + fullname + '.txt', {flags:'a+'}).on('error', function (err) {
			eventEmitter.emit('error', err);
			if (!eventEmitter.isDefaultPrevented()) {
				logs[fullname] = false;
			}
			eventEmitter.flush();
		});
	}

	if (fn) {
		return function (room, text) {
			if (!logs[fullname]) return false;
			const timeStamp = hideTimeStamps ? "" : "[" + (new Date().toJSON()) + "] ";
			if (typeof text === 'undefined') {
				logs[fullname].write(timeStamp + fn(room) + '\n');
			} else {
				logs[fullname].write(timeStamp + '(' + toId(room) + ') ' + fn(text) + '\n');
			}
		};
	} else {
		return function (room, text) {
			if (!logs[fullname]) return false;
			const timeStamp = hideTimeStamps ? "" : "[" + (new Date().toJSON()) + "] ";
			if (typeof text === 'undefined') {
				logs[fullname].write(timeStamp + room + '\n');
			} else {
				logs[fullname].write(timeStamp + '(' + toId(room) + ') ' + text + '\n');
			}
		};
	}
};
Plugins.removeLogger = function (id, details, options) {
	if (!options) options = {};
	if (!options || typeof options.relativeDir !== 'string') options.relativeDir = '/';

	const fullname = options.relativeDir + (details ? id + '__' + details : id);
	if (!logs[fullname]) return;

	logs[fullname].end();
	logs[fullname] = false;
};
Plugins.addErrorLogger = function (id, details, options, callback) {
	if (!options) options = {};
	options.relativeDir = 'errors/';
	return Plugins.addLogger(id, details, options, callback);
};
Plugins.removeErrorLogger = function (id, details, options) {
	if (!options) options = {};
	options.relativeDir = 'errors/';
	return Plugins.removeLogger(id, details, options);
};

exports = module.exports = Plugins;
Plugins.init = require('./init');

Plugins.ErrorCreator = require('./plugin-error');
Plugins.Errors = require('./utils/builtin-errors');

// Utility classes
Plugins.JSONSet = require('./utils/json-set');
Plugins.JSONMap = require('./utils/json-map');
Plugins.InjectiveMap = require('./utils/injective-map');
Plugins.CancellableQueue = require('./utils/cancellable-queue');
Plugins.Dictionary = require('./utils/dictionary');

Plugins.CryptoHandler = require('./utils/auth');
Plugins.PublicPromise = require('./utils/promise-public');

// Utility functions
Plugins.BrowserRequire = require('./utils/browser-require');
Plugins.Colors = require('./utils/colors');
Plugins.HTML = require('./utils/html');
Plugins.Merge = require('./utils/object-merge');
