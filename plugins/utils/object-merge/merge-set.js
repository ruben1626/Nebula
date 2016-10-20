'use strict';

const deepMerge = require('./merge-deep');
const weakAssign = require('./weak-assign');

const getElements = Function.prototype.call.bind(Set.prototype[Symbol.iterator]);
const addElement = Function.prototype.call.bind(Set.prototype.add);

exports.shallow = function (target, source, options) {
	const sourceElements = [...getElements(source)];
	for (let i = 0; i < sourceElements.length; i++) {
		addElement(target, sourceElements[i]);
	}
	if (options.preserveTarget) return weakAssign(target, source);
	return Object.assign(target, source);
};

exports.deep = function (target, source, options) {
	const sourceElements = [...getElements(source)];
	for (let i = 0; i < sourceElements.length; i++) {
		addElement(target, sourceElements[i]);
	}
	return deepMerge.mergeGenericObject(target, source, options);
};
