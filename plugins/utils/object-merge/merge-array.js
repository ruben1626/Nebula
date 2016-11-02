'use strict';

const deepMerge = require('./merge-deep');
const arrayExtraKeys = require('./array-extra-keys');

const hasOwnProperty = Function.prototype.call.bind(Object.prototype.hasOwnProperty);

exports.shallow = function (target, source, options) {
	const maxLength = Math.max(target.length, source.length);
	if (target.length < maxLength) target.length = maxLength;

	if (options.preserveTarget) {
		for (let i = 0; i < maxLength; i++) {
			if (!hasOwnProperty(target, i) && hasOwnProperty(source, i)) {
				target[i] = source[i];
			}
		}
	} else {
		for (let i = 0; i < maxLength; i++) {
			if (hasOwnProperty(source, i)) {
				target[i] = source[i];
			}
		}
	}

	const enumerableKeys = arrayExtraKeys.get(target);
	for (let i = 0; i < enumerableKeys.length; i++) {
		let key = enumerableKeys[i];
		if (options.preserveTarget && hasOwnProperty(target, key)) {
			continue;
		}
		target[key] = source[key];
	}

	return target;
};

exports.deep = function (target, source, options) {
	const maxLength = Math.max(target.length, source.length);
	if (target.length < maxLength) target.length = maxLength;

	for (let i = 0; i < maxLength; i++) {
		if (!hasOwnProperty(source, i)) continue;
		const sourceValue = source[i];

		if (!hasOwnProperty(target, i)) {
			target[i] = sourceValue;
			continue;
		}
		const targetValue = target[i];

		const result = deepMerge.mergeChild(targetValue, sourceValue, i, options);
		target[i] = result;
	}

	const enumerableKeys = arrayExtraKeys.get(source);
	for (let i = 0; i < enumerableKeys.length; i++) {
		const key = enumerableKeys[i];
		const targetHasKey = hasOwnProperty(target, key);
		if (!targetHasKey) {
			target[key] = source[key];
			continue;
		}
		const targetValue = target[key];
		const sourceValue = source[key];
		const result = deepMerge.mergeChild(targetValue, sourceValue, key, options);
		target[key] = result;
	}

	return target;
};
