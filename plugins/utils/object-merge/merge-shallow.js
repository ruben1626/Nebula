'use strict';

const mergeArrays = require('./merge-array');
const mergeSets = require('./merge-set');
const mergeMaps = require('./merge-map');

const weakAssign = require('./weak-assign');

function merge(target, source, options) {
	if (Array.isArray(target) && Array.isArray(source)) return mergeArrays.shallow(target, source, options); // Clone it fast!
	if (target instanceof Set && source instanceof Set) return mergeSets.shallow(target, source, options); // Copy [[SetData]]
	if (target instanceof Map && source instanceof Map) return mergeMaps.shallow(target, source, options); // Copy [[SetData]]

	if (options.preserveTarget) return weakAssign(target, source);
	return Object.assign(target, source);
}

exports.merge = merge;
