'use strict';

const fs = require('fs');

const checkLuminosity = require('./validate-luminosity');
const mainCustomColors = require('./custom-data/smogon-custom');
const customColors = Object.assign(Object.create(null), mainCustomColors);

const filepath = 'config/customcolors.json';

exports.dynamic = {
	customColors: customColors,
};

exports.loadData = function () {
	try {
		const fileContent = fs.readFileSync(filepath, 'utf8');
		Object.assign(customColors, JSON.parse(fileContent));
		exports.dataLoaded = true;
	} catch (err) {}
};

exports.onLoad = function () {
	Plugins.Colors.load(customColors);
};

function updateColor() {
	fs.writeFileSync(filepath, JSON.stringify(customColors));

	let newCss = '/* COLORS START */\n';

	for (let name in customColors) {
		newCss += generateCSS(name, customColors[name]);
	}
	newCss += '/* COLORS END */\n';

	let file = fs.readFileSync('config/custom.css', 'utf8').split('\n');
	if (~file.indexOf('/* COLORS START */')) file.splice(file.indexOf('/* COLORS START */'), (file.indexOf('/* COLORS END */') - file.indexOf('/* COLORS START */')) + 1);
	fs.writeFileSync('config/custom.css', file.join('\n') + newCss);
	LoginServer.request('invalidatecss', {}, () => {});
}

function generateCSS(name, color) {
	let css = '';
	let rooms = [];
	name = toId(name);
	Rooms.rooms.forEach((curRoom, id) => {
		if (id === 'global' || curRoom.type !== 'chat' || curRoom.isPersonal) return;
		if (!isNaN(Number(id.charAt(0)))) return;
		rooms.push('#' + id + '-userlist-user-' + name + ' strong em');
		rooms.push('#' + id + '-userlist-user-' + name + ' strong');
		rooms.push('#' + id + '-userlist-user-' + name + ' span');
	});
	css = rooms.join(', ');
	css += '{\ncolor: ' + color + ' !important;\n}\n';
	css += '.chat.chatmessage-' + name + ' strong {\n';
	css += 'color: ' + color + ' !important;\n}\n';
	return css;
}

exports.commands = {
	customcolor: function (target, room, user) {
		if (!this.can('customcolor')) return false;
		if (!target) return this.parse('/help customcolor');
		const parts = target.split(',', 2).map(part => part.trim());
		if (parts.length < 2) return this.parse('/help customcolor');
		const targetUserid = toId(parts[0]);
		if (!targetUserid || parts[0].length > 18) return this.errorReply(`Indica un nombre de usuario válido.`);

		if (parts[1] === 'delete') {
			if (!(targetUserid in customColors)) return this.errorReply(`/customcolor - ${parts[0]} no tiene un color personalizado.`);
			delete customColors[targetUserid];
			updateColor();

			this.sendReply(`Eliminaste el color personalizado de ${targetUserid}.`);
			Rooms('staff').add(`${user.name} eliminó el color personalizado de ${targetUserid}.`).update();
			this.privateModCommand(`(Color personalizado de ${targetUserid} removido por ${user.name}).`);

			const targetUser = Users.getExact(targetUserid);
			if (targetUser && targetUser.connected) {
				targetUser.popup(`${user.name} eliminó tu color personalizado.`);
			}
			return;
		}

		if (targetUserid in customColors) return this.errorReply(`El usuario indicado ya tiene un color personalizado. Ejecuta antes /customcolor [user], delete.`);
		const colorData = Plugins.Colors.parse(parts[1], ['en', 'es']);
		if (!colorData) return this.errorReply(`${parts[1]} no es un color válido.`);
		const colorHex = colorData.toString('hex');

		Plugins.Colors.load({[targetUserid]: colorHex});
		this.sendReply(`|raw|Has otorgado un color personalizado a ${Plugins.Colors.apply(targetUserid).bold()}.`);
		Rooms('staff').addRaw(Chat.html`${parts[0]} obtuvo un <strong><font color="${colorHex}">color personalizado</font></strong> de ${user.name}.`).update();
		this.privateModCommand(`(${parts[0]} obtuvo un color personalizado: '${parts[1]}' de parte de ${user.name}.)`;

		customColors[targetUserid] = colorHex;
		updateColor();
	},
	customcolorhelp: [
		`/customcolor [usuario], [color] - Otorga al usuario indicado el color especificado.`,
		`/customcolor [usuario], delete - Elimina el color personalizado del usuario indicado.`
	]

	colorpreview: 'checkcolor',
	checkcolor: function (target, room, user, connection, cmd) {
		if (!this.runBroadcast()) return;

		let fromName = '';
		let color = target.startsWith('@') ? null : Plugins.Colors.parse(target, ['es', 'en']);
		if (color) {
			target = this.splitTarget(user.name, true);
		} else {
			target = this.splitTarget(target || user.name, true);
			if (this.targetUsername && this.targetUser !== user && (!(this.targetUserid in Users.usergroups))) {
				if (!target && !user.trusted) return this.errorReply(`No autorizado a verificar el color.`);
			}
			if (!this.targetUserid || this.targetUsername.length > 18) {
				return this.errorReply(`No se encontró un usuario válido "${this.targetUsername}".`);
			}
			if (!target) {
				target = Plugins.Colors.get(this.targetUserid);
				fromName = this.targetUsername;
			}
			color = Plugins.Colors.parse(target, ['es', 'en']);
		}
		if (!color) return this.parse('/help checkcolor');

		const targetColorName = fromName ? `[${color.toString('hex')}]` : color.toString('hex');
		const formattedColor = Chat.html`<span style="font-weight:bold; color:${color.toString('hex')}">${targetColorName}</span>`;
		const targetColorDesc = (
			fromName ?
			`El tono ‘${color.getName('es')}’ de ${Plugins.Colors.apply(fromName).bold()} ${formattedColor}` :
			`El tono de ‘${color.getName('es')}’ ${formattedColor}`
		);

		const error = checkLuminosity(color);
		const validationText = this.targetUsername === fromName ? `No se detectó problemas al validarlo` : Chat.html`No se detectó problemas al validarlo para <strong style="color:${color.toString('hex')}">${this.targetUsername}</strong>`;
		return this.sendReply(
			`|raw|${targetColorDesc} equivale a <code>${color.toString('hsl')}</code>.\n` +
			(error || `|raw|${validationText}.`)
		);
	},
	checkcolorhelp: [`/checkcolor [color], [usuario] - Verifica la apariencia y legalidad de un color asociado a un nombre de usuario.`],
};
