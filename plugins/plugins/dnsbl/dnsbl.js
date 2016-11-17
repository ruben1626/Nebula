"use strict";

/**
 *	DNSBL
 *	DNS-based filtering
 *
 *	Developed by Slayer95
 *
 */

const fs = require('fs');

const dnsblDataFile = DATA_DIR + 'dns-blacklist.json';
const userCountDataFile = DATA_DIR + 'dns-usercount.json';

let hostData = {};
let userCount = Object.create(null);

function evalDnsbl(target, room, user, connection) {
	/* eslint-disable no-unused-vars */
	const battle = room.battle;
	const me = user;
	return eval(target);
	/* eslint-enable no-unused-vars */
}

const saveDnsblData = exports.saveData = function () {
	fs.writeFileSync(dnsblDataFile, JSON.stringify(hostData));
};

const saveUserCount = function () {
	fs.writeFileSync(userCountDataFile, JSON.stringify(userCount));
};

function updateWhiteList(minCount) {
	if (!minCount) return false;
	const addedHosts = [];
	for (let host in userCount) {
		if (userCount[host] >= minCount) {
			if (!hostData.whiteList.short.has(host)) addedHosts.push(host);
			hostData.whiteList.short.add(host);
		}
	}
	saveDnsblData();
	return addedHosts;
}

function isWhiteListedHost(host, fallback) {
	if (!host) return !!fallback;
	const shortHost = Punishments.shortenHost(host);
	return !!hostData.whiteList.short.has(shortHost);
}

function isWhiteListedUser(user, fallback) {
	const host = user.latestHost;
	return isWhiteListedHost(host);
}

exports.dynamic = {
	hostData: hostData,
	userCount: userCount,
};

exports.loadData = function () {
	let dataPath = dnsblDataFile;
	try {
		require.resolve(dataPath);
	} catch (err) {
		console.log("No se encontró un archivo `dns-blacklist.json` preexistente.");
		dataPath = './data/dns-blacklist-example.json';
		try {
			require.resolve(dataPath);
		} catch (err) {
			if (err) return Plugins.eventEmitter.emit('error', new Error("No se encontró un ejemplo para `dns-blacklist.json`.", 'fatal', err)).flush();
		}
	}

	try {
		const readJSON = require(dataPath);
		readJSON.whiteList.exact = new Plugins.JSONSet(readJSON.whiteList.exact);
		readJSON.whiteList.fragments = new Plugins.JSONSet(readJSON.whiteList.fragments);
		readJSON.blackList.exact = new Plugins.JSONSet(readJSON.blackList.exact);
		readJSON.blackList.fragments = new Plugins.JSONSet(readJSON.blackList.fragments);

		Object.assign(hostData, readJSON);
	} catch (err) {
		console.error("!! Archivo `dns-blacklist.json` no válido!!");

		Plugins.eventEmitter.emit('error', new Error("Archivo `dns-blacklist.json` no válido", 'warn', err)).flush();
		const stack = ("" + err.stack).split('\n').slice(0, 2).map(Tools.escapeHTML).join("<br />");
		if (Rooms.lobby) {
			Rooms.lobby.addRaw("<div class=\"broadcast-red\"><b>ERROR AL INTENTAR CARGAR LOS DATOS DE PROXY:</b><br>" + stack + "<br /><br>Por favor, conservar la calma mientras nos encargamos.</div>").update();
		}
		return;
	}

	exports.dataLoaded = true;
};

function onReverseDNS(host) {
	if (host) {
		const shortHost = Punishments.shortenHost(host);
		if (!userCount[shortHost]) userCount[shortHost] = 0;
		userCount[shortHost]++;
	}
}

function exactBlackListed(host) {
	return hostData.blackList.exact.has(host);
}

function fragmentBlackListed(host) {
	const parts = host.split('.');
	for (let i = 0; i < parts.length; i++) {
		if (hostData.blackList.fragments.has(parts[i])) return true;
	}
	return false;
}

exports.init = function () {
	Plugins.eventEmitter.on('ReverseDNS', onReverseDNS);
};

exports.deinit = function () {
	Plugins.eventEmitter.off('ReverseDNS', onReverseDNS);
};

exports.commands = {
	gendnswl: function (target, room, user, connection) {
		if (!user.hasConsoleAccess(connection)) {
			return this.errorReply(`Acceso denegado.`);
		}
		target = parseInt(target, 10);
		if (!target || target < 0) return this.sendReply(`Indica la cantidad mínima de usuarios.`);

		const addedHosts = updateWhiteList(target);
		const sampleHosts = addedHosts.length > 20 ? addedHosts.slice(0, 20) : addedHosts;
		return this.sendReply(
			`Los siguientes hosts han sido agregados a la lista blanca: ${sampleHosts.join(', ')}` +
			(addedHosts.length !== sampleHosts ? ` y ${sampleHosts.length - addedHosts.length} más.` : ``)
		);
	},
	banhost: function (target, room, user, connection) {
		if (!this.can('hotpatch')) return;
		let targetHost = target.trim().toLowerCase();
		let isFragment = false;
		if (!/^[0-9a-z\-\.:]+$/.test(targetHost)) {
			 isFragment = /^\*\.[0-9a-z\-\.:]+\.\*$/.test(targetHost);
			 if (!isFragment) return this.errorReply(`Indica un host válido`);
			 targetHost = targetHost.slice(2, -2);
		}
		const entry = isFragment ? 'fragments' : 'exact';
		const targetList = hostData.blackList[entry];
		if (targetList.has(targetHost)) return this.errorReply(`El host indicado ya estaba bloqueado permanentemente.`);
		if (hostData.whiteList[entry].has(targetHost)) return this.errorReply(`El host indicado estaba en la lista blanca.`);

		targetList.add(targetHost);
		saveDnsblData();

		Rooms.global.modlog(`(global) HOSTBAN: [${targetHost}] por ${user.name}`);
		return this.sendReply(`El host '${targetHost}' ha sido bloqueado permanentemente.`);
	},
};

exports.isWhiteListedHost = isWhiteListedHost;
exports.isWhiteListedUser = isWhiteListedUser;
exports.updateWhiteList = updateWhiteList;
exports.eval = evalDnsbl;

Config.hostfilter = function (host, user) {
	if (Config.spammode && !isWhiteListedHost(host) && !user.trusted || host.length > 128) {
		user.send("|popup|Tu ISP está temporalmente bloqueado de hablar en chats, batallas y enviar mensajes privados por precaución.");
		user.locked = '#whitelist';
		user.updateIdentity();
		return;
	}
	if (exactBlackListed(host)) {
		user.send("|popup|Estás bloqueado de hablar en chats, batallas y enviar mensajes privados.");
		user.locked = '#blacklist';
		user.updateIdentity();
		return;
	}
	if (fragmentBlackListed(host)) {
		user.send("|popup|Estás bloqueado de hablar en chats, batallas y enviar mensajes privados.");
		user.locked = '#proxy';
		user.updateIdentity();
		return;
	}
};
