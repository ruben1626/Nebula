"use strict";

const Color = require('./color');

const colorW3 = require('./custom-data/colors-w3');
const colorLocales = require('./custom-data/color-locales');

const TRANSLATION_DEPTH = Infinity; // TODO: We shouldn't have an infinite depth due to ontologic/semiotic concerns...

class NamedColor extends Color {
	constructor(nameData, colorData) {
		super(colorData.red, colorData.green, colorData.blue);

		this.id = nameData.id;
		this.name = nameData.name;
		this.palette = nameData.palette;
	}

	getName(language) {
		if (!language || this.palette === language) return this.name;
		return `'${this.name}' (${this.getNearest({
			palette: language,
			depth: TRANSLATION_DEPTH,
		}).name})`;
	}

	static localize(name, languageCode) { // TODO?
		return name;
	}

	static normalize(name) {
		name = name.toLowerCase();
		return colorLocales.normalize(name);
	}

	static from(name, options = {}) {
		const isW3 = Boolean(options && options.w3); // eslint-disable-line no-unused-vars
		const locales = Array.isArray(options) ? options : options && options.locales || ['en'];
		if (!Array.isArray(locales)) throw new Error(`Invalid locales passed to parse()`);

		const id = toId(name);

		let paletteId = '';
		if (colorLocales.en.byId.has(id) && locales.includes('en')) {
			paletteId = 'en';
		} else if (colorLocales.es.byId.has(id) && locales.includes('es')) {
			paletteId = 'es';
		}
		if (!paletteId) return null;

		const normalizedId = colorLocales[paletteId].byId.get(id);
		if (!colorW3.byId.has(normalizedId)) return null;

		const rawColorData = colorW3.byId.get(normalizedId);
		return new NamedColor({
			id: rawColorData.id,
			name: rawColorData.name,
			palette: 'w3',
		}, {
			red: rawColorData.R,
			green: rawColorData.G,
			blue: rawColorData.B,
		});
	}
}

exports.NamedColor = NamedColor;
exports.parse = NamedColor.from;
