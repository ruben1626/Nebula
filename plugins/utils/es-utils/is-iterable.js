'use strict';

module.exports = function (target) {
	return Symbol.iterator in target;
};
