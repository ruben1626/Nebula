'use strict';

const isArrayIndex = require('./../es-utils').isArrayIndex;

function getKeys(target) {
	return Object.keys(target).filter(key => !isArrayIndex(key));
}

function assignKeys(target, source) {
	const keys = getKeys(source);
	for (let i = 0; i < keys.length; i++) {
		target[keys[i]] = source[keys[i]];
	}
	return target;
}

exports.get = getKeys;
exports.assign = assignKeys;
