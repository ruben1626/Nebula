"use strict";

const CHROMATIC_REGIONS = new Map([
	[[0, 360], [s => s < 20, l => l <= 70, "Es un tono grisáceo demasiado tenue y/o brillante"]],
	[[0, 40], [s => s >= 0, l => l <= 90, "Es un tono de rojo o anaranjado demasiado brillante (luminosidad > 90)"]],
	[[40, 190], [s => s < 60, l => l <= 90, "Es un tono de amarillo, verde o celeste tenue demasiado brillante (luminosidad > 90)"]],
	[[40, 190], [s => s >= 60, l => l <= 40, "Es un tono de amarillo, verde o celeste intenso demasiado brillante (luminosidad > 40)"]],
	[[190, 360], [s => s >= 0, l => l <= 90, "Es un tono de azul, morado, rosa o rojo demasiado brillante (luminosidad > 90)"]],
]);

function checkLuminosity(color) {
	for (const hueBounds of CHROMATIC_REGIONS.keys()) {
		if (color.hue >= hueBounds[0] && color.hue < hueBounds[1]) {
			const rule = CHROMATIC_REGIONS.get(hueBounds);
			if (rule[0](color.saturation) && !rule[1](color.luminosity)) {
				return rule[2];
			}
		}
	}
	return '';
}

module.exports = checkLuminosity;
