/**
 * Command parser
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * This is the command parser. Call it with CommandParser.parse
 * (scroll down to its definition for details)
 *
 * Individual commands are put in:
 *   commands.js - "core" commands that shouldn't be modified
 *   chat-plugins/ - other commands that can be safely modified
 *
 * The command API is (mostly) documented in chat-plugins/COMMANDS.md
 *
 * @license MIT license
 */

/*

To reload chat commands:

/hotpatch chat

*/

'use strict';

const MAX_MESSAGE_LENGTH = 300;

const BROADCAST_COOLDOWN = 20 * 1000;

const MESSAGE_COOLDOWN = 5 * 60 * 1000;

const MAX_PARSE_RECURSION = 10;

const VALID_COMMAND_TOKENS = '/!';

const BROADCAST_TOKEN = '!';

const NULL_USERID_REGEX_SOURCE = '([^a-zA-Z0-9]{1,17})?';

const fs = require('fs');
const path = require('path');

exports.multiLinePattern = {
	elements: [],
	regexp: null,
	register: function (elem) {
		if (Array.isArray(elem)) {
			elem.forEach(elem => this.elements.push(elem));
		} else {
			this.elements.push(elem);
		}
		this.regexp = new RegExp('^(' + this.elements.map(elem => '(?:' + elem + ')').join('|') + ')', 'i');
	},
	test: function (text) {
		if (!this.regexp) return false;
		return this.regexp.test(text);
	},
};

/*********************************************************
 * Load command files
 *********************************************************/

let baseCommands = exports.baseCommands = require('./commands').commands;
let commands = exports.commands = Object.assign({}, baseCommands);

/*********************************************************
 * Parser
 *********************************************************/

class CommandContext {
	constructor(options) {
		this.cmd = options.cmd || '';
		this.cmdToken = options.cmdToken || '';

		this.target = options.target || '';
		this.message = options.message || '';

		this.levelsDeep = options.levelsDeep || 0;
		this.namespaces = options.namespaces || null;

		this.room = options.room || null;
		this.user = options.user || null;
		this.connection = options.connection || null;

		this.targetUser = null;
		this.targetUsername = '';
		this.inputUsername = '';
	}

	checkFormat(room, message) {
		if (!room) return false;
		if (!room.filterStretching && !room.filterCaps) return false;
		let formatError = [];
		// Removes extra spaces and null characters
		message = message.trim().replace(/[ \u0000\u200B-\u200F]+/g, ' ');

		let stretchMatch = room.filterStretching && message.match(/(.+?)\1{7,}/i);
		let capsMatch = room.filterCaps && message.match(/[A-Z\s]{18,}/);

		if (stretchMatch) {
			formatError.push("too much stretching");
		}
		if (capsMatch) {
			formatError.push("too many capital letters");
		}
		if (formatError.length > 0) {
			return formatError.join(' and ') + ".";
		}
		return false;
	}

	checkSlowchat(room, user) {
		if (!room || !room.slowchat) return true;
		let lastActiveSeconds = (Date.now() - user.lastMessageTime) / 1000;
		if (lastActiveSeconds < room.slowchat) return false;
		return true;
	}

	checkBanwords(room, message) {
		if (!room) return true;
		if (!room.banwordRegex) {
			if (room.banwords && room.banwords.length) {
				room.banwordRegex = new RegExp('(?:\\b|(?!\\w))(?:' + room.banwords.join('|') + ')(?:\\b|\\B(?!\\w))', 'i');
			} else {
				room.banwordRegex = true;
			}
		}
		if (!message) return true;
		if (room.banwordRegex !== true && room.banwordRegex.test(message)) {
			return false;
		}
		return true;
	}
	sendReply(data) {
		if (this.broadcasting) {
			this.room.add(data);
		} else {
			this.connection.sendTo(this.room, data);
		}
	}
	errorReply(message) {
		if (this.pmTarget) {
			let prefix = '|pm|' + this.user.getIdentity() + '|' + (this.pmTarget.getIdentity ? this.pmTarget.getIdentity() : ' ' + this.pmTarget) + '|/error ';
			this.connection.send(prefix + message.replace(/\n/g, prefix));
		} else {
			this.sendReply('|html|<div class="message-error">' + Tools.escapeHTML(message).replace(/\n/g, '<br />') + '</div>');
		}
	}
	addBox(html) {
		this.add('|html|<div class="infobox">' + html + '</div>');
	}
	sendReplyBox(html) {
		this.sendReply('|html|<div class="infobox">' + html + '</div>');
	}
	popupReply(message) {
		this.connection.popup(message);
	}
	add(data) {
		this.room.add(data);
	}
	send(data) {
		this.room.send(data);
	}
	sendModCommand(data) {
		this.room.sendModCommand(data);
	}
	privateModCommand(data) {
		this.room.sendModCommand(data);
		this.logEntry(data);
		this.room.modlog(data);
	}
	globalModlog(action, user, text) {
		let buf = "(" + this.room.id + ") " + action + ": ";
		if (typeof user === 'string') {
			buf += "[" + toId(user) + "]";
		} else {
			let userid = user.getLastId();
			buf += "[" + userid + "]";
			if (user.autoconfirmed && user.autoconfirmed !== userid) buf += " ac:[" + user.autoconfirmed + "]";
		}
		buf += text;
		Rooms.global.modlog(buf);
	}
	logEntry(data) {
		this.room.logEntry(data);
	}
	addModCommand(text, logOnlyText) {
		this.add(text);
		this.room.modlog(text + (logOnlyText || ""));
	}
	logModCommand(text) {
		this.room.modlog(text);
	}
	can(permission, target, room) {
		if (!this.user.can(permission, target, room)) {
			this.errorReply(this.cmdToken + this.namespaces.concat(this.cmd).join(" ") + " - Access denied.");
			return false;
		}
		return true;
	}
	canBroadcast(suppressMessage) {
		if (!this.broadcasting && this.cmdToken === BROADCAST_TOKEN) {
			let message = this.canTalk(suppressMessage || this.message);
			if (!message) return false;
			if (!this.user.can('broadcast', null, this.room)) {
				this.errorReply("You need to be voiced to broadcast this command's information.");
				this.errorReply("To see it for yourself, use: /" + this.message.substr(1));
				return false;
			}

			// broadcast cooldown
			let broadcastMessage = message.toLowerCase().replace(/[^a-z0-9\s!,]/g, '');

			if (this.room.lastBroadcast === this.broadcastMessage &&
					this.room.lastBroadcastTime >= Date.now() - BROADCAST_COOLDOWN) {
				this.errorReply("You can't broadcast this because it was just broadcast.");
				return false;
			}

			this.message = message;
			this.broadcastMessage = broadcastMessage;
		}
		return true;
	}
	runBroadcast(suppressMessage) {
		if (this.broadcasting || this.cmdToken !== BROADCAST_TOKEN) {
			// Already being broadcast, or the user doesn't intend to broadcast.
			return true;
		}

		if (!this.broadcastMessage) {
			// Permission hasn't been checked yet. Do it now.
			if (!this.canBroadcast(suppressMessage)) return false;
		}

		this.add('|c|' + this.user.getIdentity(this.room.id) + '|' + (suppressMessage || this.message));
		this.room.lastBroadcast = this.broadcastMessage;
		this.room.lastBroadcastTime = Date.now();

		this.broadcasting = true;

		return true;
	}
	parse(message, inNamespace, room) {
		if (inNamespace && this.cmdToken) {
			message = this.cmdToken + this.namespaces.concat(message.slice(1)).join(" ");
		}
		return CommandParser.parse(message, room || this.room, this.user, this.connection, this.levelsDeep + 1);
	}
	run(targetCmd, inNamespace) {
		if (targetCmd === 'constructor') return this.sendReply("Access denied.");
		let commandHandler;
		if (typeof targetCmd === 'function') {
			commandHandler = targetCmd;
		} else if (inNamespace) {
			commandHandler = commands;
			for (let i = 0; i < this.namespaces.length; i++) {
				commandHandler = commandHandler[this.namespaces[i]];
			}
			commandHandler = commandHandler[targetCmd];
		} else {
			commandHandler = commands[targetCmd];
		}

		let result;
		try {
			result = commandHandler.call(this, this.target, this.room, this.user, this.connection, this.cmd, this.message);
		} catch (err) {
			if (require('./crashlogger')(err, 'A chat command', {
				user: this.user.name,
				room: this.room.id,
				message: this.message,
			}) === 'lockdown') {
				let ministack = Tools.escapeHTML(err.stack).split("\n").slice(0, 2).join("<br />");
				if (Rooms.lobby) Rooms.lobby.send('|html|<div class="broadcast-red"><b>POKEMON SHOWDOWN HAS CRASHED:</b> ' + ministack + '</div>');
			} else {
				this.sendReply('|html|<div class="broadcast-red"><b>Pokemon Showdown crashed!</b><br />Don\'t worry, we\'re working on fixing it.</div>');
			}
		}
		if (result === undefined) result = false;

		return result;
	}
	canTalk(message, room, targetUser) {
		if (room === undefined) room = this.room;
		let user = this.user;
		let connection = this.connection;

		if (!user.named) {
			connection.popup("You must choose a name before you can talk.");
			return false;
		}
		if (!user.can('bypassall')) {
			if (room && user.locked) {
				this.errorReply("You are locked from talking in chat.");
				return false;
			}
			if (room && room.isMuted(user)) {
				this.errorReply("You are muted and cannot talk in this room.");
				return false;
			}
			if ((!room || !room.battle) && (!targetUser || " +".includes(targetUser.group))) {
				// in a chat room, or PMing non-staff
				if (user.namelocked) {
					this.errorReply("You are namelocked and cannot talk except in battles and to global staff.");
					return false;
				}
			}
			if (room && room.modchat) {
				let userGroup = user.group;
				if (!user.can('makeroom')) {
					userGroup = room.getAuth(user);
				}
				if (room.modchat === 'autoconfirmed') {
					if (!user.autoconfirmed && userGroup === ' ') {
						this.errorReply("Because moderated chat is set, your account must be at least one week old and you must have won at least one ladder game to speak in this room.");
						return false;
					}
				} else if (Config.groupsranking.indexOf(userGroup) < Config.groupsranking.indexOf(room.modchat)) {
					let groupName = Config.groups[room.modchat].name || room.modchat;
					this.errorReply("Because moderated chat is set, you must be of rank " + groupName + " or higher to speak in this room.");
					return false;
				}
			}
			if (room && !(user.userid in room.users)) {
				connection.popup("You can't send a message to this room without being in it.");
				return false;
			}
		}

		if (typeof message === 'string') {
			if (!message) {
				connection.popup("Your message can't be blank.");
				return false;
			}
			let length = message.length;
			length += 10 * message.replace(/[^\ufdfd]*/g, '').length;
			if (length > MAX_MESSAGE_LENGTH && !user.can('ignorelimits')) {
				this.errorReply("Your message is too long: " + message);
				return false;
			}

			// remove zalgo
			message = message.replace(/[\u0300-\u036f\u0483-\u0489\u0610-\u0615\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06ED\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]{3,}/g, '');
			if (/[\u239b-\u23b9]/.test(message)) {
				this.errorReply("Your message contains banned characters.");
				return false;
			}

			if (this.checkFormat(room, message) && !user.can('mute', null, room)) {
				this.errorReply("Your message was not sent because it contained " + this.checkFormat(room, message));
				return false;
			}

			if (!this.checkSlowchat(room, user) && !user.can('mute', null, room)) {
				this.errorReply("This room has slow-chat enabled. You can only talk once every " + room.slowchat + " seconds.");
				return false;
			}

			if (!this.checkBanwords(room, message) && !user.can('mute', null, room)) {
				this.errorReply("Your message contained banned words.");
				return false;
			}

			if (room) {
				let normalized = message.trim();
				if (room.id === 'lobby' && (normalized === user.lastMessage) &&
						((Date.now() - user.lastMessageTime) < MESSAGE_COOLDOWN)) {
					this.errorReply("You can't send the same message again so soon.");
					return false;
				}
				user.lastMessage = message;
				user.lastMessageTime = Date.now();
			}

			if (Config.chatfilter) {
				return Config.chatfilter.call(this, message, user, room, connection, targetUser);
			}
			return message;
		}

		return true;
	}

	secureContentURIs(text) {
		return text.replace(/http\:\/\/[a-z\/\.](:\/)?[a-z\/\.]+\b/gi, match => {
			return Tools.laxSecureURI(match) || match;
		});
	}

	canEmbedURI(uri) {
		const targetURI = Tools.laxSecureURI(uri);
		if (!targetURI) return this.errorReply("El enlace '" + uri + "' no es válido.");
		if (Config.ssl && !targetURI.startsWith('https://')) return this.errorReply("El recurso deben provenir de un sitio con protocolo HTTPS, no HTTP. Ejemplo https://i.imgur.com/mi_imagen.gif o https://gyazo.com/mi_imagen.png");
		return targetURI;
	}

	canHTML(html) {
		html = Tools.getString(html).trim();
		if (!html) return '';

		html = Tools.sanitizeHTML(html, {
			exceptTokens: this.user.can('oversee') ? ['username'] : null,
			exceptValues: this.user.can('lock') ? (
				this.user.can('hotpatch') ? [
					'(pm|msg|w|whisper) [^,]{1,18}, [^\n\r\f]{1,128}',
				] : [
					'(pm|msg|w|whisper) ' + [''].concat(this.user.userid.split('').map(letter => letter !== letter.toUpperCase ? '[' + letter + letter.toUpperCase() + ']' : letter)).concat(['']).join(NULL_USERID_REGEX_SOURCE) + ',' + '[^\n\r\f]{1,128}',
				]
			) : null,
		});
		if (!html) return '';

		if (this.room.isPersonal && !this.user.can('lock') && html.match(/<button /)) {
			this.errorReply("No estás autorizado para insertar botones en HTML.");
			return false;
		}

		html = html.replace(/https:\/\/img\.prntscr\.com\//g, 'http://img.prntscr.com/');
		html = html.replace(/https:\/\/prntscr\.com\//g, 'http://prntscr.com/');
		html = html.replace(/http\:\/\/([^\.]+)\.leagueoflegends\.com\b/g, 'http://$1.leagueoflegends.com');

		let images = /<img\b[^<>]*/ig;
		let match;
		while ((match = images.exec(html))) {
			/*if (!/width=([0-9]+|"[0-9]+")/i.test(match[0]) || !/height=([0-9]+|"[0-9]+")/i.test(match[0])) {
				// Width and height are required because most browsers insert the
				// <img> element before width and height are known, and when the
				// image is loaded, this changes the height of the chat area, which
				// messes up autoscrolling.
				this.errorReply('All images must have a width and height attribute');
				return false;
			}*/
			let srcMatch = /src\w*\=\w*"?([^ "]+)(\w*")?/i.exec(match[0]);
			if (srcMatch) {
				let uri = this.canEmbedURI(srcMatch[1], true);
				if (!uri) return false;
				html = html.slice(0, match.index + srcMatch.index) + 'src="' + uri + '"' + html.slice(match.index + srcMatch.index + srcMatch[0].length);
				// lastIndex is inaccurate since html was changed
				images.lastIndex = match.index + 11;
			}
		}

		if (Config.ssl) {
			if (/<(?:audio|img|video)[^>]* src="http:\/\/[^">]+"[^>]*>/.test(html) || /<(?:audio|img|video)[^>]* src="http:\/\/[^">]+"[^>]*>/.test(html) || /url\(http:\/\//.test(html) || /url\(\&quot\;http:\/\//.test(html) || /url\(\&\#34;http:\/\//.test(html)) {
				this.errorReply("Los recursos multimedia deben provenir de un sitio con protocolo HTTPS, no HTTP. Ejemplo https://i.imgur.com/mi_imagen.gif o https://gyazo.com/mi_imagen.png");
				return false;
			}
		}
		return html;
	}
	targetUserOrSelf(target, exactName) {
		if (!target) {
			this.targetUsername = this.user.name;
			this.inputUsername = this.user.name;
			return this.user;
		}
		this.splitTarget(target, exactName);
		return this.targetUser;
	}
	splitTarget(target, exactName) {
		let commaIndex = target.indexOf(',');
		if (commaIndex < 0) {
			let targetUser = Users.get(target, exactName);
			this.targetUser = targetUser;
			this.inputUsername = target.trim();
			this.targetUsername = targetUser ? targetUser.name : target;
			return '';
		}
		this.inputUsername = target.substr(0, commaIndex);
		let targetUser = Users.get(this.inputUsername, exactName);
		if (targetUser) {
			this.targetUser = targetUser;
			this.targetUsername = targetUser.name;
		} else {
			this.targetUser = null;
			this.targetUsername = this.inputUsername;
		}
		return target.substr(commaIndex + 1).trim();
	}
	splitTargetText(target) {
		let commaIndex = target.indexOf(',');
		if (commaIndex < 0) {
			this.targetUsername = target;
			return '';
		}
		this.targetUsername = target.substr(0, commaIndex);
		return target.substr(commaIndex + 1).trim();
	}
}
exports.CommandContext = CommandContext;

/**
 * Command parser
 *
 * Usage:
 *   CommandParser.parse(message, room, user, connection)
 *
 * message - the message the user is trying to say
 * room - the room the user is trying to say it in
 * user - the user that sent the message
 * connection - the connection the user sent the message from
 *
 * Returns the message the user should say, or a falsy value which
 * means "don't say anything"
 *
 * Examples:
 *   CommandParser.parse("/join lobby", room, user, connection)
 *     will make the user join the lobby, and return false.
 *
 *   CommandParser.parse("Hi, guys!", room, user, connection)
 *     will return "Hi, guys!" if the user isn't muted, or
 *     if he's muted, will warn him that he's muted, and
 *     return false.
 */
let parse = exports.parse = function (message, room, user, connection, levelsDeep) {
	let cmd = '', target = '', cmdToken = '';
	if (!message || !message.trim().length) return;
	if (!levelsDeep) {
		levelsDeep = 0;
	} else {
		if (levelsDeep > MAX_PARSE_RECURSION) {
			return connection.sendTo(room, "Error: Too much recursion");
		}
	}

	if (message.slice(0, 3) === '>> ') {
		// multiline eval
		message = '/eval ' + message.slice(3);
	} else if (message.slice(0, 4) === '>>> ') {
		// multiline eval
		message = '/evalbattle ' + message.slice(4);
	} else if (message.slice(0, 3) === '/me' && /[^A-Za-z0-9 ]/.test(message.charAt(3))) {
		message = '/mee ' + message.slice(3);
	}

	if (VALID_COMMAND_TOKENS.includes(message.charAt(0)) && message.charAt(1) !== message.charAt(0)) {
		cmdToken = message.charAt(0);
		let spaceIndex = message.indexOf(' ');
		if (spaceIndex > 0) {
			cmd = message.substr(1, spaceIndex - 1).toLowerCase();
			target = message.substr(spaceIndex + 1);
		} else {
			cmd = message.substr(1).toLowerCase();
			target = '';
		}
	}

	let namespaces = [];
	let currentCommands = commands;
	let commandHandler;

	do {
		if (toId(cmd) === 'constructor') {
			return connection.sendTo(room, "Error: Access denied.");
		}
		commandHandler = currentCommands[cmd];
		if (typeof commandHandler === 'string') {
			// in case someone messed up, don't loop
			commandHandler = currentCommands[commandHandler];
		}
		if (commandHandler && typeof commandHandler === 'object') {
			namespaces.push(cmd);

			let spaceIndex = target.indexOf(' ');
			if (spaceIndex > 0) {
				cmd = target.substr(0, spaceIndex).toLowerCase();
				target = target.substr(spaceIndex + 1);
			} else {
				cmd = target.toLowerCase();
				target = '';
			}

			currentCommands = commandHandler;
		}
	} while (commandHandler && typeof commandHandler === 'object');
	if (!commandHandler && currentCommands.default) {
		commandHandler = currentCommands.default;
		if (typeof commandHandler === 'string') {
			commandHandler = currentCommands[commandHandler];
		}
	}
	let fullCmd = namespaces.concat(cmd).join(' ');

	let context = new CommandContext({
		target: target, room: room, user: user, connection: connection, cmd: cmd, message: message,
		namespaces: namespaces, cmdToken: cmdToken, levelsDeep: levelsDeep,
	});

	if (commandHandler) {
		return context.run(commandHandler);
	} else {
		// Check for mod/demod/admin/deadmin/etc depending on the group ids
		for (let g in Config.groups) {
			let groupid = Config.groups[g].id;
			if (cmd === groupid) {
				return parse('/promote ' + toId(target) + ', ' + g, room, user, connection, levelsDeep + 1);
			} else if (cmd === 'global' + groupid) {
				return parse('/globalpromote ' + toId(target) + ', ' + g, room, user, connection, levelsDeep + 1);
			} else if (cmd === 'de' + groupid || cmd === 'un' + groupid || cmd === 'globalde' + groupid || cmd === 'deglobal' + groupid) {
				return parse('/demote ' + toId(target), room, user, connection, levelsDeep + 1);
			} else if (cmd === 'room' + groupid) {
				return parse('/roompromote ' + toId(target) + ', ' + g, room, user, connection, levelsDeep + 1);
			} else if (cmd === 'roomde' + groupid || cmd === 'deroom' + groupid || cmd === 'roomun' + groupid) {
				return parse('/roomdemote ' + toId(target), room, user, connection, levelsDeep + 1);
			}
		}

		if (cmdToken && fullCmd) {
			// To guard against command typos, we now emit an error message
			if (cmdToken === BROADCAST_TOKEN) {
				if (/[a-z0-9]/.test(cmd.charAt(0))) {
					return context.errorReply("The command '" + cmdToken + fullCmd + "' was unrecognized.");
				}
			} else {
				return context.errorReply("The command '" + cmdToken + fullCmd + "' was unrecognized. To send a message starting with '" + cmdToken + fullCmd + "', type '" + cmdToken.repeat(2) + fullCmd + "'.");
			}
		} else if (!VALID_COMMAND_TOKENS.includes(message.charAt(0)) && VALID_COMMAND_TOKENS.includes(message.trim().charAt(0))) {
			message = message.trim();
			if (message.charAt(0) !== BROADCAST_TOKEN) {
				message = message.charAt(0) + message;
			}
		}
	}

	message = context.canTalk(message);

	return message || false;
};

exports.package = {};
fs.readFile(path.resolve(__dirname, 'package.json'), (err, data) => {
	if (err) return;
	exports.package = JSON.parse(data);
});
