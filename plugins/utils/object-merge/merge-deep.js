'use strict';

const isPrimitive = require('./../es-utils').isPrimitive;

const mergeArrays = require('./merge-array');
const mergeSets = require('./merge-set');
const mergeMaps = require('./merge-map');

const mergeContext = {merge: deepMerge};

const hasOwnProperty = Function.prototype.call.bind(Object.prototype.hasOwnProperty);

function _deepMerge(target, source, options) {
	if (!isPrimitive(source)) {
		const sourceKeys = Object.keys(source);
		for (let i = 0; i < sourceKeys.length; i++) {
			const key = sourceKeys[i];
			const targetHasKey = hasOwnProperty(target, key);
			if (!targetHasKey) {
				target[key] = source[key];
				continue;
			}
			const mergedValue = deepMerge(target[key], source[key], key, options);
			target[key] = mergedValue;
		}
	}

	if (isPrimitive(target) || isPrimitive(source) || typeof target === 'symbol' || typeof source === 'symbol') {
		return options.preserveTarget ? target : source;
	}

	return target;
}

function tryMaybeCollection(target, source, options) {
	if (Array.isArray(target)) { // Clone it fast!
		return mergeArrays.deep(target, source, options);
	} else if (target instanceof Set) { // Copy [[SetData]]
		return mergeSets.deep(target, source, options);
	} else if (target instanceof Map) { // Copy [[MapData]]
		return mergeMaps.deep(target, source, options);
	}
	return null;
}

function deepMerge(target, source, key, options) {
	if (!options.collections) {
		const result = tryMaybeCollection(target, source, options);
		if (result) return result;
	}

	if (('custom' in options) && Array.isArray(options.custom)) {
		for (let i = 0; i < options.custom.length; i++) {
			const entry = options.custom[i];
			 // `target` and `source` are really `targetValue` and `sourceValue` for this `key`.
			if (entry[0].call(null, target, source, key)) {
				return entry[1].call(mergeContext, target, source, key);
			}
		}
	}

	if (isPrimitive(target) || isPrimitive(source) || typeof target === 'symbol' || typeof source === 'symbol') {
		return options.preserveTarget ? target : source;
	}

	if (options.collections === 'custom-with-fallback') {
		const result = tryMaybeCollection(target, source, options);
		if (result) return result;
	}

	return _deepMerge(target, source, options);
}

function deepMergeRoot(target, source, placeholder, options) {
	if (isPrimitive(target) || isPrimitive(source)) throw new Error(`Cannot merge primitive values`);
	if (typeof target === 'symbol' || typeof source === 'symbol') throw new Error(`Cannot merge primitive values`);

	if (!options.collections) {
		const result = tryMaybeCollection(target, source, options);
		if (result) return result;
	}

	if (('custom' in options) && Array.isArray(options.custom)) {
		for (let i = 0; i < options.custom.length; i++) {
			const entry = options.custom[i];
			// `target` and `source` are the root values. `key` is intentionally `null`.
			if (entry[0].call(null, target, source, null)) {
				return entry[1].call(exports, target, null); // Passing `.deepMergeRoot()` as .merge() is intentional
			}
		}
	}

	if (options.collections === 'custom-with-fallback') {
		const result = tryMaybeCollection(target, source, options);
		if (result) return result;
	}

	return _deepMerge(target, source, options);
}

exports.mergeGenericObject = _deepMerge;
exports.mergeChild = deepMerge;
exports.merge = deepMergeRoot;
