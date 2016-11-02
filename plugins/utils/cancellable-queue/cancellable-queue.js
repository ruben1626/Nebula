'use strict';

const DoublyLinkedList = require('./linked-list-double');

let ELEMENTS = Symbol('ElementsMap');

class CancellableQueue extends DoublyLinkedList {
	constructor(iterable) {
		super(iterable);
		this[ELEMENTS] = new Map();
		for (let node of this.getNodes()) {
			let value = node.getValue();
			if (this[ELEMENTS].has(value)) throw new Error("Duplicate element");
			this[ELEMENTS].set(value, node);
		}

		const lengthDescriptor = Object.getOwnPropertyDescriptor(this, 'length');
		Object.defineProperty(this, 'length', {
			get: lengthDescriptor.get,
			set: function (value) {
				if (value > this.length) throw new RangeError("Invalid array size allocation");
				return lengthDescriptor.set.call(this, value);
			},
			configurable: lengthDescriptor.configurable,
		});
	}
	onNodeAdd(node) {
		this[ELEMENTS].set(node.getValue(), node);
	}
	onNodeRemove(node) {
		this[ELEMENTS].delete(node.getValue());
	}
	indexOf(element) {
		if (!this[ELEMENTS].has(element)) return -1;
		return super.indexOf(element);
	}
	lastIndexOf(element) {
		if (!this[ELEMENTS].has(element)) return -1;
		return super.lastIndexOf(element);
	}
	includes(element) {
		return this[ELEMENTS].has(element);
	}
	clampIndexOf(element, max) {
		if (!this[ELEMENTS].has(element)) return -1;
		if (typeof max === 'undefined') max = Infinity;
		let counter = 0;
		for (let node of this.getNodes()) {
			if (node.getValue() === element) return counter;
			if (++counter > max) return Infinity;
		}
	}
	push(element) {
		if (this[ELEMENTS].has(element)) return false;
		return super.push(element);
	}
	unshift(element) {
		if (this[ELEMENTS].has(element)) return false;
		return super.unshift(element);
	}
	delete(element) {
		if (!this[ELEMENTS].has(element)) return false;
		return this[ELEMENTS].get(element).remove();
	}
	static reviveJSON(key, value) {
		if (key === '') return new CancellableQueue(value);
		return value;
	}
}

module.exports = CancellableQueue;
