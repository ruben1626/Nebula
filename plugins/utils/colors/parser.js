"use strict";

const convert = require('./convert');
const names = require('./names');

const Color = require('./color');

const HEX_REGEXP = /^[0-9A-F]+$/;
const FUNCTION_REGEXP = /^[a-zA-Z]+\([^\)]*\)$/;
const ARGUMENTS_REGEXP = new Map([
	[3, /^\s*((?:[0-9]+\.)?[0-9]+(?:[º%])?)\s*,\s*((?:[0-9]+\.)?[0-9]+(?:[º%])?)\s*,\s*((?:[0-9]+\.)?[0-9]+(?:[º%])?)\s*$/],
	[4, /^\s*((?:[0-9]+\.)?[0-9]+(?:[1%])?)\s*,\s*((?:[0-9]+\.)?[0-9]+(?:[º%])?)\s*,\s*((?:[0-9]+\.)?[0-9]+(?:[º%])?)\s*,\s*((?:[0-9]+\.)?[0-9]+(?:[º%])?)\s*$/],
]);

function parseHEX(input) {
	if (input.length < 3 || input.length > 8 || input.length === 5 || input.length === 7) return null;
	input = input.toUpperCase();
	if (!HEX_REGEXP.test(input)) return null;

	switch (input.length) {
	case 3: return Color.fromHEX(input.slice(0, 1).repeat(2), input.slice(1, 2).repeat(2), input.slice(2, 3).repeat(2), 1);
	case 4: return Color.fromHEX(input.slice(0, 1).repeat(2), input.slice(1, 2).repeat(2), input.slice(2, 3).repeat(2), input.slice(3, 4).repeat(2));
	case 6: return Color.fromHEX(input.slice(0, 2), input.slice(2, 4), input.slice(4, 6), 1);
	case 8: return Color.fromHEX(input.slice(0, 2), input.slice(2, 4), input.slice(4, 6), input.slice(6, 8));
	}
}

function parseHSL(input) {
	const parts = input.match(ARGUMENTS_REGEXP.get(3));
	if (!parts) return null;
	const hue = Number(parts[1].endsWith('º') ? parts[1].slice(0, -1) : parts[1]);
	const sat = Number(parts[2].endsWith('%') ? parts[2].slice(0, -1) : parts[2]);
	const lum = Number(parts[3].endsWith('%') ? parts[3].slice(0, -1) : parts[3]);
	if (hue > 360 || sat > 100 || lum > 100) return null;
	if (isNaN(hue) || isNaN(sat) || isNaN(lum)) return null;
	const rgbValues = convert.hslToRgb(hue / 360, sat / 100, lum / 100);
	return new Color(parseInt(rgbValues[0], 16), parseInt(rgbValues[1], 16), parseInt(rgbValues[2], 16), 1);
}

function parseHSLA(input) {
	const parts = input.match(ARGUMENTS_REGEXP.get(4));
	if (!parts) return null;
	const hue = Number(parts[1].endsWith('°') ? parts[1].slice(0, -1) : parts[1]);
	const sat = Number(parts[2].endsWith('%') ? parts[2].slice(0, -1) : parts[2]);
	const lum = Number(parts[3].endsWith('%') ? parts[3].slice(0, -1) : parts[3]);
	const alpha = Number(parts[4]);
	if (isNaN(hue) || isNaN(sat) || isNaN(lum) || isNaN(alpha)) return null;
	if (hue > 360 || sat > 100 || lum > 100 || alpha > 1) return null;
	const rgbValues = convert.hslToRgb(hue / 360, sat / 100, lum / 100);
	return new Color(parseInt(rgbValues[0], 16), parseInt(rgbValues[1], 16), parseInt(rgbValues[2], 16), alpha);
}

function parseRGB(input) {
	const parts = input.match(ARGUMENTS_REGEXP.get(3));
	if (!parts) return null;
	const red = Number(parts[1]);
	const green = Number(parts[2]);
	const blue = Number(parts[3]);
	if (isNaN(red) || isNaN(green) || isNaN(blue)) return null;
	if (red > 0xFF || green > 0xFF || blue > 0xFF) return null;
	return new Color(Math.round(red), Math.round(green), Math.round(blue), 1);
}

function parseRGBA(input) {
	const parts = input.match(ARGUMENTS_REGEXP.get(4));
	if (!parts) return null;
	const red = Number(parts[1]);
	const green = Number(parts[2]);
	const blue = Number(parts[3]);
	const alpha = Number(parts[4]);
	if (isNaN(red) || isNaN(green) || isNaN(blue) || isNaN(alpha)) return null;
	if (red > 0xFF || green > 0xFF || blue > 0xFF || alpha > 1) return null;
	return new Color(Math.round(red), Math.round(green), Math.round(blue), alpha);
}

exports = module.exports = function (input, namedOptions) {
	input = input.trim();
	if (input.startsWith('#')) return parseHEX(input.slice(1));
	if (FUNCTION_REGEXP.test(input)) {
		if (input.startsWith('hsl(') && input.endsWith(')')) return parseHSL(input.slice(4, -1));
		if (input.startsWith('hsla(') && input.endsWith(')')) return parseHSLA(input.slice(5, -1));
		if (input.startsWith('rgb(') && input.endsWith(')')) return parseRGB(input.slice(4, -1));
		if (input.startsWith('rgba(') && input.endsWith(')')) return parseRGBA(input.slice(5, -1));
		return null;
	}
	return names.parse(input, namedOptions);
};

exports.parse = exports;
