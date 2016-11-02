'use strict';

const MAX_ARRAY_INDEX = Math.pow(2, 32) - 1;

function toUint32(target) {
	try {
		return target >>> 0;
	} catch (err) {
		// ({toString:1}) crashes
		return -1;
	}
}

module.exports = function (target) {
	const uInt32 = toUint32(target);
	if (uInt32 < 0 || uInt32 === MAX_ARRAY_INDEX) return false;
	return String(uInt32) === target;
};
