"use strict";

const colors = require('color-name');

const localeData = require('./locale-data'); // TODO: Needs reestructuring!
const nameMap = new Map(localeData.map(entry => [toId(entry[0]), entry[0]]));

const byIdentifier = new Map();

const palette = Object.keys(colors).map(colorId => {
	const [red, green, blue] = colors[colorId];
	const colorData = {
		id: colorId,
		name: nameMap.get(colorId),
		R: red, G: green, B: blue,
	};
	byIdentifier.set(colorId, colorData);
	return colorData;
});

exports.palette = palette;
exports.byId = byIdentifier;
