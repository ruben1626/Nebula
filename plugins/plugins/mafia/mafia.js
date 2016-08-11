"use strict";

/**
 *	Mafia
 *
 *	Dependencies: None
 *	Developed by MJB47
 *	Adapted by Slayer95
 *
 */

const mafiaRoom = {
	add: function (content) {
		const room = Rooms.get('mafia');
		if (!room) return false;
		return room.add(content);
	},
};

exports.dynamic = {
	status: 'off',
	stage: 'day',
	totals: {},
	roles: ["Villager", "Doctor", "Mafia Goon", "Villager", "Mafia Goon", "Cop", "Villager", "Werewolf", "Pretty Lady", "Villager", "Mafia Goon", "Mayor", "Villager", "Mafia Pretty Lady", "1-Shot Vigilante", "1-Shot Bulletproof Townie", "Mafia Seer", "Villager", "Werewolf", "Bomb", "Miller", "Mafia Goon", "Jailkeeper", "Traitor", "Villager", "1-Shot Vigilante", "Mafia Godfather", "Villager", "Bodyguard", "1-Shot Lynchproof Townie"],
	participants: {},
	nightactors: ["Doctor", "Cop", "Werewolf", "Pretty Lady", "Mafia Pretty Lady", "1-Shot Vigilante", "Mafia Seer", "Jailkeeper", "Bodyguard"],
	nightactions: {Mafia: {}},
	inspectionresults: {},
	votes: {},
};

exports.commands = {
	startmafia: function (target, room, user) {
		if (!this.can('ban', null, room)) return false;
		if (room.id !== 'mafia') return this.sendReply('You can only start mafia games in the Mafia room.');
		if (Plugins('mafia').status !== 'off') return this.sendReply('There is already an active mafia game.');
		Plugins('mafia').status = 'signups';

		const announcement = (
			'|raw|<div class="broadcast-blue"><strong>A new mafia game has been started!' +
			' Type /joinmafia to sign up</strong></div>'
		);
		const mafiaRoom = Rooms.get('mafia');
		if (mafiaRoom) mafiaRoom.add(announcement);
	},
	endsignups: function (target, room, user) {
		if (!this.can('ban', null, room)) return false;
		if (Plugins('mafia').status !== 'signups') return this.sendReply('Signups are not currently active');
		if (Object.keys(Plugins('mafia').participants).length < 3) return this.sendReply('There are not enough participants so signups cannot end. (minimum 3 players)');
		Plugins('mafia').status = 'on';

		/**
		* to assign roles randomly we create an array of unique, incrementing and
		* shuffled integers of length equal to the number of participants, and assign roles
		* based on what the value of the array is for that participants index compared to that of
		* the "roles" array.
		*/
		const keys = Object.keys(Plugins('mafia').participants);
		const len = keys.length;
		const rlen = Plugins('mafia').roles.length;

		const randomizer = Array(len);
		for (let i = 0; i < len; i++) {
			randomizer[i] = i;
		}

		// Fisher-Yates shuffle
		for (let i = len - 1; i > 0; i--) {
			let j = Math.floor(Math.random() * (i + 1));
			let temp = randomizer[i];
			randomizer[i] = randomizer[j];
			randomizer[j] = temp;
		}

		for (let i = 0; i < len; i++) {
			let role = Plugins('mafia').roles[randomizer[i % rlen]];
			let player = keys[i];
			Plugins('mafia').participants[player] = role;

			if (role in Plugins('mafia').totals) {
				Plugins('mafia').totals[role]++;
			} else {
				Plugins('mafia').totals[role] = 1;
			}
		}

		const announcement = (
			'|raw|<div class="broadcast-blue"><strong>Signups for the mafia game have now ended!' +
			' It is ' + Plugins('mafia').stage + ' and there are: ' + JSON.stringify(Plugins('mafia').totals) + '. type "/myrole" to see your role</strong></div>'
		);
		const mafiaRoom = Rooms.get('mafia');
		if (mafiaRoom) mafiaRoom.add(announcement);
	},
	myrole: function (target, room, user) {
		if (Plugins('mafia').status !== 'on') return this.sendReply('A mafia game hasn\'t started yet');
		if (!Plugins('mafia').participants[user.userid]) return this.sendReply('You are not participating in the current mafia game.');

		const role = Plugins('mafia').participants[user.userid];
		const mafia = [];

		for (let key in Plugins('mafia').participants) {
			if (Plugins('mafia').participants[key].indexOf('Mafia') !== -1) {
				mafia.push(key);
			}
		}

		if (role.indexOf('Mafia') !== -1) {
			return this.sendReply('(You are a Mafia with: ' + mafia + ')');
		}

		return this.sendReply('(You are a: ' + Plugins('mafia').participants[user.userid] + ')');
	},
	joinmafia: function (target, room, user) {
		if (Plugins('mafia').status !== 'signups') return this.sendReply('Signups are not happening right now');
		if (room.id !== 'mafia') return this.sendReply('You can only join mafia games in the Mafia room.');
		if (Plugins('mafia').participants[user.userid]) return this.sendReply('You are already participating in the current mafia game.');
		Plugins('mafia').participants[user.userid] = '';
		mafiaRoom.add(user + ' has joined! Total players: ' + Object.keys(Plugins('mafia').participants).length);
		return this.sendReply('(You joined the mafia game!)');
	},
	lynch: function (target, room, user) {
		if (Plugins('mafia').status !== 'on') return this.sendReply('A mafia game hasn\'t started yet');
		if (!Plugins('mafia').participants[user.userid]) return this.sendReply('You are not participating in the current mafia game.');
		if (Plugins('mafia').stage !== 'day') return this.sendReply('You can only lynch during the day');

		target = this.splitTarget(target);
		let targetUser = this.targetUser;

		if (!targetUser) {
			targetUser = 'no lynch';
		} else if (!Plugins('mafia').participants[targetUser]) {
			return this.sendReply(target + ' is not participating in this mafia game or has died');
		}

		Plugins('mafia').votes[user.userid] = targetUser;

		if (targetUser === 'no lynch') {
			mafiaRoom.add(user + ' has voted to lynch: no lynch');
		} else {
			mafiaRoom.add(user + ' has voted to lynch: ' + this.targetUsername);
		}

		const keys = Object.keys(Plugins('mafia').votes);
		const totals = {};

		for (let key in Plugins('mafia').votes) {
			if (Plugins('mafia').votes[key] in totals) {
				totals[Plugins('mafia').votes[key]]++;
			} else {
				totals[Plugins('mafia').votes[key]] = 1;
			}
			// mayors vote counts as 2
			if (Plugins('mafia').participants[key.userid] === 'Mayor') {
				totals[Plugins('mafia').votes[key]]++;
			}
		}

		if (totals[targetUser] >= (Math.floor(Object.keys(Plugins('mafia').participants).length / 2) + 1)) {
			Plugins('mafia').stage = 'night';
			if (targetUser === 'no lynch') {
				mafiaRoom.add('|raw|<div class="broadcast-blue"><strong>No one was lynched!</strong></div>');
			} else if (target === '1-Shot Lynchproof Townie') {
				mafiaRoom.add('|raw|<div class="broadcast-blue"><strong>No one was lynched!</strong></div>');
				Plugins('mafia').participants[target] = 'Villager';
			} else {
				mafiaRoom.add('|raw|<div class="broadcast-blue"><strong>' + this.targetUsername + ' was lynched and was a ' + Plugins('mafia').participants[targetUser] + '!');
				delete Plugins('mafia').participants[targetUser];

				const winner = [];

				for (let key in Plugins('mafia').participants) {
					let role = Plugins('mafia').participants[key];

					if (role === 'Werewolf') {
						if (winner.indexOf('Werewolf') === -1) winner.push('Werewolf');
					} else if (role.indexOf('Mafia') !== -1 || role === 'Traitor') {
						if (winner.indexOf('Mafia') === -1) winner.push('Mafia');
					} else {
						if (winner.indexOf('Town') === -1) winner.push('Town');
					}

					if (winner.length > 1) break; // if more than 1 faction remains there is no winner
				}

				if (winner.length === 1) {
					mafiaRoom.add('|raw|<div class="broadcast-blue"><strong>' + winner[0] + ' Have won!</strong></div>');
					// reset everything to starting values

					Plugins('mafia').status = 'off';
					Plugins('mafia').stage = 'day';
					Plugins('mafia').totals = {};
					Plugins('mafia').participants = {};
					Plugins('mafia').inspectionresults = {};
					Plugins('mafia').votes = {};
					return;
				}
			}
			mafiaRoom.add('|raw|<div class="broadcast-blue"><strong>It is now ' + Plugins('mafia').stage + '. If you have a nightaction you can use it using "/nightaction target"</strong></div>');
			room.modchat = '+';
			Plugins('mafia').votes = {};

			for (let key in Plugins('mafia').participants) {
				let role = Plugins('mafia').participants[key];

				if (Plugins('mafia').nightactors.indexOf(role) !== -1) {
					if (!(role in Plugins('mafia').nightactions)) {
						Plugins('mafia').nightactions[role] = {};
					}
					Plugins('mafia').nightactions[role][key] = '';
				}
			}
			return;
		}

		if (keys.length === Object.keys(Plugins('mafia').participants).length) {
			Plugins('mafia').stage = 'night';
			mafiaRoom.add('|raw|<div class="broadcast-blue"><strong>No one was lynched! </strong></div>');
			Plugins('mafia').votes = {};

			for (let key in Plugins('mafia').participants) {
				let role = Plugins('mafia').participants[key];

				if (Plugins('mafia').nightactors.indexOf(role) !== -1) {
					if (!(role in Plugins('mafia').nightactions)) {
						Plugins('mafia').nightactions[role] = {};
					}
					Plugins('mafia').nightactions[role][key] = '';
				}
			}
			mafiaRoom.add('|raw|<div class="broadcast-blue"><strong>It is now ' + Plugins('mafia').stage + '</strong></div>');
			room.modchat = '+';
		}
	},
	nightaction: function (target, room, user) {
		if (Plugins('mafia').status !== 'on') return this.sendReply('A mafia game hasn\'t started yet');
		if (Plugins('mafia').stage !== 'night') return this.sendReply('It is not currently night');

		target = this.splitTarget(target);
		let targetUser = this.targetUser;

		if (!targetUser) {
			targetUser = 'no one';
		} else if (!Plugins('mafia').participants[targetUser]) {
			return this.sendReply(this.targetUsername + ' is not participating in this mafia game or has died');
		}

		let role = Plugins('mafia').participants[user.userid];

		if (role === 'Mafia Pretty Lady' || role === 'Mafia Seer') {
			if (target.indexOf('kill') !== -1) {
				Plugins('mafia').nightactions[role] = 'no one';
				role = 'Mafia';
			}
		}

		if (Plugins('mafia').nightactors.indexOf(role) === -1 && role.indexOf("Mafia") === -1) return this.sendReply('You do not have a night action');

		if (role.indexOf("Mafia") !== -1 && (role !== 'Mafia Pretty Lady' || role !== 'Mafia Seer') && targetUser !== 'no one') {
			if (Plugins('mafia').participants[targetUser].indexOf("Mafia") === -1) {
				Plugins('mafia').nightactions['Mafia'][user.userid] = targetUser;
			} else {
				return this.sendReply(targetUser + ' is mafia and so cannot be targeted');
			}
		} else {
			Plugins('mafia').nightactions[role][user.userid] = targetUser;
		}

		this.sendReply('You have used your nightaction on: ' + this.targetUsername);

		// check if everyone has done their night action yet
		for (let roles in Plugins('mafia').nightactions) {
			for (let player in Plugins('mafia').nightactions[roles]) {
				if (Plugins('mafia').nightactions[roles][player] === '') return;
			}
		}

		if (Object.keys(Plugins('mafia').nightactions.Mafia).length === 0) return;

		// some helper functions

		function getTargets(player) {
			const targets = {};

			role = Plugins('mafia').participants[player];
			if (role.indexOf('Mafia') !== -1 && role !== 'Mafia Pretty Lady' && role !== 'Mafia Seer') {
				role = 'Mafia';
			}

			targets['targetUser'] = Plugins('mafia').nightactions[role][player];
			if (targets['targetUser'] === 'no one') return targets;
			targets['targetRole'] = Plugins('mafia').participants[targets['targetUser']];

			if (targets['targetRole'].indexOf('Mafia') !== -1 && targets['targetRole'] !== 'Mafia Pretty Lady' && targets['targetRole'] !== 'Mafia Seer') {
				targets['targetRole'] = 'Mafia';
			}

			return targets;
		}

		function whores(key, targetRole, targetUser) {
			if (targetRole === 'Werewolf') {
				Plugins('mafia').nightactions.targetRole[targetUser] = key;
			} else {
				if (Plugins('mafia').nightactions.targetRole[targetUser]) {
					Plugins('mafia').nightactions.targetRole[targetUser] = 'no one';
				}
			}
		}

		// loop through every role to determine how they interact with a night action
		// that is not killing

		const safe = {};

		for (let key in Plugins('mafia').nightactions['Jailkeeper']) {
			let targets = getTargets(key);
			if (targets['targetUser'] === 'no one') continue;

			if (Plugins('mafia').nightactions[targets['targetRole']][targets['targetUser']]) {
				Plugins('mafia').nightactions[targets['targetRole']][targets['targetUser']] = 'no one';
			}
			safe[key] = targets['targetUser'];
		}

		for (let key in Plugins('mafia').nightactions['Pretty Lady']) {
			let targets = getTargets(key);
			if (targets['targetUser'] === 'no one') continue;

			whores(key, targets['targetRole'], targets['targetUser']);
		}

		for (let key in Plugins('mafia').nightactions['Mafia Pretty Lady']) {
			let targets = getTargets(key);
			if (targets['targetUser'] === 'no one') continue;

			whores(key, targets['targetRole'], targets['targetUser']);
		}

		for (let key in Plugins('mafia').nightactions['Doctor']) {
			let targets = getTargets(key);
			if (targets['targetUser'] === 'no one') continue;

			safe[key] = targets['targetUser'];
		}

		for (let key in Plugins('mafia').nightactions['Bodyguard']) {
			let targets = getTargets(key);
			if (targets['targetUser'] === 'no one') continue;

			safe[key] = targets['targetUser'];
		}

		for (let key in Plugins('mafia').nightactions['Cop']) {
			let targets = getTargets(key);
			if (targets['targetUser'] === 'no one') continue;

			let result;

			if (targets['targetRole'] === 'Werewolf') {
				result = 'Werewolf';
			} else if (targets['targetRole'].indexOf("Mafia") !== -1 || targets['targetRole'] === 'Traitor' || targets['targetRole'] === 'Miller' && targets['targetRole'] !== 'Mafia Godfather') {
				result = 'Mafia';
			} else {
				result = 'Town';
			}

			if (!(key in Plugins('mafia').inspectionresults)) {
				Plugins('mafia').inspectionresults.key = {};
			}

			Plugins('mafia').inspectionresults.key[targets['targetUser']] = result;
		}

		for (let key in Plugins('mafia').nightactions['Mafia Seer']) {
			let targets = getTargets(key);
			if (targets['targetUser'] === 'no one') continue;

			if (!(key in Plugins('mafia').inspectionresults)) {
				Plugins('mafia').inspectionresults.key = {};
			}

			if (targets['targetRole'] === 'Werewolf') {
				Plugins('mafia').inspectionresults.key[targets['targetUser']] = 'Werewolf';
			} else {
				Plugins('mafia').inspectionresults.key[targets['targetUser']] = 'Human';
			}
		}

		// Now sort out who kills who. Werewolves have priority, then Vigilantes and finally Mafia

		const deaths = {};

		function kill(targetUser, killer) {
			if (deaths.targetUser) return;

			for (let key in safe) {
				if (safe[key] === targetUser) {
					if (Plugins('mafia').participants[key] === 'Bodyguard') {
						deaths[key] = 'Bodyguard';
						delete safe[key]; // Bodyguards only save from 1 death
						delete Plugins('mafia').participants[key];
					}
					return;
				}
			}
			if (Plugins('mafia').participants[targetUser] === '1-Shot Bulletproof Townie') {
				Plugins('mafia').participants[targetUser] = 'Villager';
				return;
			}
			if (Plugins('mafia').participants[targetUser] === 'Bomb') {
				deaths[killer] = Plugins('mafia').participants[killer];
				delete Plugins('mafia').participants[killer];
			}
			deaths[targetUser] = Plugins('mafia').participants[targetUser];
			delete Plugins('mafia').participants[targetUser];
			Plugins('mafia').nightactions[targetUser] = 'no one'; // incase wereworlf kills mafia killer
		}

		for (let key in Plugins('mafia').nightactions['Werewolf']) {
			let targets = getTargets(key);
			if (targets['targetUser'] === 'no one') continue;

			kill(targets['targetUser'], key);
		}

		for (let key in Plugins('mafia').nightactions['1-Shot Vigilante']) {
			let targets = getTargets(key);
			if (targets['targetUser'] === 'no one') continue;

			kill(targets['targetUser'], key);
			Plugins('mafia').participants[key] = 'Villager';
		}

		for (let key in Plugins('mafia').nightactions['Mafia']) {
			let targets = getTargets(key);
			if (targets['targetUser'] === 'no one') continue;

			kill(targets['targetUser'], key);
			break; // only first mafia can get a kill
		}

		let message = '';

		for (let key in deaths) {
			message += key + ' the ' + deaths[key] + ', ';
		}

		if (message === '') {
			mafiaRoom.add('|raw|<div class="broadcast-blue"><strong>No one was killed!</strong></div>');
		} else {
			mafiaRoom.add('|raw|<div class="broadcast-blue"><strong>The deaths tonight are: ' + message + '</strong></div>');
		}

		// check if any side has won

		const winner = [];

		for (let key in Plugins('mafia').participants) {
			role = Plugins('mafia').participants[key];

			if (role === 'Werewolf') {
				if (winner.indexOf('Werewolf') === -1) winner.push('Werewolf');
			} else if (role.indexOf('Mafia') !== -1 || role === 'Traitor') {
				if (winner.indexOf('Mafia') === -1) winner.push('Mafia');
			} else {
				if (winner.indexOf('Town') === -1) winner.push('Town');
			}

			if (winner.length > 1) break; // if more than 1 faction remains there is no winner
		}

		if (winner.length === 1) {
			mafiaRoom.add('|raw|<div class="broadcast-blue"><strong>' + winner[0] + ' Have won!</strong></div>');
			// reset everything to starting values

			Plugins('mafia').status = 'off';
			Plugins('mafia').totals = {};
			Plugins('mafia').participants = {};
			Plugins('mafia').inspectionresults = {};
			Plugins('mafia').votes = {};
		} else {
			mafiaRoom.add('|raw|<div class="broadcast-blue"><strong>It is now day! The remaining players are: ' + Object.keys(Plugins('mafia').participants) + '</strong></div>');
		}

		Plugins('mafia').nightactions = {Mafia: {}};
		Plugins('mafia').stage = 'day';
		room.modchat = '';
	},
	modkill: function (target, room, user) {
		if (!this.can('ban', null, room)) return false;
		if (room.id !== 'mafia') return this.sendReply('You can only modkill in the Mafia room.');
		if (Plugins('mafia').status !== 'on') return this.sendReply('There is no active mafia game.');
		target = this.splitTarget(target);
		const targetUser = this.targetUser;
		if (!Plugins('mafia').participants[targetUser]) return this.sendReply(this.targetUsername + ' is not participating in this mafia game or has died');

		let role = Plugins('mafia').participants[targetUser];
		if (role.indexOf('Mafia') !== -1 && role !== 'Mafia Pretty Lady' && role !== 'Mafia Seer') {
			role = 'Mafia';
		}

		delete Plugins('mafia').participants[targetUser];

		if (Plugins('mafia').nightactions.role) {
			delete Plugins('mafia').nightactions.role[targetUser];
		}

		mafiaRoom.add('|raw|<div class="broadcast-blue"><strong>' + this.targetUsername + ' the ' + role + ' was killed by a mod!</strong></div>');

		const winner = [];

		for (let key in Plugins('mafia').participants) {
			role = Plugins('mafia').participants[key];

			if (role === 'Werewolf') {
				if (winner.indexOf('Werewolf') === -1) winner.push('Werewolf');
			} else if (role.indexOf('Mafia') !== -1 || role === 'Traitor') {
				if (winner.indexOf('Mafia') === -1) winner.push('Mafia');
			} else {
				if (winner.indexOf('Town') === -1) winner.push('Town');
			}

			if (winner.length > 1) break; // if more than 1 faction remains there is no winner
		}

		if (winner.length === 1) {
			mafiaRoom.add('|raw|<div class="broadcast-blue"><strong>' + winner[0] + ' Have won!</strong></div>');
			// reset everything to starting values

			Plugins('mafia').status = 'off';
			Plugins('mafia').stage = 'day';
			Plugins('mafia').totals = {};
			Plugins('mafia').participants = {};
			Plugins('mafia').inspectionresults = {};
			Plugins('mafia').votes = {};
		}
	},
	inspections: function (target, room, user) {
		if (room.id !== 'mafia') return this.sendReply('You can only see mafia votes in the Mafia room.');
		if (Plugins('mafia').status !== 'on') return this.sendReply('A mafia game hasn\'t started yet');
		if (Plugins('mafia').participants[user.userid] !== 'Cop' && Plugins('mafia').participants[user.userid] !== 'Mafia Seer') return this.sendReply('You are not a cop or mafia seer');

		return this.sendReply('The results of your inspections are: ' + JSON.stringify(Plugins('mafia').inspectionresults[user.userid]));
	},
	votes: function (target, room, user) {
		if (room.id !== 'mafia') return this.sendReply('You can only see mafia votes in the Mafia room.');
		if (Plugins('mafia').status !== 'on') return this.sendReply('A mafia game hasn\'t started yet');
		if (Plugins('mafia').stage !== 'day') return this.sendReply('You can only have votes during the day');
		if (!this.runBroadcast()) return;

		const totals = {};

		for (let key in Plugins('mafia').votes) {
			if (Plugins('mafia').votes[key] in totals) {
				totals[Plugins('mafia').votes[key]]++;
			} else {
				totals[Plugins('mafia').votes[key]] = 1;
			}
		}

		return this.sendReply('Current votes are: ' + JSON.stringify(totals));
	},
	players: function (target, room, user) {
		if (room.id !== 'mafia') return this.sendReply('You can only use this command in the Mafia room.');
		if (Plugins('mafia').status !== 'on') return this.sendReply('A mafia game hasn\'t started yet');
		if (!this.runBroadcast()) return;
		return this.sendReply('Current players are: ' + Object.keys(Plugins('mafia').participants));
	},
	roles: function (target, room, user) {
		if (room.id !== 'mafia') return this.sendReply('You can only use this command in the Mafia room.');
		if (Plugins('mafia').status !== 'on') return this.sendReply('A mafia game hasn\'t started yet');
		if (!this.runBroadcast()) return;
		return this.sendReply('Current roles are: ' + JSON.stringify(Plugins('mafia').totals));
	},
	mafiahelp: function (target, room, user) {
		if (room.id !== 'mafia') return this.sendReply('You can only use this command in the Mafia room.');
		if (!this.runBroadcast()) return;
		this.sendReplyBox(
			'<strong>Player commands:</strong><br />' +
			'- /joinmafia: Join the current mafia game (only available during signups)<br />' +
			'- /lynch <em>name</em>: Vote to lynch the target. If a target is not given then it is no lynch. Only available during the day<br />' +
			'- /votes: See current lynch votes<br />' +
			'- /players: See the current living players<br />' +
			'- /roles: See what roles are still alive<br />' +
			'- /nightaction <em>name</em>: Use your nightaction on the target. Only available to roles with nightactions and only during the night<br />' +
			'<br />' +
			'<strong>Admin commands:</strong><br />' +
			'- /startmafia: Start signups for a mafia game<br />' +
			'- /endsignups: End signups with current players and start a mafia game. Minimum 3 players<br />' +
			'- /modkill <em>name</em>: Kill a target<br />'
		);
	},
};
