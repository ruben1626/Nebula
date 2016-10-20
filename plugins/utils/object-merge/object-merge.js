'use strict';

const deepMerge = require('./merge-deep').merge;
const shallowMerge = require('./merge-shallow').merge;
const isPrimitive = require('./../es-utils').isPrimitive;

module.exports = function (target, source, options = {}) {
	if (!options || typeof options !== 'object') throw new Error(`Invalid options passed to merge`);
	if ('custom' in options && !Array.isArray(options.custom)) throw new Error(`Custom clone strategies must be specified as an array`);

	if (isPrimitive(target) || isPrimitive(source)) throw new Error(`It's not possible to merge primitive values`);
	if (typeof target === 'symbol' || typeof source === 'symbol') throw new Error(`It's not possible to merge primitive values`);

	return options.deep ? deepMerge(target, source, null, options) : shallowMerge(target, source, options);
};
