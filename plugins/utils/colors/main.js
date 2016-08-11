"use strict";

/**
 *
 *	A way to get the color of user names
 *
 *	Developer: Slayer95
 *
 */

const colors = Object.create(null);

const hashColor = require('./hash');
const convert = require('./convert');
const parseColor = require('./parser');

class ColoredName {
	constructor(name) {
		this.inputName = name;
		this.userid = toId(name);
		this.name = toUserName(this.userid);
		this._color = '';
	}

	get color() {
		if (!this._color) this._color = getColor(this.userid);
		return this._color;
	}

	toString() {
		return `<span style="color:${this.color}">${Tools.escapeHTML(this.name)}</span>`;
	}

	toRawString() {
		return `<span style="color:${this.color}">${Tools.escapeHTML(this.inputName)}</span>`;
	}

	getClickable() {
		return `<span class="username" style="color:${this.color}"><strong>${Tools.escapeHTML(this.name)}</strong></span>`;
	}

	getIdentity() {
		const groupData = Users.usergroups[this.userid];
		const coloredGroup = "" + (groupData ? '<span style="color:#888888">' + groupData.charAt(0) + '</span>' : ' ');
		return `${coloredGroup}${this.getClickable()}`;
	}

	bold() {
		return `<strong style="color:${this.color}"><span>${Tools.escapeHTML(this.name)}</span></strong>`;
	}
}

function getColor(userid) {
	if (colors[userid]) return colors[userid];
	const hslColor = hashColor(userid);
	return (colors[userid] = '#' + convert.hslToRgb(hslColor[0] / 360, hslColor[1] / 100, hslColor[2] / 100).join(''));
}

function loadColors(colorData) {
	const userIds = Object.keys(colorData);

	for (let i = userIds.length - 1; i >= 0; i--) {
		let userId = userIds[i];
		let color = colorData[userId];
		colors[userId] = color && typeof color === 'object' ? color.color : getColor(toId(color));
	}
}

function applyColor(name) {
	return new ColoredName(name);
}

exports.get = getColor;
exports.parse = parseColor;
exports.apply = applyColor;
exports.load = loadColors;
