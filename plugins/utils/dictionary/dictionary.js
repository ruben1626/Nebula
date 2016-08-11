"use strict";

module.exports = function (data, noCopy) {
	const dict = Object.create(null);
	const dataType = typeof data;
	switch (dataType) {
	case 'string': case 'number':
		dict[dataType] = 1;
		break;
	case 'object':
		if (data[Symbol.iterator] && !Array.isArray(data)) data = Array.from(data);
		if (Array.isArray(data)) {
			for (let i = 0, len = data.length; i < len; i++) {
				dict[data[i]] = 1;
			}
		} else if (data !== null) {
			if (noCopy) return data;
			for (let i in data) {
				dict[i] = 1;
			}
		}
		break;
	case 'undefined':
		break;
	default:
		throw new TypeError("Se esperaba un argumento no definido o de tipo `string`, `number` u `object`, no un " + typeof data + ".");
	}

	return dict;
};
