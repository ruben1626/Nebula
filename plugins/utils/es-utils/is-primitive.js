'use strict';

module.exports = function (target) {
	if (target == undefined) return true; // eslint-disable-line eqeqeq
	if (typeof target === 'boolean' || typeof target === 'number' || typeof target === 'string') return true;
	return false; // non-null object, function, symbol
};
