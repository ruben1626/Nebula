"use strict";

/**
 *
 *	A way to get the color of user names
 *
 *	Developer: Slayer95
 *
 */

const hashColor = require('./hash');
const convert = require('./convert');
const parseColor = require('./parser');

const colors = new Map();

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
		return `<span style="color:${this.color}">${Chat.escapeHTML(this.name)}</span>`;
	}

	toRawString() {
		return `<span style="color:${this.color}">${Chat.escapeHTML(this.inputName)}</span>`;
	}

	getClickable() {
		return `<span class="username" style="color:${this.color}"><strong>${Chat.escapeHTML(this.name)}</strong></span>`;
	}

	getIdentity() {
		const groupData = Users.usergroups[this.userid];
		const coloredGroup = "" + (groupData ? '<span style="color:#888888">' + groupData.charAt(0) + '</span>' : ' ');
		return `${coloredGroup}${this.getClickable()}`;
	}

	bold() {
		return `<strong style="color:${this.color}"><span>${Chat.escapeHTML(this.name)}</span></strong>`;
	}
}

function getColor(userId) {
	userId = toId(userId);
	if (colors.has(userId)) return colors.get(userId);
	const hslValues = hashColor(userId);
	const hexCode = '#' + convert.hslToRgb(hslValues[0] / 360, hslValues[1] / 100, hslValues[2] / 100).join('');
	colors.set(userId, hexCode);
	return hexCode;
}

function loadColors(colorData) {
	const userIds = Object.keys(colorData);

	for (let i = userIds.length - 1; i >= 0; i--) {
		let userId = userIds[i];
		let color = colorData[userId];
		colors.set(userId, color && typeof color === 'object' ? color.color : getColor(toId(color)));
	}
}

function clearColors() {
	return colors.clear();
}

function applyColor(name) {
	return new ColoredName(name);
}

exports.get = getColor;
exports.parse = parseColor;
exports.apply = applyColor;

exports.clear = clearColors;
exports.load = loadColors;
