'use strict';

const deepClone = require('./clone-deep');

const getElements = Function.prototype.call.bind(Set.prototype[Symbol.iterator]);

exports.shallow = function (target, options) {
	let clone;
	if (options.fastCollections !== false) {
		clone = new target.constructor([...getElements(target)]);
	} else {
		clone = new Set([...getElements(target)]);
		clone.constructor = target.constructor;
		Object.setPrototypeOf(clone, Object.getPrototypeOf(constructor));
	}
	return Object.assign(clone, target);
};

exports.deep = function (target, options) {
	const elements = [...getElements(target)].map(elem => deepClone.cloneChild(elem, undefined, options));

	let clone;
	if (options.fastCollections !== false) {
		clone = new target.constructor(elements);
	} else {
		clone = new Set(elements);
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
