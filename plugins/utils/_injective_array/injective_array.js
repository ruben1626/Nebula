'use strict';

module.exports = (function () {
	const ELEMENTS = Symbol('ElementMap');

	function updateElementMap(array) {
		Object.defineProperty(array, ELEMENTS, {
			value: getElementMap(array),
			enumerable: false,
			writable: true,
			configurable: true,
		});
	}

	function getElementMap(array) {
		let map = new Map();
		for (let i = 0; i < array.length; i++) {
			map.set(array[i], i);
		}
		return map;
	}

	class InjectiveArray extends Array {
		add(element) {
			if (this[ELEMENTS].has(element)) return false;
			this[ELEMENTS].set(element, this.length);
			super.push(element);
			return true;
		}
		includes(element) {
			if (super.includes) return super.includes(element);
			return this.indexOf(element) >= 0;
		}
		delete(element) {
			if (!this[ELEMENTS].has(element)) return false;
			this.splice(this[ELEMENTS].get(element), 1);
			return true;
		}

		pop() {
			if (!this.length) return;
			let result = super.pop();
			this[ELEMENTS].delete(result);
			return result;
		}
		shift() {
			if (!this.length) return;
			let result = super.shift();
			updateElementMap(result);
			return result;
		}
		push(element) {
			if (arguments.length <= 1) {
				if (this[ELEMENTS].has(undefined)) return this.length;
				this[ELEMENTS].set(element, this.length);
				return super.push(element);
			}
			for (let i = 0; i < arguments.length; i++) {
				this.push(arguments[i]);
			}
			return this.length;
		}
		unshift(element) {
			if (arguments.length <= 1) {
				if (this[ELEMENTS].has(undefined)) return this.length;
				let result = super.unshift(element);
				updateElementMap(this);
				return result;
			}
			for (let i = arguments.length - 1; i >= 0; i--) {
				this.unshift(arguments[i]);
			}
			return this.length;
		}
		splice(index, amount) {
			amount = amount | 0;
			let extraElements = (arguments.length - 2);
			if (extraElements >= 1 && amount >= 1) {
				let ret = this.splice(index, amount);
				this.splice.apply(this, [index, 0].concat(Array.from(arguments).slice(2)));
				return ret;
			} else if (extraElements >= 1) {
				index = Math.min(this.length, index);
				this.length += extraElements;
				for (let i = this.length - 1; i >= index + extraElements; i--) {
					this[i] = this[i - extraElements];
					this[ELEMENTS].set(this[i], i);
				}
				for (let argIndex = 2; argIndex < arguments.length; argIndex += 1, index += 1) {
					this[index] = arguments[argIndex];
					this[ELEMENTS].set(this[index], index);
				}
				return [];
			} else if (amount === 0) {
				return [];
			} else {
				for (let target = index, source = target + amount; source <= this.length; source += 1, amount += 1) {
					this[target] = this[source];
					this[ELEMENTS].set(this[target], target);
				}
				do {
					this.pop();
				} while (--amount);
			}
		}
		filter(fn) {
			let result = super.filter(fn);
			updateElementMap(result);
			return result;
		}
		sort(fn) {
			let result = super.sort(fn);
			updateElementMap(result);
			return result;
		}
	}
	return InjectiveArray;
})();
