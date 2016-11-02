'use strict';

module.exports = (function () {
	const DIRECT = Symbol('KeyValueMap');
	const REVERSE = Symbol('ValueKeyMap');

	const nonEnumerable = function (value) {
		return {
			value: value,
			enumerable: false,
			writable: true,
			configurable: true,
		};
	};

	function InjectiveMap(iterable) {
		let forwardsMap = new Map();
		let backwardsMap = new Map();
		if (typeof iterable !== 'undefined') {
			for (let entry of iterable) {
				if (forwardsMap.has(entry[0])) throw new Error("Duplicate key");
				if (backwardsMap.has(entry[1])) throw new Error("Duplicate value");
				forwardsMap.set(entry[0], entry[1]);
				backwardsMap.set(entry[1], entry[0]);
			}
		}
		this[DIRECT] = forwardsMap;
		this[REVERSE] = backwardsMap;
	}
	InjectiveMap.prototype = Object.create(Map.prototype, {
		'constructor': {
			value: Map,
			enumerable: false,
			writable: true,
			configurable: true,
		},
		'has': nonEnumerable(function (value) {
			return this[DIRECT].has(value);
		}),
		'get': nonEnumerable(function (value) {
			return this[DIRECT].get(value);
		}),
		'getKey': nonEnumerable(function (value) {
			return this[REVERSE].get(value);
		}),
		'set': nonEnumerable(function (elem, value) {
			if (this[DIRECT].has(elem)) throw new Error("Duplicate key");
			if (this[REVERSE].has(value)) throw new Error("Duplicate value");
			this[REVERSE].set(value, elem);
			return this[DIRECT].set(elem, value);
		}),
		'delete': nonEnumerable(function (elem) {
			if (!this.has(elem)) return false;
			let value = this.get(elem);
			this[REVERSE].delete(value);
			return this[DIRECT].delete(elem);
		}),
		'clear': nonEnumerable(function () {
			this[REVERSE].clear();
			return this[DIRECT].clear();
		}),
		'entries': nonEnumerable(function () {
			if (!arguments.length) return this[DIRECT].entries();
			return this[DIRECT].entries.apply(this[DIRECT], arguments);
		}),
		'forEach': nonEnumerable(function (cb, thisArg) {
			let map = this;

			switch (arguments.length) {
			case 0: return this[DIRECT].forEach();
			case 1: return this[DIRECT].forEach(function (value, key) {
				cb(value, key, map);
			});
			case 2: return this[DIRECT].forEach(function (value, key) {
				cb.call(thisArg, value, key, map);
			});
			default: return this[DIRECT].apply(this[DIRECT], arguments);
			}
		}),
		'keys': nonEnumerable(function () {
			if (!arguments.length) return this[DIRECT].keys();
			return this[DIRECT].keys.apply(this[DIRECT], arguments);
		}),
		'values': nonEnumerable(function () {
			if (!arguments.length) return this[DIRECT].values();
			return this[DIRECT].values.apply(this[DIRECT], arguments);
		}),
		[Symbol.iterator]: nonEnumerable(function () {
			return this[DIRECT][Symbol.iterator]();
		}),
	});
	if (typeof Symbol.toStringTag === 'symbol') {
		Object.defineProperty(InjectiveMap.prototype, Symbol.toStringTag, nonEnumerable('InjectiveMap'));
	}

	return InjectiveMap;
})();
