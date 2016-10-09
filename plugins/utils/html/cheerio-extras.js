'use strict';

function _eachNested($, selector, fn) {
	const visitedElems = new Set();
	let matched = false;
	do {
		matched = false;
		$(selector).each((index, elem) => {
			if (visitedElems.has(elem)) return;
			visitedElems.add(elem);
			fn(index, elem);
			matched = true;
			return false;
		});
	} while (matched);
}

function eachNested($, selectors, fn) {
	if (!Array.isArray(selectors)) return _eachNested($, selectors, fn);
	selectors.forEach(selector => {
		_eachNested($, selector, fn);
	});
}

exports.eachNested = eachNested;
