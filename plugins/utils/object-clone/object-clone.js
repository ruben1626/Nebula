'use strict';

const deepClone = require('./clone-deep').clone;
const shallowClone = require('./clone-shallow').clone;
const isPrimitive = require('./../es-utils').isPrimitive;

module.exports = function (target, options = {}) {
	if (!options || typeof options !== 'object') throw new Error(`Invalid options passed to clone`);
	if ('custom' in options && !Array.isArray(options.custom)) throw new Error(`Custom clone strategies must be specified as an array`);
	if (isPrimitive(target)) return target;
	if (typeof target === 'symbol') return Symbol(target.toString().slice(7, -1));
	if (typeof target === 'function') throw new Error(`It's not possible to clone a function.`);

	return options.deep ? deepClone(target, null, options) : shallowClone(target, options);
};
