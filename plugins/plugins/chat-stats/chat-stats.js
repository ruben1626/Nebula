"use strict";

/**
 *	LogStats
 *	Analyzer of chat logs for active users and trends
 *
 *	Developed by Slayer95
 *
 */

const fs = require('fs');
const path = require('path');

const MAX_TOP_USERS = 80;

function evalLogStats(target, room, user, connection) {
	/* eslint-disable no-unused-vars */
	const battle = room.battle;
	const me = user;
	return eval(target);
	/* eslint-enable no-unused-vars */
}

function getLogFolders(roomid) {
	const id = toId(roomid);
	if (!id) return [];
	try {
		const dirs = fs.readdirSync(path.resolve(LOGS_DIR, 'chat', id));
		return dirs.filter(directory => directory !== 'today.txt');
	} catch (e) {
		return [];
	}
}

function getLogIndex(roomid, month) {
	const id = toId(roomid);
	if (!id) return [];
	try {
		return fs.readdirSync(path.resolve(LOGS_DIR, 'chat', id, month));
	} catch (e) {
		return [];
	}
}

function getLog(roomid, datePath) {
	const id = toId(roomid);
	if (!id) return ``;
	try {
		return fs.readFileSync(path.resolve(LOGS_DIR, 'chat', id, datePath), 'utf8');
	} catch (e) {
		return ``;
	}
}

function getChatLines(log) {
	const lines = log.split('\n');
	return lines.filter(line => line.slice(9, 12) === '|c|' && line.slice(12, 14) !== '~|');
}

function splitLines(lines) {
	return lines.map(line => {
		const pipeIndex = line.indexOf('|');
		if (pipeIndex < 0) return null;
		const pipeIndex2 = line.indexOf('|', pipeIndex + 1);
		if (pipeIndex2 < 0) return null;
		const pipeIndex3 = line.indexOf('|', pipeIndex2 + 1);
		if (pipeIndex3 < 0) return null;
		const userId = toId(line.slice(pipeIndex2 + 1, pipeIndex3));
		return [userId, line.slice(pipeIndex3 + 1)];
	});
}

function groupByUser(lines) {
	const groups = Object.create(null);
	for (let i = 0; i < lines.length; i++) {
		let lineData = lines[i];
		if (lineData[0] in groups) {
			groups[lineData[0]].lines.push(lineData[1]);
		} else {
			groups[lineData[0]] = {
				userId: lineData[0],
				lines: [lineData[1]],
			};
		}
	}
	return groups;
}

function getArrangedLog(roomId, days) {
	const today = new Date();

	const paths = [];
	for (const folder of getLogFolders(roomId)) {
		if (today.daysSince(Date.create(folder).endOfMonth()) > days) continue;
		for (const logIndex of getLogIndex(roomId, folder)) {
			if (today.daysSince(Date.create(logIndex.slice(0, 10)).endOfDay()) > days) continue;
			paths.push(path.join(folder, logIndex));
		}
	}
	paths.sort();

	const log = paths.map(relativePath => getLog(roomId, relativePath)).join(''); // This is a BIG string
	const lines = splitLines(getChatLines(log));
	return groupByUser(lines);
}

function getLastLogs(roomId, days = 7, sortFunction) {
	const groups = getArrangedLog(roomId, days);
	const pattern = /\B(\!)|((?::\))|(?::\-\))|(?::\()|(?::\-\()|(?:8\-\))|(?:8\))|(?:B\-\))|(?:B\))|(?::\-P)|(?::P)|(?::\-p)|(?::p)|(?:=P)|(?:=p)|(?:o.O)|(?:O.o)|(?::v)|(?:O:\))|(?:O:\-\))|(?:<3)|(?::\'\()|(?::\-D)|(?::D)|(?:=D)|(?:8\-\|)|(?:8\|)|(?:B\-\|)|(?:B\|)|(?:;\-\))|(?:;\))|(?::\-\&)|(?::\&)|(?::\-O)|(?::O)|(?::\-o)|(?::o)|(?:3:\))|(?:3:\-\))|(?::\-\/)|(?::\/)|(?::\-\))|(?::\)))\B(?!\w)/g;

	for (let userid in groups) {
		let capRatio = 0;
		let angryLines = 0;
		let emotionRate = 0;

		let count = groups[userid].lines.length;
		for (let i = 0, l = groups[userid].lines.length; i < l; i++) {
			let line = groups[userid].lines[i];
			if (!line.length) continue;
			let distance = Tools.levenshtein(line, line.toLowerCase());
			capRatio += distance / line.length;
			if (distance > 0.3 || line.search(pattern) > -1) emotionRate++;
		}
		capRatio /= count;
		emotionRate /= count;

		groups[userid].count = count;
		groups[userid].capRatio = capRatio;
		groups[userid].emotionRate = emotionRate;
		groups[userid].angryLines = angryLines;
	}

	if (!sortFunction) return Object.values(groups);

	const sortedUsers = Object.keys(groups).sort(sortFunction.bind(groups));
	const results = sortedUsers.map(user => groups[user]);
	return results;
}

function getSortFunction(target) {
	return function (b, a) {
		return this[a].count - this[b].count;
	};
}

function toPercent(number) {
	number = Number(number);
	if (isNaN(number)) return 'NaN';
	return `${Math.round(number * 100)}%`;
}

exports.commands = {
	chatstats: function (target, room, user, connection) {
		if (!user.hasConsoleAccess(connection)) {
			return this.sendReply(`Acceso denegado.`);
		}

		if (!target) {
			if (room.type !== 'chat') return this.parse('/help chatstats');
			target = room.id;
		}

		const targets = splint(target, ',', -2);

		const targetRoom = Rooms.search(targets[0]);
		const targetDays = targets.length >= 2 ? Number(targets[1]) : 7;
		if (!targetRoom || targetRoom.type !== 'chat') return this.errorReply(`"${targets[0]}" no es una sala de chat.`);
		if (isNaN(targetDays) || targetDays <= 0 || !Number.isSafeInteger(targetDays)) return this.errorReply(`"${targets[1]}" no es un número de días válido.`);

		const roomId = targetRoom.id;
		const activeUsers = getLastLogs(roomId, targetDays, getSortFunction(target)).slice(0, MAX_TOP_USERS);

		const msg = (
			`<h3 style="text-align:center">Usuarios con más líneas de chat (últimos ${targetDays} días)</h3>` +
			`<table class="basictable scrollable" style="display:inline-block; margin-left:100px; max-height:400px" cellspacing="0" cellpadding="3">` +
			`<tr><th>Usuario</th><th>Líneas</th><th>Mayúsculas</th><th>Emotividad</th></tr>` +
			Plugins.HTML.getRowGroup(activeUsers.map(userData => Plugins.HTML.getRow([
				Plugins.Colors.apply(userData.userId).getIdentity(),
				userData.count,
				toPercent(userData.capRatio),
				toPercent(userData.emotionRate),
			]))) +
			`</table>`
		);
		return this.sendReply(`|raw|${msg}`);
	},
};

exports.getLog = getLog;
exports.getLastLogs = getLastLogs;
exports.eval = evalLogStats;
