"use strict";

const colors = require('color-name');

const localeData = require('./locale-data'); // TODO: Needs reestructuring!
const nameMap = new Map(localeData.map(entry => [
	toId(entry[0]),
	{en: entry[0], es: entry[1]},
])); // Provisional

const spanish2w3 = new Map(localeData.map(entry => [toId(entry[1]), toId(entry[0])]));
const english2w3 = new Map(localeData.map(entry => [toId(entry[0]), toId(entry[0])]));

const englishColors = Object.keys(colors).map(colorId => {
	const [red, green, blue] = colors[colorId];
	const name = nameMap.get(colorId).en;
	return {
		id: toId(name),
		name: name,
		R: red, G: green, B: blue,
	};
});

const spanishColors = Object.keys(colors).map(colorId => {
	const [red, green, blue] = colors[colorId];
	const name = nameMap.get(colorId).es;
	return {
		id: toId(name),
		name: name,
		R: red, G: green, B: blue,
	};
});

exports.en = englishColors;
exports.es = spanishColors;

Object.defineProperty(englishColors, 'byId', {
	enumerable: false, writable: true, configurable: true,
	value: english2w3,
});
Object.defineProperty(spanishColors, 'byId', {
	enumerable: false, writable: true, configurable: true,
	value: spanish2w3,
});

exports.normalize = function (input) {
	if (spanish2w3.has(input)) return spanish2w3.get(input);
	if (english2w3.has(input)) return english2w3.get(input);
	return input;
};
