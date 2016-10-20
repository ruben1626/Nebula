'use strict';

const deepMerge = require('./merge-deep');
const weakAssign = require('./weak-assign');

const getEntry = Function.prototype.call.bind(Map.prototype.get);
const hasEntry = Function.prototype.call.bind(Map.prototype.has);
const setEntry = Function.prototype.call.bind(Map.prototype.set);
const getEntries = Function.prototype.call.bind(Map.prototype[Symbol.iterator]);

exports.shallow = function (target, source, options) {
	const sourceEntries = [...getEntries(source)];
	for (let i = 0; i < sourceEntries.length; i++) {
		const entry = sourceEntries[i];
		if (options.preserveTarget && hasEntry(target, entry[0])) continue;
		setEntry(target, entry[0], entry[1]);
	}
	if (options.preserveTarget) return weakAssign(target, source);
	return Object.assign(target, source);
};

exports.deep = function (target, source, options) {
	const sourceEntries = [...getEntries(source)];
	for (let i = 0; i < sourceEntries.length; i++) {
		const entry = sourceEntries[i];
		const key = entry[0];
		const sourceValue = entry[1];

		if (!hasEntry(target, key)) {
			setEntry(target, key, sourceValue);
			continue;
		}
		const targetValue = getEntry(target, key);

		const result = deepMerge.mergeChild(targetValue, sourceValue, key, options);
		setEntry(target, key, result);
	}

	return deepMerge.mergeGenericObject(target, source, options);
};
