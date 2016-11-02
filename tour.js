/**
 * Functions and Commands supporting tournaments
 *
 * Main Developers: StevoDuhHero, Slayer95
 * Contributors: 0rivexes, Ecuación, kota
 *
 *
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 */

/*********************************************************
 * Functions
 *********************************************************/

"use strict";

exports.tour = function (t) {
	let tour = typeof t !== "undefined" ? t : {};
	let tourStuff = {
		tiers: [],
		timerLoop: function () {
			setTimeout(function () {
				tour.currentSeconds++;
				for (let id in tour.timers) {
					const room = Rooms.get(id);
					const c = tour.timers[id];
					let secondsNeeded = c.time * 60;
					let secondsElapsed = tour.currentSeconds - c.startTime;
					let difference = secondsNeeded - secondsElapsed;
					if (difference < 1) {
						delete tour.timers[id];
						if (tour[id].players.length < 3) {
							room.addRaw("<h3>El torneo fue cancelado por falta de jugadores.</h3>").update();
							tour.reset(id);
						} else {
							if (tour[id].status === 1) {
								tour[id].size = tour[id].players.length;
								tour.reportdue(room);
								tour.start(id);
							}
						}
					} else {
						let fraction = secondsElapsed / secondsNeeded;
						if (fraction === 0.25 || fraction === 0.5 || fraction === 0.75) {
							room.addRaw("<i>El torneo comenzará en " + difference + " segundo" + (difference === 1 ? '' : 's') + ".</i>").update();
						}
					}
				}
				tour.timerLoop();
			}, 1000);
		},
		reset: function (rid) {
			tour[rid] = {
				status: 0,
				tier: undefined,
				size: 0,
				roundNum: 0,
				players: [],
				winners: [],
				losers: [],
				round: [],
				history: [],
				byes: [],
				playerslogged: [],
				battles: {},
			};
		},
		splint: function (target, separator, length) {
			//splittyDiddles
			let cmdArr = [];
			if (!length) {
				cmdArr = target.split(separator || ",");
				length = cmdArr.length;
			} else {
				for (let count = 0; count < length; count++) {
					let commaIndex = target.indexOf(',');
					if (count + 1 === length) {
						cmdArr.push(target);
						break;
					} else if (commaIndex === -1) {
						cmdArr.push(target);
						break;
					} else {
						cmdArr.push(target.substr(0, commaIndex));
						target = target.substr(commaIndex + 1);
					}
				}
			}
			for (let i = 0; i < cmdArr.length; i++) {
				cmdArr[i] = cmdArr[i].trim();
			}
			return cmdArr;
		},
		toUserName: function (uid) {
			if (Users.get(uid)) {
				let n = Users.get(uid).name;
				if (toId(n) !== uid) return Tools.getName(uid);
				return Tools.getName(n);
			} else {
				return Tools.getName(uid);
			}
		},
		maxauth: function (user) {
			if (user.can('forcewin')) return true;
			return false;
		},
		highauth: function (user, room) {
			return user.can('ban');
		},
		midauth: function (user, room) {
			return user.can("joinbattle", room);
		},
		lowauth: function (user, room) {
			return user.can("joinbattle", room);
		},
		getList: function () {
			let oghtml = "<hr /><h2>Torneos en su fase de entrada:</h2>";
			let html = oghtml;
			for (let i in tour) {
				let c = tour[i];
				if (typeof c === "object") {
					const r = Rooms.get(i);
					if (c.status === 1 && !r.isPrivate && !r.staffRoom) {
						html += '<button name="joinRoom" value="' + i + '">' + Chat.escapeHTML(r.title) + ' - ' + Chat.escapeHTML(Tools.data.Formats[c.tier].name) + '</button> ';
					}
				}
			}
			if (html === oghtml) html += "No hay torneos en su fase de entrada.";
			return html;
		},
		roundTable: function (room) {
			let html = '<hr /><h3><font color="green">Ronda ' + tour[room.id].roundNum + '!</font></h3><font color="blue"><b>FORMATO:</b></font> ' + Tools.data.Formats[tour[room.id].tier].name + "<hr /><center><small><font color=red>Rojo</font> = descalificado, <font color=green>Verde</font> = pasó a la siguiente ronda, <a class='ilink'><b>URL</b></a> = combatiendo</small><center>";
			let r = tour[room.id].round;
			let firstMatch = false;
			for (let i = 0; i < r.length; i++) {
				if (!r[i][1]) {
					//bye
					let byer = tour.toUserName(r[i][0]);
					html += "<font color=\"blue\">" + Chat.escapeHTML(byer) + " ha pasado a la siguiente ronda.</font><br />";
				} else {
					if (r[i][2] === undefined) {
						//haven't started
						let p1n = tour.toUserName(r[i][0]);
						let p2n = tour.toUserName(r[i][1]);
						if (p1n.substr(0, 6) === 'Guest ') p1n = r[i][0];
						if (p2n.substr(0, 6) === 'Guest ') p2n = r[i][1];
						let tabla = "";
						if (!firstMatch) {
							tabla = "</center><table align=center cellpadding=0 cellspacing=0>";
							firstMatch = true;
						}
						html += tabla + "<tr><td align=right>" + Chat.escapeHTML(p1n) + "</td><td>&nbsp;VS&nbsp;</td><td>" + Chat.escapeHTML(p2n) + "</td></tr>";
					} else if (r[i][2] === -1) {
						//currently battling
						let p1n = tour.toUserName(r[i][0]);
						let p2n = tour.toUserName(r[i][1]);
						if (p1n.substr(0, 6) === 'Guest ') p1n = r[i][0];
						if (p2n.substr(0, 6) === 'Guest ') p2n = r[i][1];
						let tabla = "";
						if (!firstMatch) {
							tabla = "</center><table align=center cellpadding=0 cellspacing=0>";
							firstMatch = true;
						}
						let tourbattle = tour[room.id].battles[i];

						html += tabla + "<tr><td align=right><b>" + tour.link(tourbattle, Chat.escapeHTML(p1n)) + "</b></td><td><b>&nbsp;" + tour.link(tourbattle, "VS") + "&nbsp;</b></td><td><b>" + tour.link(tourbattle, Chat.escapeHTML(p2n)) + "</b></td></tr>";
					} else if (r[i][2] === -2) {
						let p1n = tour.toUserName(r[i][0]);
						let p2n = tour.toUserName(r[i][1]);
						if (p1n.substr(0, 6) === 'Guest ') p1n = r[i][0];
						if (p2n.substr(0, 6) === 'Guest ') p2n = r[i][1];
						let tabla = "";
						if (!firstMatch) {
							tabla = "</center><table align=center cellpadding=0 cellspacing=0>";
							firstMatch = true;
						}
						html += tabla + '<tr><td align=right><font color="dimgray">' + Chat.escapeHTML(p1n) + '</font></td><td>&nbsp;VS&nbsp;</td><td><font color="dimgray">' + Chat.escapeHTML(p2n) + '</font></td></tr>';
					} else {
						//match completed
						let p1 = "red";
						let p2 = "green";
						if (r[i][2] === r[i][0]) {
							p1 = "green";
							p2 = "red";
						}
						let p1n = tour.toUserName(r[i][0]);
						let p2n = tour.toUserName(r[i][1]);
						if (p1n.substr(0, 6) === 'Guest ') p1n = r[i][0];
						if (p2n.substr(0, 6) === 'Guest ') p2n = r[i][1];
						let tabla = "";
						if (!firstMatch) {
							tabla = "</center><table align=center cellpadding=0 cellspacing=0>";
							firstMatch = true;
						}
						html += tabla + "<tr><td align=right><b><font color=\"" + p1 + "\">" + Chat.escapeHTML(p1n) + "</font></b></td><td><b>&nbsp;VS&nbsp;</b></td><td><font color=\"" + p2 + "\"><b>" + Chat.escapeHTML(p2n) + "</b></font></td></tr>";
					}
				}
			}
			html += "</table>";
			return html;
		},
		remsg: function (quorum, nonhtml) {
			if (!isFinite(quorum)) return '';
			if (quorum === 0) return ' Empieza la primera ronda del torneo.';
			if (nonhtml) return (' Queda ' + quorum + ' plaza' + (quorum === 1 ? '' : 's') + '.');
			return (' <b><i> Queda ' + quorum + ' plaza' + (quorum === 1 ? '' : 's') + '.</b></i>');
		},
		reportdue: function (room, connection) {
			let trid = tour[room.id];
			let remslots = trid.size - trid.players.length;
			if (trid.players.length === trid.playerslogged.length) {
				if (connection) connection.sendTo(room, 'Nada que reportar ahora.');
			} else if (trid.players.length === trid.playerslogged.length + 1) {
				let someid = trid.players[trid.playerslogged.length];
				room.addRaw('<b>' + tour.toUserName(someid) + '</b> se ha unido al torneo.' + tour.remsg(remslots));
				trid.playerslogged.push(trid.players[trid.playerslogged.length]);
			} else {
				let someid = trid.players[trid.playerslogged.length];
				let prelistnames = '<b>' + tour.toUserName(someid) + '</b>';
				for (let i = trid.playerslogged.length + 1; i < trid.players.length - 1; i++) {
					someid = trid.players[i];
					prelistnames = prelistnames + ', <b>' + tour.toUserName(someid) + '</b>';
				}
				someid = trid.players[trid.players.length - 1];
				let listnames = prelistnames + ' y <b>' + tour.toUserName(someid) + '</b>';
				room.addRaw(listnames + ' se han unido al torneo.' + tour.remsg(remslots));

				trid.playerslogged.push(trid.players[trid.playerslogged.length]);
				for (let i = trid.playerslogged.length; i < trid.players.length - 1; i++) {
					trid.playerslogged.push(trid.players[i]);
				}
				trid.playerslogged.push(trid.players[trid.players.length - 1]);
			}
		},
		joinable: function (uid, rid) {
			let players = tour[rid].players;
			let pl = players.length;
			for (let i = 0; i < pl; i++) {
				if (players[i] === uid) return false;
			}
			if (!Config.tourAllowAlts) {
				let userAlts = Users.get(uid).getAlts(true, true);
				for (let i = 0; i < pl; i++) {
					for (let j = 0; j < userAlts.length; j++) {
						if (players[i] === toId(userAlts[j])) return false;
					}
				}
				for (let i = 0; i < pl; i++) {
					for (let j in Users.get(uid).prevNames) {
						if (players[i] === toId(j)) return false;
					}
				}
				for (let i = 0; i < pl; i++) {
					for (let j = 0; j < userAlts.length; j++) {
						for (let k in Users.get(userAlts[j]).prevNames) {
							if (players[i] === toId(k)) return false;
						}
					}
				}
			}
			return true;
		},
		lose: function (uid, rid) {
			/*
				if couldn't disqualify return an error code
				if could disqualify return the user id of the opponent
			*/
			let r = tour[rid].round;
			let key, loser, winner;
			for (let i = 0, l = r.length; i < l; i++) {
				let index = r[i].indexOf(uid);
				if (index === 0) {
					key = i;
					if (!r[i][1]) return 0;
					//has no opponent
					if (r[i][2] !== undefined && r[i][2] !== -1 && r[i][2] !== -2) {
						//already did match
						return 1;
					}
					loser = 0;
					winner = 1;
					break;
				} else if (index === 1) {
					key = i;
					if (r[i][2] !== undefined && r[i][2] !== -1 && r[i][2] !== -2) {
					//already did match
						return 1;
					}
					loser = 1;
					winner = 0;
					break;
				}
			}
			if (key === undefined) {
				//user not in tour
				return -1;
			} else {
				const battleId = tour[rid].battles[key];
				const room = Rooms.get(battleId);
				if (room) room.tournament = false;
				r[key][2] = r[key][winner];
				tour[rid].winners.push(r[key][winner]);
				tour[rid].losers.push(r[key][loser]);
				tour[rid].history.push(r[key][winner] + "|" + r[key][loser]);
				return r[key][winner];
			}
		},
		start: function (rid) {
			let power = 1;
			while (true) { // eslint-disable-line no-constant-condition
				power *= 2;
				if (power >= tour[rid].size) {
					break;
				}
			}
			let numByes = power - tour[rid].size;

			let r = tour[rid].round;
			let sList = tour[rid].players;
			let unmatched = [];
			for (let i = 0; i < sList.length; i++) {
				unmatched[i] = sList[i];
			}
			sList = Tools.shuffle(sList);
			let key = 0;
			while (numByes > 0) {
				r.push([sList[key], undefined, sList[key]]);
				tour[rid].winners.push(sList[key]);
				tour[rid].byes.push(sList[key]);
				numByes--;
				key++;
			}

			do {
				let match = []; //[p1, p2, result]
				match.push(sList[key]);
				key++;
				match.push(sList[key]);
				key++;
				match.push(undefined);
				r.push(match);
			}
			while (key !== sList.length);

			tour[rid].roundNum++;
			tour[rid].status = 2;
			const room = Rooms.get(rid);
			const html = tour.roundTable(room);
			room.addRaw(html);
		},
		nextRound: function (rid) {
			let w = tour[rid].winners;
			let l = tour[rid].losers;
			tour[rid].roundNum++;
			tour[rid].history.push(tour[rid].round);
			tour[rid].round = [];
			tour[rid].losers = [];
			tour[rid].winners = [];
			tour[rid].byes = [];

			if (w.length === 1) {
				//end tour
				const room = Rooms.get(rid);
				room.addRaw('<h2><font color="green">Felicidades <font color="black">' + Chat.escapeHTML(tour.toUserName(w[0])) + '</font>!  Has ganado el torneo de formato ' + Tools.data.Formats[tour[rid].tier].name + '!</font></h2>' + '<br><font color="blue"><b>Segundo Lugar:</b></font> ' + Chat.escapeHTML(tour.toUserName(l[0])) + '<hr />');
				if (tour[rid].size >= 3 && room.isOfficial) {
					const moneyFirst = tour[rid].size * 10;
					const moneySecond = Math.floor(moneyFirst / 2);
					Shop.giveMoney(tour.username(w[0]), moneyFirst);
					Shop.giveMoney(tour.username(l[0]), moneySecond);
					room.addRaw(Chat.escapeHTML(tour.toUserName(w[0])) + ' ha recibido ' + moneyFirst + ' pd por ganar el torneo!');
					room.addRaw(Chat.escapeHTML(tour.toUserName(l[0])) + ' ha recibido ' + moneySecond + ' pd por quedar segundo!');
				}
				room.update();
				tour[rid].status = 0;
			} else {
				let p = Tools.shuffle(w.slice());
				for (let i = 0; i < p.length / 2; i++) {
					let p1 = i * 2;
					let p2 = p1 + 1;
					tour[rid].round.push([p[p1], p[p2], undefined]);
				}
				let html = tour.roundTable(room);
				room.addRaw(html).update();
			}
		},
		link: function (tourbattle, innerHTML) {
			return "<a href='/" + tourbattle + "' room='" + tourbattle + "' class='ilink'>" + innerHTML + "</a>";
		},
	};

	for (let i in tourStuff) tour[i] = tourStuff[i];
	for (let i in Tools.data.Formats) {
		if (Tools.data.Formats[i].effectType === 'Format' && Tools.data.Formats[i].challengeShow) {
			tour.tiers.push(i);
		}
	}
	if (typeof tour.timers === "undefined") tour.timers = {};
	if (typeof tour.currentSeconds === "undefined") {
		tour.currentSeconds = 0;
		tour.timerLoop();
	}
	for (let i = 0; i < Rooms.global.chatRooms.length; i++) {
		let id = Rooms.global.chatRooms[i].id;
		if (!tour[id]) {
			tour[id] = {};
			tour.reset(id);
		}
	}
	return tour;
};

/*********************************************************
 * Commands
 *********************************************************/

let cmds = {
	tourhelp: function (target, room, user) {
		if (!this.canBroadcast()) return;
		this.sendReplyBox('<font size = 2>Sistema de torneos  clásico</font><br />' +
						'Sistema de torneos clásico. Disponible para las salas, permitiendo a los usuarios con auth (+ % @ # & ~) crearlos y moderarlos.<br />' +
						'Los comandos son:<br />' +
						'<ul><li>/newtour [formato], [tiempo] minutes - Inicia un torneo. Requiere: + % @ & ~</li>' +
						'<li>/j - Comando para unirse a los tourneos.</li>' +
						'<li>/l - comando para abandonar un torneo.</li>' +
						'<li>/remind - recuerda a los usuarios con batallas pendientes.</li>' +
						'<li>/vr - muestra el estado del torneo.</li>' +
						'<li>/fl [usuario] - Fuerza a un usuario a salir de un torneo en fase de entrada.</li>' +
						'<li>/dq [usuario] - Descalifica a un usuario.</li>' +
						'<li>/replace [usuario1], [usuario2] - Comando para reemplazar.</li>' +
						'<li>/invalidate - Deniega la validez de una batalla.</li>' +
						'<li>/endtour - Cancela el torneo.</li>' +
						'</ul>');
	},

	createtour: 'newtour',
	newtour: function (target, room, user, connection) {
		if (target === "update" && this.can('hotpatch')) {
			Chat.uncacheTree('./tour.js');
			tour = require('./tour.js').tour(tour);
			return this.sendReply('El codigo de los torneos ha sido actualizado.');
		}
		if (!tour.midauth(user, room)) return this.parse('/tours');
		if (room.decision) return this.sendReply('Prof. Oak: No es un buen momento para usar este comando. No puedes utilizarlo en salas de batalla.');
		let rid = room.id;
		if (!tour[rid]) tour.reset(rid);
		if (tour[rid] && tour[rid].status !== 0) return this.sendReply('Ya hay un torneo en curso.');
		if (War.getTourData(room.id)) return this.sendReply("Ya había una guerra en esta sala.");
		if (teamTour.getTourData(room.id)) return this.sendReply("Ya había un torneo de equipos en esta sala.");
		if (!target) return this.sendReply('El comando correcto es: /newtour formato, tamano');
		let targets = tour.splint(target);
		if (targets.length !== 2) return this.sendReply('El comando correcto es: /newtour formato, tamano');
		let tierMatch = false;
		let tempTourTier = '';
		for (let i = 0; i < tour.tiers.length; i++) {
			if (toId(targets[0]) === tour.tiers[i]) {
				tierMatch = true;
				tempTourTier = tour.tiers[i];
			}
		}
		if (!tierMatch) return this.sendReply('Por favor utiliza uno de los siguientes formatos: ' + tour.tiers.join(','));
		if (targets[1].split('minut').length > 1) {
			targets[1] = parseInt(targets[1]);
			if (isNaN(targets[1]) || !targets[1]) return this.sendReply('/newtour formato, NUMERO minutes');
			targets[1] = Math.ceil(targets[1]);
			if (targets[1] < 0) return this.sendReply('Por que programar este torneo para el pasado?');
			tour.timers[rid] = {
				time: targets[1],
				startTime: tour.currentSeconds,
			};
			targets[1] = Infinity;
		} else {
			targets[1] = parseInt(targets[1]);
		}
		if (isNaN(targets[1])) return this.sendReply('El comando correcto es: /newtour formato, tamano');
		if (targets[1] < 3) return this.sendReply('Los torneos deben tener al menos 3 participantes.');

		this.parse('/endpoll');
		tour.reset(rid);
		tour[rid].tier = tempTourTier;
		tour[rid].size = targets[1];
		tour[rid].status = 1;
		tour[rid].players = [];

		room.addRaw('<hr /><h2><font color="green">' + Chat.escapeHTML(user.name) + ' ha iniciado un torneo de formato ' + Tools.data.Formats[tempTourTier].name + '. Si deseas unirte escribe </font> <font color="red">/j</font> <font color="steelblue">.</font></h2><b><font color="blueviolet">Jugadores:</font></b> ' + targets[1] + '<br /><font color="blue"><b>FORMATO:</b></font> ' + Tools.data.Formats[tempTourTier].name + '<hr /><br /><font color="red"><b>Recuerda que debes mantener tu nombre durante todo el torneo.</b></font>');
		if (tour.timers[rid]) room.addRaw('<i>El torneo empezara en ' + tour.timers[rid].time + ' minuto' + (tour.timers[rid].time === 1 ? '' : 's') + '.<i>');
	},

	endtour: function (target, room, user, connection) {
		if (!tour.midauth(user, room)) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (room.decision) return this.sendReply('No es un buen momento para usar este comando. No puedes utilizarlo en salas de batalla.');
		if (!tour[room.id] || tour[room.id].status === 0) return this.sendReply('No hay un torneo activo.');
		tour[room.id].status = 0;
		delete tour.timers[room.id];
		room.addRaw('<h2><b>' + user.name + '</b> ha cerrado el torneo.</h2>');
	},

	toursize: function (target, room, user, connection) {
		if (!tour.midauth(user, room)) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (room.decision) return this.sendReply('No es un buen momento para usar este comando. No puedes utilizarlo en salas de batalla.');
		if (!tour[room.id]) return this.sendReply('No hay un torneo activo en esta sala.');
		if (tour[room.id].status > 1) return this.sendReply('Es imposible cambiar el numero de participantes.');
		if (tour.timers[room.id]) return this.sendReply('Este torneo tiene un numero abierto de participantes, no puede ser cambiado.');
		if (!target) return this.sendReply('El comando correcto es: /toursize tamano');
		target = parseInt(target);
		if (isNaN(target)) return this.sendReply('El comando correcto es: /toursize tamano');
		if (target < 3) return this.sendReply('Un torneo requiere por lo menos 3 personas.');
		if (target < tour[room.id].players.length) return this.sendReply('No puedes reducir el numero de participantes a un numero inferior de los ya registrados.');
		tour[room.id].size = target;
		tour.reportdue(room);
		room.addRaw('<b>' + user.name + '</b> ha cambiado el tamano del torneo a ' + target + '. Queda <b><i>' + (target - tour[room.id].players.length) + ' plaza' + ((target - tour[room.id].players.length) === 1 ? '' : 's') + '.</b></i>');
		if (target === tour[room.id].players.length) tour.start(room.id);
	},

	tourtime: function (target, room, user, connection) {
		if (!tour.midauth(user, room)) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (room.decision) return this.sendReply('No es un buen momento para usar este comando. No puedes utilizarlo en salas de batalla.');
		if (!tour[room.id]) return this.sendReply('No hay un torneo activo en esta sala.');
		if (tour[room.id].status > 1) return this.sendReply('Es imposible cambiar el numero de participantes.');
		if (!tour.timers[room.id]) return this.sendReply('Este torneo no funciona con un reloj.');
		if (!target) return this.sendReply('El comando correcto es: /tourtime tiempo');
		target = parseInt(target);
		if (isNaN(target)) return this.sendReply('El comando correcto es: /tourtime tiempo');
		if (target < 1) return this.sendReply('Por que reprogramar un torneo para el pasado?');
		target = Math.ceil(target);
		tour.timers[room.id].time = target;
		tour.timers[room.id].startTime = tour.currentSeconds;
		room.addRaw('<b>' + user.name + '</b> ha cambiado el tiempo de registro a: ' + target + ' minuto' + (target === 1 ? '' : 's') + '.');
		if (target === 0) {
			tour.reportdue(room);
			tour.start(room.id);
		}
	},

	jt: 'j',
	jointour: 'j',
	j: function (target, room, user, connection) {
		if (room.type !== 'chat') return this.sendReply('No es un buen momento para usar este comando. No puedes utilizarlo en salas de batalla.');
		if (War.getTourData(room.id)) return this.parse("/war join");
		if (teamTour.getTourData(room.id)) return this.parse("/tt join, " + target);
		if (!tour[room.id] || tour[room.id].status === 0) return this.sendReply('No hay torneos activos en esta sala.');
		if (tour[room.id].status === 2) return this.sendReply('Ya no te puedes registrar a este torneo.');
		if (tour.joinable(user.userid, room.id)) {
			tour[room.id].players.push(user.userid);
			let remslots = tour[room.id].size - tour[room.id].players.length;
			// these three assignments (natural, natural, boolean) are done as wished
			let pplogmarg, logperiod;
			if (isFinite(tour[room.id].size)) {
				pplogmarg = Math.ceil(Math.sqrt(tour[room.id].size) / 2);
				logperiod = Math.ceil(Math.sqrt(tour[room.id].size));
			} else {
				pplogmarg = (!isNaN(Config.tourtimemargin) ? Config.tourtimemargin : 3);
				logperiod = (Config.tourtimeperiod ? Config.tourtimeperiod : 4);
			}
			let perplayerlog = ((tour[room.id].players.length <= pplogmarg) || (remslots + 1 <= pplogmarg));
			//

			if (perplayerlog || (tour[room.id].players.length - tour[room.id].playerslogged.length >= logperiod) || (remslots <= pplogmarg)) {
				tour.reportdue(room, connection);
			} else {
				this.sendReply('Te has unido exitosamente al torneo.');
			}
			if (tour[room.id].size === tour[room.id].players.length) tour.start(room.id);
		} else {
			return this.sendReply('No puedes entrar el torneo porque ya estas en él. Digita /l para salir.');
		}
	},

	push: 'fj',
	forcejoin: 'fj',
	fj: function (target, room, user, connection) {
		if (!tour.lowauth(user, room)) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (room.type !== 'chat') return this.sendReply('Prof. Oak: No es un buen momento para usar este comando. No puedes utilizarlo en salas de batalla.');
		if (!tour[room.id] || tour[room.id].status === 0 || tour[room.id].status === 2) return this.sendReply('El torneo no esta en su fase de inscripcion.');
		if (!target) return this.sendReply('Especifica el usuario que deseas que participe.');
		let targetUser = Users.get(target);
		if (!targetUser) return this.sendReply('El usuario \'' + target + '\' no existe.');
		target = targetUser.userid;
		if (!tour.joinable(target, room.id)) return this.sendReply('El usuario indicado ya estaba registrado en el torneo.');
		tour.reportdue(room);
		tour[room.id].players.push(target);
		tour[room.id].playerslogged.push(target);
		let remslots = tour[room.id].size - tour[room.id].players.length;
		room.addRaw(user.name + ' ha registrado a <b>' + tour.toUserName(target) + '</b> para participar en el torneo.' + tour.remsg(remslots));
		if (tour[room.id].size === tour[room.id].players.length) tour.start(room.id);
	},

	l: 'lt',
	leavetour: 'lt',
	lt: function (target, room, user, connection) {
		if (room.type !== 'chat') return this.sendReply('Prof. Oak: No es un buen momento para usar este comando. No puedes utilizarlo en salas de batalla.');
		if (War.getTourData(room.id)) return this.parse("/war leave");
		if (teamTour.getTourData(room.id)) return this.parse("/tt leave");
		if (!tour[room.id] || tour[room.id].status === 0) return this.sendReply('No hay un torneo activo que abandonar.');
		if (tour[room.id].status === 1) {
			let index = tour[room.id].players.indexOf(user.userid);
			if (index !== -1) {
				if (tour[room.id].playerslogged.indexOf(user.userid) !== -1) {
					tour.reportdue(room);
					tour[room.id].players.splice(index, 1);
					tour[room.id].playerslogged.splice(index, 1);
					let remslots = tour[room.id].size - tour[room.id].players.length;
					room.addRaw('<b>' + Chat.escapeHTML(user.name) + '</b> ha salido del torneo.' + tour.remsg(remslots));
				} else {
					tour[room.id].players.splice(index, 1);
					return this.sendReply('Has salido del torneo.');
				}
			} else {
				return this.sendReply("No estabas en el torneo.");
			}
		} else {
			let dqopp = tour.lose(user.userid, room.id);
			if (dqopp && dqopp !== -1 && dqopp !== 1) {
				room.addRaw('<b>' + Chat.escapeHTML(user.name) + '</b> ha salido del torneo. <b>' + tour.toUserName(dqopp) + '</b> pasa a la siguiente ronda.');
				let r = tour[room.id].round;
				let c = 0;
				for (let i in r) {
					if (r[i][2] && r[i][2] !== -1) c++;
				}
				if (r.length === c) tour.nextRound(room.id);
			} else {
				if (dqopp === 1) return this.sendReply("Debes esperar hasta la proxima ronda para salir del torneo.");
				if (dqopp === 0 || dqopp === -1) return this.sendReply("No estas en el torneo o tu oponente no esta disponible.");
			}
		}
	},

	forceleave: 'fl',
	fl: function (target, room, user, connection) {
		if (!tour.lowauth(user, room)) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (room.type !== 'chat') return this.sendReply('Prof. Oak: No es un buen momento para usar este comando. No puedes utilizarlo en salas de batalla.');
		if (!tour[room.id] || tour[room.id].status === 0 || tour[room.id].status === 2) return this.sendReply('El torneo no esta en su fase de inscripcion. Utiliza /dq para sacar a alguien del torneo.');
		if (!target) return this.sendReply('Especifica el usuario que deseas sacar.');
		let targetUser = Users.get(target);
		if (targetUser) {
			target = targetUser.userid;
		} else {
			return this.sendReply('El usuario \'' + target + '\' no existe.');
		}
		let index = tour[room.id].players.indexOf(target);
		if (index !== -1) {
			tour.reportdue(room);
			tour[room.id].players.splice(index, 1);
			tour[room.id].playerslogged.splice(index, 1);
			let remslots = tour[room.id].size - tour[room.id].players.length;
			room.addRaw(user.name + ' ha expulsado del torneo a <b>' + Chat.escapeHTML(tour.toUserName(target)) + '</b>.' + tour.remsg(remslots));
		} else {
			return this.sendReply('El usuario no esta en el torneo.');
		}
	},

	remind: function (target, room, user, connection) {
		if (!tour.lowauth(user, room)) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (room.type !== 'chat') return this.sendReply('Prof. Oak: No es un buen momento para usar este comando. No puedes utilizarlo en salas de batalla.');
		if (!tour[room.id] || !tour[room.id].status) return this.sendReply('No hay un torneo activo en esta sala.');
		if (tour[room.id].status === 1) {
			tour.reportdue(room);
			room.addRaw('<hr /><h2><font color="green">Inscribanse al torneo de formato ' + Tools.data.Formats[tour[room.id].tier].name + '. Escribe </font> <font color="red">/j</font> <font color="green">para inscribirte.</font></h2><b><font color="blueviolet">Jugadores:</font></b> ' + (tour[room.id].size === 'Infinity' ? 'ILIMITADOS' : tour[room.id].size) + '<br /><font color="blue"><b>FORMATO:</b></font> ' + Tools.data.Formats[tour[room.id].tier].name + '<hr />');
		} else {
			let c = tour[room.id];
			let unfound = [];
			if (!target) {
				for (let x in c.round) {
					if (c.round[x][0] && c.round[x][1] && !c.round[x][2]) {
						let userOne = Users.get(c.round[x][0]);
						let userTwo = Users.get(c.round[x][1]);
						if (userOne && userOne.connected) {
							if (userTwo && userTwo.connected) {
								let defmsg = "Se te recuerda que tienes una batalla de torneo pendiente en la sala **" + room.title + "**. Si no inicias pronto tu batalla contra **";
								userOne.popup(defmsg + userTwo.name + "** en el formato **" + Tools.data.Formats[c.tier].name + "**, podrías ser descalificado.");
								userTwo.popup(defmsg + userOne.name + "** en el formato **" + Tools.data.Formats[c.tier].name + "**, podrías ser descalificado.");
							} else {
								unfound.push(c.round[x][1]);
							}
						} else {
							unfound.push(c.round[x][0]);
							if (!userTwo || !userTwo.connected) {
								unfound.push(c.round[x][1]);
							}
						}
					}
				}
				room.addRaw("Los usuarios con batallas pendientes en el torneo han sido recordados de el por " + Chat.escapeHTML(user.name));
			} else {
				let opponent = '';
				let targets = tour.splint(target);
				for (let i = 0; i < targets.length; i++) {
					let nicetarget = false;
					let someuser = Users.get(targets[i]);
					if (someuser && someuser.connected) {
						for (let x in c.round) {
							if (c.round[x][0] && c.round[x][1] && !c.round[x][2]) {
								if (c.round[x][0] === someuser.userid) {
									nicetarget = true;
									opponent = c.round[x][1];
									break;
								} else if (c.round[x][1] === someuser.userid) {
									nicetarget = true;
									opponent = c.round[x][0];
									break;
								}
							}
						}
					}
					if (nicetarget) {
						someuser.popup("Se te recuerda que tienes una batalla de torneo pendiente en la sala " + room.title + ". Si no inicias pronto tu batalla contra " + tour.toUserName(opponent) + " en el formato " + Tools.data.Formats[tour[room.id].tier].name + ", podrias ser descalificado.");
					} else {
						unfound.push(targets[i]);
					}
				}
				room.addRaw("Los usuarios con batallas pendientes en el torneo han sido recordados de el por " + Chat.escapeHTML(user.name));
			}
			if (unfound.length) return this.sendReply("Los siguientes usuarios estaban desconectados o no tenian batallas pendientes: " + unfound.toString());
		}
	},

	viewround: 'vr',
	viewreport: 'vr',
	vr: function (target, room, user, connection) {
		if (War.getTourData(room.id)) return this.parse("/war round");
		if (teamTour.getTourData(room.id)) return this.parse("/tt round");
		if (!tour[room.id]) return this.sendReply('There is no active tournament in this room.');
		if (!tour[room.id].status) {
			if (!this.canBroadcast()) return;
			let html = tour.getList();
			this.sendReply('|raw|' + html + "<hr />");
		} else if (tour[room.id].status === 1) {
			if (!tour.lowauth(user, room)) return this.sendReply('No deberias usar este comando en la fase de inscripcion.');
			tour.reportdue(room, connection);
		} else {
			if (!this.canBroadcast()) return;
			if (room.type !== 'chat') return this.sendReply('Prof. Oak: No es un buen momento para usar este comando. No puedes utilizarlo en salas de batalla.');
			if (!tour[room.id]) return this.sendReply('No hay un torneo activo en una sala.');
			if (tour[room.id].status < 2) return this.sendReply('No hay torneos fuera de la fase de inscripcion.');
			let html = tour.roundTable(room);
			this.sendReply("|raw|" + html);
		}
	},

	disqualify: 'dq',
	dq: function (target, room, user, connection) {
		if (War.getTourData(room.id)) return this.parse("/war dq, " + target);
		if (teamTour.getTourData(room.id)) return this.parse("/tt dq, " + target);
		if (!tour.midauth(user, room)) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (!target) return this.sendReply('El comando correcto es: /dq usuario');
		if (room.type !== 'chat') return this.sendReply('Prof. Oak: No es un buen momento para usar este comando. No puedes utilizarlo en salas de batalla.');
		if (!tour[room.id]) return this.sendReply('No hay un torneo activo en esta sala.');
		if (tour[room.id].status < 2) return this.sendReply('No hay un torneo fuera de la fase de inscripcion.');
		if (Config.tourDqGuard) {
			let stop = false;
			for (let x in tour[room.id].round) {
				if (tour[room.id].round[x][2] === -1) {
					stop = true;
					break;
				}
			}
			if (stop) return this.sendReply('Debido a la configuracion actual, no es posible descalificar jugadores mientras haya batallas en curso.');
		}
		let dqGuy = toId(target);
		let error = tour.lose(dqGuy, room.id);
		if (error === -1) {
			return this.sendReply('El usuario \'' + target + '\' no estaba en el torneo.');
		} else if (error === 0) {
			return this.sendReply('El usuario \'' + target + '\' no tenía un oponente asignado. Espera hasta la siguiente ronda antes de descalificarlo.');
		} else if (error === 1) {
			return this.sendReply('El usuario \'' + target + '\' ya pasó a la siguiente ronda. Espera hasta la siguiente antes de descalificarlo.');
		} else {
			room.addRaw('<b>' + tour.toUserName(dqGuy) + '</b> fue descalificado por ' + Chat.escapeHTML(user.name) + ', así que ' + Chat.escapeHTML(tour.toUserName(error)) + ' avanza.');
			let rid = room.id;
			let r = tour[rid].round;
			let c = 0;
			for (let i in r) {
				if (r[i][2] && r[i][2] !== -1 && r[i][2] !== -2) c++;
			}
			if (r.length === c) tour.nextRound(rid);
		}
	},

	replace: function (target, room, user, connection) {
		if (War.getTourData(room.id)) return this.parse("/war replace, " + target);
		if (teamTour.getTourData(room.id)) return this.parse("/tt replace, " + target);
		if (!tour.midauth(user, room)) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (room.type !== 'chat') return this.sendReply('Prof. Oak: No es un buen momento para usar este comando. No puedes utilizarlo en salas de batalla.');
		if (!tour[room.id] || tour[room.id].status !== 2) return this.sendReply('No hay un torneo aca o esta en su fase de inscripcion. Reemplazar participantes solo es posible en la mitad del torneo.');
		if (tour[room.id].roundNum > 1 && !Config.tourUnlimitReplace) return this.sendReply('Debido a la configuracion actual, reemplazar participantes solo esta permitido en la primera ronda de un torneo.');
		if (!target) return this.sendReply('El comando correcto es: /replace reemplazado, sustituto.');
		let t = tour.splint(target);
		if (!t[1]) return this.sendReply('El comando correcto es: /replace reemplazado, sustituto.');
		let userTwo = Users.get(t[1]);
		if (!userTwo) {
			return this.sendReply('El comando correcto es: /replace reemplazado, sustituto. El usuario especificado como reemplazado no esta presente.');
		} else {
			t[1] = toId(t[1]);
		}
		t[0] = toId(t[0]);
		let rt = tour[room.id];
		let players = rt.players;
		let indexOne = players.indexOf(t[0]);
		if (indexOne === -1) return this.sendReply(tour.toUserName(t[0]) + " no puede ser reemplazado, pues no está en el torneo.");
		let indexTwo = players.indexOf(t[1]);
		if (indexTwo !== -1) return this.sendReply(tour.toUserName(t[1]) + " no puede ingresar como sustituto, pues ya estaba participando del torneo.");
		let outof = {"players":1, "winners":1, "losers":1};
		for (let x in outof) {
			for (let i = 0, l = rt[x].length; i < l; i++) {
				if (rt[x][i] === t[0]) {
					rt[x][i] = t[1];
					break;
				}
			}
		}
		for (let i = 0, l = rt.round.length; i < l; i++) {
			let exchanged = false;
			if (rt.round[i][0] === t[0]) {
				rt.round[i][0] = t[1];
				exchanged = true;
			} else if (rt.round[i][1] === t[0]) {
				rt.round[i][1] = t[1];
				exchanged = true;
			}
			if (exchanged) {
				if (rt.round[i][2] === t[0]) {
					rt.round[i][2] = t[1];
				}
				break;
			}
		}
		rt.history.push(t[0] + "->" + t[1]);
		room.addRaw('<b>' + Chat.escapeHTML(tour.toUserName(t[0])) + '</b> es sustituido por <b>' + Chat.escapeHTML(tour.toUserName(t[1])) + '</b>.');
	},

	tours: function (target, room, user, connection) {
		if (!this.canBroadcast()) return;
		let html = tour.getList();
		this.sendReply('|raw|' + html + "<hr />");
	},

	invalidate: function (target, room, user) {
		if (room.type !== 'battle') return this.sendReply('Solo puedes hacer esto en una sala de batalla.');
		if (!room.tournament) return this.sendReply('Esta no es una batalla oficial de torneo.');
		if (!tour.highauth(user, room)) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		const rid = room.tournament;
		const tournamentRoom = Rooms.get(rid);
		let c = tour[rid];
		if (c.status === 2) {
			for (let x in c.round) {
				if (!c.round[x] || c.round[x][2] !== -1) continue;
				if (c.round[x].indexOf(room.p1.userid) !== -1 && c.round[x].indexOf(room.p2.userid) !== -1) {
					c.round[x][2] = undefined;
					tournamentRoom.addRaw("La batalla entre " + '<b>' + Chat.escapeHTML(room.p1.name) + '</b>' + " y " + '<b>' + Chat.escapeHTML(room.p2.name) + '</b>' + " ha sido " + '<b>' + "invalidada" + '</b>' + ' por ' + Chat.escapeHTML(user.name));
					break;
				}
			}
		}
	},
};

Object.assign(Chat.commands, cmds);

/*********************************************************
 * Events
 *********************************************************/

if (!Rooms.global._startBattle) Rooms.global._startBattle = Rooms.global.startBattle;
Rooms.global.startBattle = function (p1, p2, format, p1team, p2team, options) {
	let newRoom = this._startBattle(p1, p2, format, p1team, p2team, options);
	if (!newRoom) return;
	let formaturlid = format.toLowerCase().replace(/[^a-z0-9]+/g, '');
	if (!options.rated) {
		for (let i in tour) {
			const c = tour[i];
			const tournamentRoom = Rooms.get(i);
			if (c.status === 2 && format === c.tier.toLowerCase()) {
				for (let x in c.round) {
					if (c.round[x][2]) continue;
					if (c.round[x].indexOf(p1.userid) !== -1 && c.round[x].indexOf(p2.userid) !== -1) {
						newRoom.tournament = i;
						c.battles[x] = "battle-" + formaturlid + "-" + this.lastBattle;
						c.round[x][2] = -1;
						tournamentRoom.addRaw("<a href=\"/" + c.battles[x] + "\" class=\"ilink\"><b>La batalla de torneo entre " + Chat.escapeHTML(p1.name) + " y " + Chat.escapeHTML(p2.name) + " ha comenzado.</b></a>").update();
						break;
					}
				}
			}
		}
	}

	return newRoom;
};

if (!Rooms.BattleRoom.prototype._win) Rooms.BattleRoom.prototype._win = Rooms.BattleRoom.prototype.win;
Rooms.BattleRoom.prototype.win = function (winner) {
	if (this.tournament) {
		let rid = this.tournament;
		let winnerid = toId(winner);

		let playerIds = this.battle.playerNames.map(toId);
		let loserid = playerIds[0];
		let istie = false;
		if (playerIds[0] === winnerid) {
			loserid = playerIds[1];
		} else if (playerIds[1] !== winnerid) {
			istie = true;
		}
		const c = tour[rid];
		const tournamentRoom = Rooms.get(rid);
		if (c.status === 2) {
			for (let x in c.round) {
				if (!c.round[x] || c.round[x][2] !== -1) continue;
				if (c.round[x].indexOf(this.p1.userid) !== -1 && c.round[x].indexOf(this.p2.userid) !== -1) {
					if (istie) {
						c.round[x][2] = undefined;
						tournamentRoom.addRaw("La batalla entre " + '<b>' + Chat.escapeHTML(tour.toUserName(this.p1.name)) + '</b>' + " y " + '<b>' + Chat.escapeHTML(tour.toUserName(this.p2.name)) + '</b>' + " terminó en un " + '<b>' + "empate." + '</b>' + " Por favor inicien otra batalla.").update();
					} else {
						tour.lose(loserid, rid);
						tournamentRoom.addRaw('<b>' + Chat.escapeHTML(tour.toUserName(winnerid)) + '</b> ha ganado su batalla contra ' + Chat.escapeHTML(tour.toUserName(loserid)) + '.</b>').update();
						let r = c.round;
						let cc = 0;
						for (let y in r) {
							if (r[y][2] && r[y][2] !== -1 && r[y][2] !== -2) {
								cc++;
							}
						}
						if (r.length === cc) {
							tour.nextRound(rid);
						}
					}
				}
			}
		}
	}

	this._win(winner);
};
