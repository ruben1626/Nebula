'use strict';

class JSONMap extends Map {
	toJSON() {
		return Array.from(this);
	}
}

module.exports = JSONMap;
