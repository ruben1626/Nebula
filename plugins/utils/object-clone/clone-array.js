'use strict';

const deepClone = require('./clone-deep');
const isPrimitive = require('./../es-utils').isPrimitive;

const arrayExtraKeys = require('./array-extra-keys');
const copyArrayElems = Function.prototype.call.bind([].slice);

exports.shallow = function (target, options) {
	const clone = copyArrayElems(target);
	const enumerableKeys = arrayExtraKeys.get(target);
	for (let i = 0; i < enumerableKeys.length; i++) {
		let key = enumerableKeys[i];
		clone[key] = target[key];
	}
	return clone;
};

exports.deep = function (target, options) {
	const clone = copyArrayElems(target);
	const enumerableKeys = arrayExtraKeys.get(target);
	for (let i = 0; i < clone.length; i++) {
		let value = clone[i];
		if (isPrimitive(value)) continue;
		clone[i] = deepClone.cloneChild(value, i, options);
	}
	for (let i = 0; i < enumerableKeys.length; i++) {
		let key = enumerableKeys[i];
		let value = clone[key];
		clone[key] = deepClone.cloneChild(value, key, options);
	}
	return clone;
};
