'use strict';

const cloneArray = require('./clone-array');
const cloneSet = require('./clone-set');
const cloneMap = require('./clone-map');

function clone(target, options) {
	if (Array.isArray(target)) return cloneArray.shallow(target, options); // Clone it fast!
	if (target instanceof Set) return cloneSet.shallow(target, options); // Copy [[SetData]]
	if (target instanceof Map) return cloneMap.shallow(target, options); // Copy [[MapData]]
	const clone = Object.create(Object.getPrototypeOf(target)); // Copy [[Prototype]]
	return Object.assign(clone, target);
}

exports.clone = clone;
