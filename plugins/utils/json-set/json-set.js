'use strict';

class JSONSet extends Set {
	toJSON() {
		return Array.from(this);
	}
}

module.exports = JSONSet;
