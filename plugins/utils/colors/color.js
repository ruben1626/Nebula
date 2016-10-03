"use strict";

const convert = require('./convert');
const Palettes = require('./palettes');

function loadHSL(color) {
	const hslValues = convert.rgbToHsl(color.red, color.green, color.blue);
	color._h = hslValues[0];
	color._s = hslValues[1];
	color._l = hslValues[2];
}

class Color {
	constructor(red, green, blue, alpha) {
		this.red = red;
		this.green = green;
		this.blue = blue;
		this.alpha = alpha;

		this._h = -1;
		this._s = -1;
		this._l = -1;
	}

	get hue() {
		if (this._h < 0) loadHSL(this);
		return this._h;
	}

	get saturation() {
		if (this._s < 0) loadHSL(this);
		return this._s;
	}

	get luminosity() {
		if (this._l < 0) loadHSL(this);
		return this._l;
	}

	hasAlpha() {
		return this.alpha < 1;
	}

	toString(encoding) {
		encoding = encoding ? encoding.toLowerCase() : 'hex';
		switch (encoding) {
		case 'hex': return `#${[this.red, this.green, this.blue].map(qty => qty.toString(16).toUpperCase().padLeft(2, '0')).join('')}`;
		case 'rgb': return `rgb(${this.red}, ${this.green}, ${this.blue})`;
		case 'rgba': return `rgba(${this.red}, ${this.green}, ${this.blue}, ${this.alpha})`;
		case 'hsl': return `hsl(${this.hue}°, ${this.saturation}%, ${this.luminosity}%)`;
		case 'hsla': return `hsl(${this.hue}°, ${this.saturation}%, ${this.luminosity}%, ${this.alpha})`;
		}
	}

	_getNearest(palette, depth) {
		return Palettes.get(palette, depth).match(this);
	}

	getNearest(options) {
		if (typeof options === 'string') return this._getNearest(options, Infinity);
		return this._getNearest(options.palette, 'depth' in options ? options.depth : Infinity);
	}

	getName(language, depth) {
		const nearestNamed = this._getNearest(language, Infinity);
		return nearestNamed.getName();
	}

	static fromHEX(red, green, blue, alpha) {
		return new Color(parseInt(red, 16), parseInt(green, 16), parseInt(blue, 16), parseInt(alpha, 16));
	}
}

module.exports = Color;
