

exports.commands = {
	/*********************************************************
	 * Shop commands
	 *********************************************************/

	tienda: 'shop',
	shop: function (target, room, user) {
		if (!this.runBroadcast()) return false;
		this.sendReplyBox(
			'<center><h3><b><u>Tienda del servidor</u></b></h3><table border="1" cellspacing="0" cellpadding="3" target="_blank"><tbody>' +
			'<tr><th>Art&iacute;culo</th><th>Descripci&oacute;n</th><th>Coste</th></tr>' +
			'<tr><td>Home</td><td>Compra una en el Servidor.</td><td>500</td></tr>' +
			'<tr><td>CustomTC</td><td>Compra una Tarjeta de Entrenador personalizada (a partir de código html). Contactar con un administrador si el código es muy largo para un solo mensaje.</td><td>1000</td></tr>' +
			'<tr><td>CustomAvatar</td><td>Compra un avatar personalizado. Preferiblemente debe ser una imagen de pequeñas dimensiones y acorde a las reglas del servidor. Contactar con un Admin para obtener este art&iacute;culo.</td><td>800</td></tr>' +
			'<tr><td>CustomIcon</td><td>Compra un icono personalizado. Preferiblemente debe ser una imagen de pequeñas dimensiones (32x32) y acorde a las reglas del servidor. Contactar con un Admin para obtener este art&iacute;culo.</td><td>800</td></tr>' +
			'<tr><td>CustomColor</td><td>Compra un color personalizado. Contactar con un Admin para obtener este art&iacute;culo.</td><td>800</td></tr>' +
			'<tr><td>CustomPhrase</td><td>Compra una frase de entrada personalizada. Contactar con un Admin para obtener este art&iacute;culo.</td><td>500</td></tr>' +
			'<tr><td>Symbol</td><td>Compra el acceso al comado /customsymbol que permite elegir un símbolo (excepto staff) para aparecer en lo alto de la lista de usuarios.</td><td>20</td></tr>' +
			'<tr><td>TC</td><td>Compra una Tarjeta de entrenador básica. Con una Imagen modificable con /tcimage y una frase de entrenador modificable con /tcphrase</td><td>550</td></tr>' +
			'<tr><td>Sprite</td><td>Añade la imagen de un Pokemon a tu TC Básica. Máximo 6. Se pueden cambiar los pokemon con el comando /tcpokemon</td><td>50</td></tr>' +
			'</tbody></table><br /> Para comprar un artículo usa el comando /buy (artículo)' +
			'<br /> Algunos artículos solo se pueden comprar contactando con un Administrador. Para más información usa /shophelp' +
			'</center>'
		);
	},

	ayudatienda: 'shophelp',
	shophelp: function () {
		if (!this.runBroadcast()) return false;
		this.sendReplyBox(
			"<center><h3><b><u>Tienda del servidor - Comandos</u></b></h3></center>" +
			"<b>Comandos Básicos:</b><br /><br />" +
			"/shop - Muestra los artículos de la tienda.<br />" +
			"/buy (artículo) - Compra un artículo de la tienda.<br />" +
			"/pd (user) - muestra los ahorros de un usuario.<br />" +
			"/donate (user), (money) - Dona una cantidad determinada a otro usuario.<br />" +
			"<br />" +
			"<b>Comandos Específicos:</b><br /><br />" +
			"/tc (user) - Muestra la tarjeta de entrenador de un usuario.<br />" +
			"/tcimage (link) - Cambia la imagen de la Tc.<br />" +
			"/tcphrase (text) - Cambia la frase de la Tc.<br />" +
			"/tcpokemon (pokemon1),(pokemon2)... - Cambia Los sprites de los pokemon de la Tc.<br />" +
			"/tchtml (html) - Modifica la Tarjeta de entrenador personalizada.<br />" +
			"/customsymbol (symbol) - Cambia el símbolo a uno personalizado, pero sin cambiar por ello el rango.<br />" +
			"/resetsymbol - Reestablece el símbolo por omisión.<br />" +
			"/botphrase (texto) - Establece la frase del Bot para el comando .whois.<br />" +
			"<br />" +
			"<b>Comandos Administrativos:</b><br /><br />" +
			"/givemoney (user), (pds) - Da una cantidad de Pds a un usuario.<br />" +
			"/removemoney (user), (pds) - Quita una cantidad de Pds a un usuario.<br />" +
			"/symbolpermision (user), (on/off) - Da o Quita el permiso para usar Custom Symbols.<br />" +
			"/pendigavatars - Muestra la lista de avtares personalizados pendientes por incluir.<br />" +
			"/deavatarreq (user) - Eimina una solicitud de avatar de la lista.<br />" +
			"/removetc (user) - Elimina una tarjeta de entrenador.<br />" +
			"/setcustomtc (user), (on/off) - Establece el permiso para usar una Tc personalizada.<br />" +
			"/sethtmltc (user), (html) - Modifica la Tc personalizada de un usuario.<br />"
		);
	},

	comprar: 'buy',
	buy: function (target, room, user) {
		let params = target.split(',');
		let prize = 0;
		if (!params) return this.sendReply("Usage: /buy object");
		let article = toId(params[0]);
		switch (article) {
		case 'customtc':
			prize = 1000;
			if (Shop.getUserMoney(user.name) < prize) return this.sendReply("No tienes suficiente dinero.");
			var tcUser = Shop.getTrainerCard(user.name);
			if (!tcUser) {
				Shop.giveTrainerCard(user.name);
				tcUser = Shop.getTrainerCard(user.name);
			}
			if (tcUser.customTC) return this.sendReply("Ya poseías este artículo.");
			Shop.setCustomTrainerCard(user.name, true);
			Shop.removeMoney(user.name, prize);
			return this.sendReply("Has comprado una Tarjeta de entreador personalizada. Consulta /shophelp para más información.");
			break;
		case 'tc':
			prize = 550;
			if (Shop.getUserMoney(user.name) < prize) return this.sendReply("No tienes suficiente dinero.");
			var tcUser = Shop.getTrainerCard(user.name);
			if (tcUser) return this.sendReply("Ya poseías este artículo.");
			Shop.giveTrainerCard(user.name);
			Shop.removeMoney(user.name, prize);
			return this.sendReply("Has comprado una Tarjeta de Entrenador. Revisa /shophelp para saber como editarla.");
			break;
		case 'sprite':
			prize = 50;
			if (Shop.getUserMoney(user.name) < prize) return this.sendReply("No tienes suficiente dinero.");
			var tcUser = Shop.getTrainerCard(user.name);
			if (!tcUser) return this.sendReply("Necesitas comprar primero una Tarjeta de entrenador.");
			if (tcUser.nPokemon > 5) return this.sendReply("Ya tienes 6 Pokemon para tu tarjeta de entrenador.");
			if (tcUser.customTC) return this.sendReply("Tu tarjeta es Personalizada. Usa /tchtml pata modificarla.");
			Shop.nPokemonTrainerCard(user.name, tcUser.nPokemon + 1);
			Shop.removeMoney(user.name, prize);
			return this.sendReply("Has comprado un Sprite de un pokemon para tu TC. Revisa /shophelp para más información.");
			break;
		case 'home':
			prize = 500;
			if (Shop.getUserMoney(user.name) < prize) return this.sendReply("No tienes suficiente dinero.");
			if (params.length !== 2) return this.sendReply("Usa el comando así: /buy chatroom,[nombre]");
			var id = toId(params[1]);
			if (Rooms.rooms.has(id)) return this.sendReply("La sala '" + params[1] + "' ya exsiste. Usa otro nombre.");
			if (Rooms.global.addChatRoom(params[1])) {
				const newRoom = Rooms.get(id);
				if (!newRoom.auth) newRoom.auth = newRoom.chatRoomData.auth = {};
				newRoom.auth[toId(user.name)] = '#';
				if (newRoom.chatRoomData) Rooms.global.writeChatRoomData();
				Shop.removeMoney(user.name, prize);
				return this.sendReply("La sala '" + params[1] + "' fue creada con éxito. Únete usando /join " + id);
			}
			return this.sendReply("No se pudo realizar la compra debido a un error al crear la sala '" + params[1] + "'.");
			break;
		case 'symbol':
			prize = 20;
			if (Shop.getUserMoney(user.name) < prize) return this.sendReply("No tienes suficiente dinero.");
			if (Shop.symbolPermision(user.name)) return this.sendReply("Ya posees este artículo.");
			Shop.setSymbolPermision(user.name, true);
			Shop.removeMoney(user.name, prize);
			return this.sendReply("Has comprado el permiso para usar los comandos /customsymbol y /resetsymbol. Para más información consulta /shophelp.");
			break;
		case 'customavatar':
			prize = 800;
			if (Shop.getUserMoney(user.name) < prize) return this.sendReply("No tienes suficiente dinero.");
			if (Config.customavatars[user.userid]) return this.sendReply("Ya habías comprado este artículo. Para cambiar tu avatar compra la opcion Avatar.");
			if (params.length !== 2) return this.sendReply("Usa el comando así: /buy avatar,[imagen]");
			var err = Shop.addPendingAvatar(user.userid, params[1]);
			if (err) return this.sendReply(err);
			Shop.removeMoney(user.name, prize);
			return this.sendReply("Has solicitado un avatar personalizado. Espera a que un admin revise tu compra.");
			break;
		case 'customicon':
			prize = 800;
			if (Shop.getUserMoney(user.name) < prize) return this.sendReply("No tienes suficiente dinero.");
			if (params.length !== 2) return this.sendReply("Usa el comando así: /buy customicon,[imagen]");
			var err = Shop.addPendingIcon(user.userid, params[1]);
			if (err) return this.sendReply(err);
			Shop.removeMoney(user.name, prize);
			return this.sendReply("Has solicitado un icon personalizado. Espera a que un admin revise tu compra.");
			break;
		case 'customcolor':
			prize = 800;
			if (Shop.getUserMoney(user.name) < prize) return this.sendReply("No tienes suficiente dinero.");
			if (params.length !== 2) return this.sendReply("Usa el comando así: /buy customcolor,[imagen]");
			var err = Shop.addPendingColor(user.userid, params[1]);
			if (err) return this.sendReply(err);
			Shop.removeMoney(user.name, prize);
			return this.sendReply("Has solicitado un color personalizado. Espera a que un admin revise tu compra.");
			break;
		case 'customphrase':
			prize = 500;
			if (Shop.getUserMoney(user.name) < prize) return this.sendReply("No tienes suficiente dinero.");
			if (params.length !== 2) return this.sendReply("Usa el comando así: /buy customphrase,[imagen]");
			var err = Shop.addPendingPhrase(user.userid, params[1]);
			if (err) return this.sendReply(err);
			Shop.removeMoney(user.name, prize);
			return this.sendReply("Has solicitado una frase personalizada. Espera a que un admin revise tu compra.");
			break;	
		default:
			return this.sendReply("No has especificado ningún artículo válido.");
		
		}
	},

	money: 'pd',
	pd: function (target, room, user) {
		let autoData = false;
		if (!target) autoData = true;
		if (!this.runBroadcast()) return false;

		let pds = 0;
		let userName = user.name;
		if (autoData) {
			pds = Shop.getUserMoney(user.name);
		} else {
			pds = Shop.getUserMoney(target);
			userName = toId(target);
			let userh = Users.getExact(target);
			if (userh) userName = userh.name;
		}
		this.sendReplyBox('Ahorros de <b>' + userName + '</b>: ' + pds + ' pd');
	},

	tclist: function (target, room, user, connection) {
		if (!user.hasConsoleAccess(connection)) {return this.sendReply("/tclist - Access denied.");}
		this.sendReplyBox(Shop.getTrainerCardList());
	},

	trainercard: 'tc',
	tc: function (target, room, user) {
		let autoData = false;
		if (!target) autoData = true;
		if (!this.runBroadcast()) return false;
		if (room.decision) return this.sendReply('No se pueden poner TCs en las batallas.');

		let pds = 0;
		let userName = user.name;
		let tcData = {};
		if (autoData) {
			tcData = Shop.getTrainerCard(user.name);
		} else {
			tcData = Shop.getTrainerCard(target);
			userName = toId(target);
			let userh = Users.getExact(target);
			if (userh) userName = userh.name;
		}
		if (!tcData) return this.sendReply(userName + " no tenía ninguna tarjeta de entrenador.");
		if (tcData.customTC) {
			if (room.id === 'lobby') return this.sendReply('|raw|<div class="infobox infobox-limited">' + tcData.customHtml + '</div>');
			return this.sendReplyBox(tcData.customHtml);
		}
		let pokeData = '<hr />';
		for (let t in tcData.pokemon) {
			pokeData += '<img src="http://play.pokemonshowdown.com/sprites/xyani/' + Chat.escapeHTML(Shop.getPokemonId(tcData.pokemon[t])) + '.gif" width="auto" /> &nbsp;';
		}
		if (tcData.nPokemon === 0) pokeData = '';
		if (room.id === 'lobby') return this.sendReply('|raw|<div class="infobox infobox-limited"><center><h2>' + userName + '</h2><img src="' + encodeURI(tcData.image) + '" width="80" height="80" title="' + userName + '" /><br /><br /><b>"' + Chat.escapeHTML(tcData.phrase) + '"</b>' + pokeData + '</center></div>');
		this.sendReplyBox('<center><h2>' + userName + '</h2><img src="' + encodeURI(tcData.image) + '" width="80" height="80" title="' + userName + '" /><br /><br /><b>"' + Chat.escapeHTML(tcData.phrase) + '"</b>' + pokeData + '</center>');
	},

	givemoney: function (target, room, user) {
		let params = target.split(',');
		if (!params || params.length !== 2) return this.sendReply("Usage: /givemoney usuario, pds");
		if (!this.can('givemoney')) return false;

		let pds = parseInt(params[1]);
		if (pds <= 0) return this.sendReply("La cantidad no es valida.");
		let userh = Users.getExact(params[0]);
		if (!userh || !userh.connected) return this.sendReply("El usuario no existe o no está disponible");
		let userName = userh.name;
		if (!Shop.giveMoney(params[0], pds)) {
			this.sendReply("Error desconocido.");
		} else {
			this.sendReply(userName + ' ha recibido ' + pds + ' pd');
		}
	},

	removemoney: function (target, room, user) {
		let params = target.split(',');
		if (!params || params.length !== 2) return this.sendReply("Usage: /removemoney usuario, pds");
		if (!this.can('givemoney')) return false;

		let pds = parseInt(params[1]);
		if (pds <= 0) return this.sendReply("La cantidad no es valida.");
		let userh = Users.getExact(params[0]);
		let userName = toId(params[0]);
		if (userh) userName = userh.name;
		if (!Shop.removeMoney(params[0], pds)) {
			this.sendReply("El usuario no tenía suficientes Pds.");
		} else {
			this.sendReply(userName + ' ha perdido ' + pds + ' pd');
		}
	},

	donar: 'donate',
	donate: function (target, room, user) {
		let params = target.split(',');
		if (!params || params.length !== 2) return this.sendReply("Usage: /donate usuario, pds");

		let pds = parseInt(params[1]);
		if (!pds || pds <= 0) return this.sendReply("La cantidad no es valida.");
		let userh = Users.getExact(params[0]);
		if (!userh || !userh.connected) return this.sendReply("El usuario no existe o no está disponible");
		let userName = userh.name;
		if (!Shop.transferMoney(user.name, params[0], pds)) {
			this.sendReply("No tienes suficientes pds.");
		} else {
			this.sendReply('Has donado ' + pds + ' pd al usuario ' + userName + '.');
		}
	},

	symbolpermision: function (target, room, user) {
		if (!this.can('givemoney')) return false;
		let params = target.split(',');
		if (!params || params.length !== 2) return this.sendReply("Usage: /symbolpermision usuario, [on/off]");
		let permision = false;
		if (toId(params[1]) !== 'on' && toId(params[1]) !== 'off') return this.sendReply("Usage: /symbolpermision usuario, [on/off]");
		if (toId(params[1]) === 'on') permision = true;
		if (permision) {
			let userh = Users.getExact(params[0]);
			if (!userh || !userh.connected) return this.sendReply("El usuario no existe o no está disponible");
			if (Shop.setSymbolPermision(params[0], permision)) return this.sendReply("Permiso para customsymbols concedido a " + userh.name);
			return this.sendReply("El usuario ya poseía permiso para usar los customsymbols.");
		} else {
			if (Shop.setSymbolPermision(params[0], permision)) return this.sendReply("Permiso para customsymbols retirado a " + params[0]);
			return this.sendReply("El usuario no tenía ningún permiso que quitar.");
		}
	},

	hideauth: 'customsymbol',
	symbol: 'customsymbol',
	simbolo: 'customsymbol',
	customsymbol: function (target, room, user, connection, cmd) {
		if (!user.can('customsymbol') && !Shop.symbolPermision(user.name)) return this.sendReply('Debes comprar este comando en la tienda para usarlo.');
		if (!target && cmd === 'hideauth') target = ' ';
		if (!target || target.length > 1) return this.sendReply('Debes especificar un caracter como simbolo.');
		if (target.match(/[A-Za-z0-9\d]+/g)) return this.sendReply('Tu simbolo no puede ser un caracter alfanumerico.');
		if (!user.can('customsymbol')) {
			if ('?!$+\u2605%@\u2295&~#'.indexOf(target) >= 0) return this.sendReply('No tienes permiso para elegir un rango como simbolo');
		}
		user.getIdentity = function (roomid) {
			if (this.locked) {
				return '‽' + this.name;
			}
			if (roomid) {
				let room = Rooms.get(roomid);
				if (room.isMuted(this)) {
					return '!' + this.name;
				}
				if (room && room.auth) {
					if (room.auth[this.userid]) {
						return room.auth[this.userid] + this.name;
					}
					if (room.isPrivate === true) return ' ' + this.name;
				}
			}
			return target + this.name;
		};
		user.updateIdentity();
		user.hasCustomSymbol = true;
		this.sendReply('Tu simbolo ha cambiado a "' + target + '"');
	},

	showauth: 'resetsymbol',
	resetsymbol: function (target, room, user) {
		if (!user.hasCustomSymbol) return this.sendReply('No tienes nigún simbolo personalizado.');
		user.getIdentity = function (roomid) {
			if (this.locked) {
				return '‽' + this.name;
			}
			if (roomid) {
				let room = Rooms.get(roomid);
				if (room.isMuted(this)) {
					return '!' + this.name;
				}
				if (room && room.auth) {
					if (room.auth[this.userid]) {
						return room.auth[this.userid] + this.name;
					}
					if (room.isPrivate === true) return ' ' + this.name;
				}
			}
			return this.group + this.name;
		};
		user.hasCustomSymbol = false;
		user.updateIdentity();
		this.sendReply('Tu simbolo se ha restablecido.');
	},

	setbotphrase: function (target, room, user) {
		if (!this.can('givemoney')) return false;
		if (!target) return this.sendReply("Usage: /setbotphrase [user], [phrase]");
		let params = target.split(',');
		if (!params || params.length < 2) return this.sendReply("Usage: /setbotphrase [user], [phrase]");
		let targetUser = Users.get(params[0]);
		if (!targetUser && toId(params[0]) !== 'off') return this.sendReply("El usuario " + toId(params[0]) + 'no está disponible en este momento.');
		Shop.changeBotPhrase(params[0], target.substr(params[0].length + 1));
		return this.sendReply("La frase descriptiva del usuario " + toId(params[0]) + ' ha sido modificada con exito.');
	},

	botphrase: function (target, room, user) {
		if (!Shop.getBotPhrase(user.name)) return this.sendReply("Debes comprar este articulo en la tienda antes de poder usarlo.");
		if (!target) return this.sendReply("Usage: /botphrase texto");
		if (toId(target) === 'off') return this.sendReply("Usage: /botphrase texto");
		if (target.length > 150) return this.sendReply("La frase es demasiado larga. Debe ser menor a 150 caracteres.");
		Shop.changeBotPhrase(user.name, Chat.escapeHTML(target));
		return this.sendReply("Frase modificada con exito.");
	},

	removetc: function (target, room, user) {
		if (!this.can('givemoney')) return false;
		if (!target) return this.sendReply("Usage: /removetc usuario");
		if (Shop.removeTrainerCard(target)) {
			return this.sendReply("Tarjeta de entrenador del usuario " + toId(target) + ' eliminada.');
		} else {
			return this.sendReply("El usuario no poseía Tc.");
		}
	},

	setcustomtc: function (target, room, user) {
		if (!this.can('givemoney')) return false;
		let params = target.split(',');
		if (!params || params.length !== 2) return this.sendReply("Usage: /setcustomtc usuario, [on/off]");
		let permision = false;
		if (toId(params[1]) !== 'on' && toId(params[1]) !== 'off') return this.sendReply("Usage: /setcustomtc usuario, [on/off]");
		if (toId(params[1]) === 'on') permision = true;
		if (permision) {
			let userh = Users.getExact(params[0]);
			if (!userh || !userh.connected) return this.sendReply("El usuario no existe o no está disponible");
			if (Shop.setCustomTrainerCard(params[0], permision)) return this.sendReply("Permiso para customtrainercards concedido a " + userh.name);
			return this.sendReply("El usuario no poseía Tc o ya tenía el permiso para customtrainercards.");
		} else {
			if (Shop.setCustomTrainerCard(params[0], permision)) return this.sendReply("Permiso para customtrainercards retirado a " + params[0]);
			return this.sendReply("El usuario no poseía Tc o no tenía el permiso para customtrainercards.");
		}
	},

	tcimage: function (target, room, user) {
		if (!target) return this.sendReply("Usage: /tcimage link");
		let tcData = Shop.getTrainerCard(user.name);
		if (!tcData) return this.sendReply("No posees ninguna tarjeta de entrenador.");
		if (tcData.customTC) return this.sendReply("Tu tarjeta es personalizada. usa /tchtml para cambiarla.");
		if (target.length > 120) return this.sendReply("El enlace es demasiado largo.");
		if (Shop.imageTrainerCard(user.name, target)) {
			return this.sendReply("Imagen de la TC cambiada con éxito.");
		} else {
			return this.sendReply("Error al cambiar la imagen de la TC.");
		}
	},

	tcphrase: function (target, room, user) {
		if (!target) return this.sendReply("Usage: /tcphrase text");
		let tcData = Shop.getTrainerCard(user.name);
		if (!tcData) return this.sendReply("No posees ninguna tarjeta de entrenador.");
		if (tcData.customTC) return this.sendReply("Tu tarjeta es personalizada. usa /tchtml para cambiarla.");
		if (target.length > 120) return this.sendReply("La frase es muy larga.");
		if (Shop.phraseTrainerCard(user.name, target)) {
			return this.sendReply("Frase de la TC cambiada con éxito.");
		} else {
			return this.sendReply("Error al cambiar la frase de la TC.");
		}
	},

	tcpokemon: function (target, room, user) {
		if (!target) return this.sendReply("Usage: /tcpokemon [Pokemon1], [Pokemon2]...");
		let params = target.split(',');
		let tcData = Shop.getTrainerCard(user.name);
		if (!tcData) return this.sendReply("No posees ninguna tarjeta de entrenador.");
		if (tcData.customTC) return this.sendReply("Tu tarjeta es personalizada. usa /tchtml para cambiarla.");
		if (params.length > tcData.nPokemon) return this.sendReply("Has especificado más Pokemon de los que has comprado.");
		let pokemonList = {};
		let pokemonId = '';
		for (let h in params) {
			pokemonId = Chat.escapeHTML(params[h]);
			if (pokemonId.length > 20) return this.sendReply("Alguno de los nombres de los Pokemon era muy largo.");
			pokemonList[h] = pokemonId;
		}
		if (Shop.pokemonTrainerCard(user.name, pokemonList)) {
			return this.sendReply("Los pokemon de la Tc han sido modificados.");
		} else {
			return this.sendReply("Error al cambiar los pokemon de la TC.");
		}
	},

	tchtml: 'tccustom',
	tccustom: function (target, room, user) {
		let tcData = Shop.getTrainerCard(user.name);
		if (!tcData) return this.sendReply("No posees ninguna tarjeta de entrenador.");
		if (!tcData.customTC) return this.sendReply("Tu tarjeta no es personalizada.");
		if (!target) {
			this.sendReply('Html de tu Tarjeta de entrenador:');
			this.sendReplyBox(Chat.escapeHTML(tcData.customHtml));
			return;
		}
		if (target.length > 1000) return this.sendReply("Tu código es demasiado largo. Contacta con un administrador para modificar la TC custom.");
		let targetABS = Shop.deleteValues(target);
		if (Shop.htmlTrainerCard(user.name, targetABS)) {
			return this.sendReply("La tarjeta de entrenador personalizada ha sido modificada.");
		} else {
			return this.sendReply("Error al cambiar los datos.");
		}
	},

	sethtmltc: function (target, room, user) {
		if (!this.can('givemoney')) return false;
		let params = target.split(',');
		if (!params || params.length < 2) return this.sendReply("Usage: /sethtmltc usuario, html");
		let tcData = Shop.getTrainerCard(params[0]);
		if (!tcData) return this.sendReply("El usuario no posee ninguna tarjeta de entrenador.");
		if (!tcData.customTC) return this.sendReply("La tarjeta no es personalizada.");
		let targetABS = Shop.deleteValues(target.substr(params[0].length + 1));
		if (Shop.htmlTrainerCard(params[0], targetABS)) {
			return this.sendReply("La tarjeta de entrenador personalizada ha sido modificada.");
		} else {
			return this.sendReply("Error al cambiar los datos.");
		}
	},

	avatarespendientes: 'pendingavatars',
	pendingavatars: function (target, room, user) {
		if (!this.runBroadcast()) return false;
		this.sendReplyBox(Shop.getPendingAvatars());
	},

	deavatarreq: 'deleteavatarrequest',
	deleteavatarrequest: function (target, room, user) {
		if (!this.can('givemoney')) return false;
		if (!target) return this.sendReply("No has especificado ningun usuario.");
		let err = Shop.deletePendingAvatar(target);
		if (err) return this.sendReply(err);
		this.sendReply("Solicitud de avatar eliminada");
	},

	colorespendientes: 'pendingcolors',
	pendingcolors: function (target, room, user) {
		if (!this.runBroadcast()) return false;
		this.sendReplyBox(Shop.getPendingColors());
	},

	decolorreq: 'deletecolorrequest',
	deletecolorrequest: function (target, room, user) {
		if (!this.can('givemoney')) return false;
		if (!target) return this.sendReply("No has especificado ningun usuario.");
		let err = Shop.deletePendingColor(target);
		if (err) return this.sendReply(err);
		this.sendReply("Solicitud de color eliminada");
	},

	iconospendientes: 'pendingicons',
	pendingicons: function (target, room, user) {
		if (!this.runBroadcast()) return false;
		this.sendReplyBox(Shop.getPendingIcons());
	},

	deiconreq: 'deleteiconrequest',
	deleteiconrequest: function (target, room, user) {
		if (!this.can('givemoney')) return false;
		if (!target) return this.sendReply("No has especificado ningun usuario.");
		let err = Shop.deletePendingIcon(target);
		if (err) return this.sendReply(err);
		this.sendReply("Solicitud de icono eliminada");
	},

	frasesspendientes: 'pendingphrases',
	pendingphrases: function (target, room, user) {
		if (!this.runBroadcast()) return false;
		this.sendReplyBox(Shop.getPendingPhrases());
	},

	dephrasereq: 'deletephraserequest',
	deletephraserequest: function (target, room, user) {
		if (!this.can('givemoney')) return false;
		if (!target) return this.sendReply("No has especificado ningun usuario.");
		let err = Shop.deletePendingPhrase(target);
		if (err) return this.sendReply(err);
		this.sendReply("Solicitud de frase eliminada");
	},
};
