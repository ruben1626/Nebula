"use strict";

const colorDiff = require('color-diff');

const names = require('./names');
const paletteData = require('./custom-data/palette-data');
const paletteCache = new Map();

class Palette {
	constructor(id, data) {
		this.id = id;
		this.data = data;

		// Cache :]
		if (!paletteCache.has(id)) paletteCache.set(id, new Map());
		paletteCache.get(id).set(data.length, this);
	}

	match(color) {
		const {red, green, blue} = color;
		const matchedEntry = colorDiff.closest({R: red, G: green, B: blue}, this.data);

		const nameData = {
			id: matchedEntry.id,
			name: matchedEntry.name,
			palette: this.id,
		};
		const colorData = {
			red: matchedEntry.R,
			green: matchedEntry.G,
			blue: matchedEntry.B,
		};

		return new names.NamedColor(nameData, colorData);
	}
}

const getPalette = function (paletteId, depth) {
	depth = ~~depth;
	if (depth < 0) throw new Error(`Invalid palette depth.`);

	if (paletteCache.has(paletteId) && paletteCache.get(paletteId).has(depth)) {
		return paletteCache.get(paletteId).get(depth);
	}

	if (!(paletteId in paletteData)) throw new Error(`Invalid palette!`);

	const basePalette = paletteData[paletteId];
	if (!depth || depth >= basePalette.length) return new Palette(paletteId, basePalette);

	// TODO!
	// Calculate the distances between each of our colors... O(n^2)
	// Find the color with the least (inverse?) RMS distance to every other color. Remove it and correct our RMS distances. O(n)
	// Iterate until we get down to the desired depth.
	const reducedPalette = basePalette.sample(depth);
	return new Palette(paletteId, [].concat(reducedPalette));
};

exports.get = getPalette;
exports.Palette = Palette;
