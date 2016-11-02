'use strict';

const hasOwnProperty = Function.prototype.call.bind(Object.prototype.hasOwnProperty);

function assign(target, source) {
	const sourceKeys = Object.keys(source);
	for (let i = 0; i < sourceKeys.length; i++) {
		let key = sourceKeys[i];
		if (!hasOwnProperty(target, key)) {
			target[key] = source[key];
		}
	}
	return target;
}

module.exports = assign;
