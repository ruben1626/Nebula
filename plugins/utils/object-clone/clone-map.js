'use strict';

const deepClone = require('./clone-deep');

const getElements = Function.prototype.call.bind(Map.prototype[Symbol.iterator]);

exports.shallow = function (target, options) {
	let clone;
	if (options.fastCollections !== false) {
		clone = new target.constructor([...getElements(target)]);
	} else {
		clone = new Map([...getElements(target)]);
		clone.constructor = target.constructor;
		Object.setPrototypeOf(clone, Object.getPrototypeOf(constructor));
	}
	return Object.assign(clone, target);
};

exports.deep = function (target, options) {
	const entries = [...getElements(target)].map(entry => [entry[0], deepClone.cloneChild(entry[1], entry[0], options)]);

	let clone;
	if (options.fastCollections !== false) {
		clone = new target.constructor(entries);
	} else {
		clone = new Map(entries);
		clone.constructor = target.constructor;
		Object.setPrototypeOf(clone, Object.getPrototypeOf(constructor));
	}

	const keys = Object.keys(target);
	for (let i = 0; i < keys.length; i++) {
		let key = keys[i];
		clone[key] = deepClone.cloneChild(target[key], key, options);
	}
	return clone;
};
