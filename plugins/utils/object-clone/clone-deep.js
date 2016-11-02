'use strict';

const isPrimitive = require('./../es-utils').isPrimitive;

const cloneArray = require('./clone-array');
const cloneSet = require('./clone-set');
const cloneMap = require('./clone-map');

const cloneContext = {clone: deepClone};

function _deepClone(target, deepOptions) {
	if (isPrimitive(target) || typeof target === 'function') return target;
	if (typeof target === 'symbol') return Symbol(target.toString().slice(7, -1));

	const clone = Object.create(Object.getPrototypeOf(target)); // Copy [[Prototype]]
	const keys = Object.keys(target);
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		clone[key] = deepClone(target[key], key, deepOptions);
	}
	return clone;
}

function tryMaybeCollection(target, options) {
	if (Array.isArray(target)) { // Clone it fast!
		return cloneArray.deep(target, options);
	} else if (target instanceof Set) { // Copy [[SetData]]
		return cloneSet.deep(target, options);
	} else if (target instanceof Map) { // Copy [[MapData]]
		return cloneMap.deep(target, options);
	}
	return null;
}

function deepClone(target, key, options) {
	if (isPrimitive(target) || typeof target === 'function') return target;
	if (typeof target === 'symbol') return Symbol(target.toString().slice(7, -1));

	if (!options.collections) {
		const clone = tryMaybeCollection(target, options);
		if (clone) return clone;
	}

	if ('custom' in options) {
		for (let i = 0; i < options.custom.length; i++) {
			const entry = options.custom[i];
			if (entry[0].call(null, target, key)) {
				return entry[1].call(cloneContext, target, key);
			}
		}
	}

	if (options.collections === 'custom-with-fallback') {
		const clone = tryMaybeCollection(target, options);
		if (clone) return clone;
	}

	return _deepClone(target, options);
}

function deepCloneRoot(target, placeholder, options) {
	if (isPrimitive(target) || typeof target === 'function') return target;
	if (typeof target === 'symbol') return Symbol(target.toString().slice(7, -1));

	if (!options.collections) {
		const clone = tryMaybeCollection(target, options);
		if (clone) return clone;
	}

	if ('custom' in options) {
		for (let i = 0; i < options.custom.length; i++) {
			const entry = options.custom[i];
			if (entry[0].call(null, target, null)) { // We pass `null` as the key
				return entry[1].call(exports, target, null); // Passing `.deepCloneRoot()` as .clone() is intentional
			}
		}
	}

	if (options.collections === 'custom-with-fallback') {
		const clone = tryMaybeCollection(target, options);
		if (clone) return clone;
	}

	return _deepClone(target, options);
}

exports.cloneChild = deepClone;
exports.clone = deepCloneRoot;
