'use strict';

const LENGTH = Symbol('Length');

class NodeLink extends Array {
	constructor(prev, next) {
		super(2);
		this[0] = prev;
		this[1] = next;
	}
	getNext() {
		return this[1];
	}
	getPrev() {
		return this[0];
	}
	setPrev(node) {
		this[0] = node;
	}
	setNext(node) {
		this[1] = node;
	}
}

class Node extends Array {
	constructor(element, list) {
		super(2);
		this.setValue(element);
		this.setLink(null);
		Object.defineProperty(this, 'list', {
			value: list,
			enumerable: false,
			writable: true,
			configurable: true,
		});
		this.list[LENGTH]++;
	}
	getValue() {
		return this[0];
	}
	setValue(value) {
		this[0] = value;
	}
	getLink(link) {
		return this[1];
	}
	getNext() {
		let link = this.getLink();
		if (link === null) throw new Error("Isolated node");
		return link.getNext();
	}
	getPrev() {
		let link = this.getLink();
		if (link === null) throw new Error("Isolated node");
		return link.getPrev();
	}
	insertPrev(elem) {
		let node = new Node(elem, this.list);
		this.insertNodeBefore(node);
	}
	insertNext(elem) {
		let node = new Node(elem, this.list);
		this.insertNodeAfter(node);
	}
	remove() {
		let link = this.getLink();
		if (link === null) throw new Error("Isolated node");
		let prevNode = link.getPrev();
		let nextNode = link.getNext();

		if (prevNode) {
			prevNode.getLink().setNext(nextNode);
		} else {
			this.list.firstElement = nextNode;
		}
		if (nextNode) {
			nextNode.getLink().setPrev(prevNode);
		} else {
			this.list.lastElement = prevNode;
		}

		this.setLink(null);
		this.list[LENGTH]--;

		this.list.onNodeRemove(this, prevNode, nextNode);
		return true;
	}

	/******************
	 * @private
	 ******************/
	setLink(link) {
		this[1] = link;
	}

	/******************
	 * @private
	 ******************/
	insertNodeBefore(node) {
		let link = this.getLink();
		if (link === null) throw new Error("Isolated node");
		let prevNode = link.getPrev();
		link.setPrev(node);
		if (prevNode !== null) {
			prevNode.getLink().setNext(node);
		}
		node.setLink(new NodeLink(prevNode, this));
		this.list.onNodeAdd(this, prevNode, node);
	}

	/******************
	 * @private
	 ******************/
	insertNodeAfter(node) {
		let link = this.getLink();
		if (link === null) throw new Error("Isolated node");
		let nextNode = link.getNext();
		link.setNext(node);
		if (nextNode !== null) {
			nextNode.getLink().setPrev(node);
		}

		node.setLink(new NodeLink(this, nextNode));
		this.list.onNodeAdd(this, node, nextNode);
	}
}

class DoublyLinkedList {
	constructor(iterable) {
		this.firstElement = null;
		this.lastElement = null;
		this[LENGTH] = 0;

		Object.defineProperty(this, 'length', {
			get: function () {
				return this[LENGTH];
			},
			set: function (value) {
				if (value < 0 || value > 0xFFFFFFFF || !Number.isInteger(value)) throw new RangeError("Invalid length");
				const OLD_LENGTH = this.length;
				if (value === OLD_LENGTH) return;
				if (value === 0) {
					this.firstElement = null;
					this.lastElement = null;
					return;
				}
				if (value > OLD_LENGTH) {
					for (let i = OLD_LENGTH; i < value; i++) {
						this.push(null);
					}
				} else {
					for (let i = value; i < OLD_LENGTH; i++) {
						this.pop();
					}
				}
			},
			configurable: true,
		});

		if (iterable && typeof iterable[Symbol.iterator] === 'function') {
			let nodes = Array.from(iterable).map(element => new Node(element, this));
			linkNodes(nodes);
			if (nodes.length >= 1) {
				this.firstElement = nodes[0];
				this.lastElement = nodes[nodes.length - 1];
			}
		}
	}
	static reviveJSON(key, value) {
		if (key === '') return new DoublyLinkedList(value);
		return value;
	}
	join(separator) {
		return Array.from(this).join(separator);
	}
	indexOf(elem) {
		let counter = 0;
		for (let node of this.getNodes()) {
			if (node.getValue() === elem) return counter;
			counter++;
		}
		return -1;
	}
	lastIndexOf(elem) {
		let counter = this.length - 1;
		for (let node of this.getNodesReverse()) {
			if (node.getValue() === elem) return counter;
			counter--;
		}
		return -1;
	}
	includes(elem) {
		for (let node of this.getNodes()) {
			if (node.getValue() === elem) return true;
		}
		return false;
	}
	pop() {
		if (this.lastElement === null) return undefined;
		let value = this.lastElement.getValue();
		this.lastElement.remove();
		return value;
	}
	shift() {
		if (this.firstElement === null) return undefined;
		let value = this.firstElement.getValue();
		this.firstElement.remove();
		return value;
	}
	push(element) {
		let node = new Node(element, this);
		let lastElement = this.lastElement;
		node.setLink(new NodeLink(lastElement, null));

		if (lastElement === null) {
			this.firstElement = node;
			this.lastElement = node;
		} else {
			this.lastElement.getLink().setNext(node);
			this.lastElement = node;
		}
		this.onNodeAdd(node, lastElement, null);
		return true;
	}
	unshift(element) {
		let node = new Node(element, this);
		let firstElement = this.firstElement;
		node.setLink(new NodeLink(null, firstElement));

		if (firstElement === null) {
			this.firstElement = node;
			this.lastElement = node;
		} else {
			this.firstElement.getLink().setPrev(node);
			this.firstElement = node;
		}
		this.onNodeAdd(node, null, firstElement);
		return true;
	}
	clone() {
		let Species = this.constructor[Symbol.species];
		if (Species === null || Species === undefined) Species = DoublyLinkedList;
		let clone = new Species();
		if (this.firstElement === null) return clone;

		let nodes = [];
		for (let node of this.getNodes()) {
			nodes.push(new Node(node.getValue(), clone));
		}
		linkNodes(nodes);

		clone.firstElement = nodes[0];
		clone.lastElement = nodes[nodes.length - 1];
		return clone;
	}
	reverse() {
		let Species = this.constructor[Symbol.species];
		if (Species === null || Species === undefined) Species = DoublyLinkedList;
		let reverse = new Species();
		if (this.firstElement === null) return reverse;

		let nodes = [];
		for (let node of this.getNodesReverse()) {
			nodes.push(new Node(node.getValue(), reverse));
		}
		linkNodes(nodes);

		reverse.firstElement = nodes[0];
		reverse.lastElement = nodes[nodes.length - 1];
		return reverse;
	}
	find(callback, thisArg) {
		for (let node of this.getNodes()) {
			if (callback.call(thisArg, node.getValue(), node, this)) return node.getValue();
		}
		return undefined;
	}
	findLast(callback, thisArg) {
		for (let node of this.getNodesReverse()) {
			if (callback.call(thisArg, node.getValue(), node, this)) return node.getValue();
		}
		return undefined;
	}
	findNode(callback, thisArg) {
		if (typeof callback !== 'function') throw new TypeError("findNode must be passed a function.");
		for (let node of this.getNodes()) {
			if (callback.call(thisArg, node.getValue(), node, thisArg)) return node;
		}
		return null;
	}
	findLastNode(callback, thisArg) {
		if (typeof callback !== 'function') throw new TypeError("findLastNode must be passed a function.");
		for (let node of this.getNodesReverse()) {
			if (callback.call(thisArg, node.getValue(), node, thisArg)) return node;
		}
		return null;
	}
	forEach(callback, thisArg) {
		if (typeof callback !== 'function') throw new TypeError("forEach must be passed a function.");
		let node = this.firstElement;
		while (node) {
			callback.call(thisArg, node.getValue(), node, this);
			node = node.getNext();
		}
	}
	forEachReverse(callback, thisArg) {
		if (typeof callback !== 'function') throw new TypeError("forEachReverse must be passed a function.");
		let node = this.lastElement;
		while (node) {
			callback.call(thisArg, node.getValue(), node, this);
			node = node.getPrev();
		}
	}
	map(callback, thisArg) {
		if (typeof callback !== 'function') throw new TypeError("map must be passed a function.");
		let Species = this.constructor[Symbol.species];
		if (Species === null || Species === undefined) Species = DoublyLinkedList;
		let mapped = new Species();
		if (!this.length) return mapped;

		let nodes = [];
		for (let node of this.getNodes()) {
			nodes.push(new Node(callback.call(thisArg, node.getValue(), node, this), mapped));
		}
		linkNodes(nodes);
		if (nodes.length >= 1) {
			mapped.firstElement = nodes[0];
			mapped.lastElement = nodes[nodes.length - 1];
		}
		return mapped;
	}
	mapReverse(callback, thisArg) {
		if (typeof callback !== 'function') throw new TypeError("mapReverse must be passed a function.");
		let Species = this.constructor[Symbol.species];
		if (Species === null || Species === undefined) Species = DoublyLinkedList;
		let mapped = new Species();
		if (!this.length) return mapped;

		let nodes = [];
		for (let node of this.getNodesReverse()) {
			nodes.push(new Node(callback.call(thisArg, node.getValue(), node, this), mapped));
		}
		linkNodes(nodes);
		if (nodes.length >= 1) {
			mapped.firstElement = nodes[0];
			mapped.lastElement = nodes[nodes.length - 1];
		}
		return mapped;
	}
	filter(callback, thisArg) {
		if (typeof callback !== 'function') throw new TypeError("filter must be passed a function.");
		let Species = this.constructor[Symbol.species];
		if (Species === null || Species === undefined) Species = DoublyLinkedList;
		let filtered = new Species();
		if (!this.length) return filtered;

		let nodes = [];
		for (let node of this.getNodes()) {
			if (!callback.call(thisArg, node.getValue(), node, this)) continue;
			nodes.push(new Node(node.getValue(), filtered));
		}
		linkNodes(nodes);
		if (nodes.length >= 1) {
			filtered.firstElement = nodes[0];
			filtered.lastElement = nodes[nodes.length - 1];
		}
		return filtered;
	}
	some(callback, thisArg) {
		if (typeof callback !== 'function') throw new TypeError("some must be passed a function.");
		let node = this.findNode(callback, thisArg);
		return Boolean(node);
	}
	sort(compareFn) {
		throw new TypeError("Not implemented");
	}

	toJSON() {
		return Array.from(this);
	}

	onNodeAdd() {}
	onNodeRemove() {}

	*getNodes() {
		let current = this.firstElement;
		let next = current === null ? null : current.getNext();
		while (current) {
			yield current;
			current = next;
			next = next === null ? null : next.getNext();
		}
	}
	*getNodesReverse() {
		let current = this.lastElement;
		let prev = current === null ? null : current.getPrev();
		while (current) {
			yield current;
			current = prev;
			prev = prev === null ? null : prev.getPrev();
		}
	}
	*[Symbol.iterator]() {
		for (let node of this.getNodes()) {
			yield node.getValue();
		}
		/*let firstElement = this.firstElement;
		return {
			current: null,
			started: false,
			done: false,
			next: function () {
				if (this.done) return {done: true}; // We already finished
				if ((this.started ? this.current.getNext() : firstElement) === null) {
					// There are no remaining elements in our list (or there never were any elements)
					this.done = true;
					return {done: true};
				} else {
					this.current = (this.started ? this.current.getNext() : firstElement);
					this.started = true;
					return {done: false, value: this.current.getValue()};
				}
			}
		};*/
	}
}

module.exports = DoublyLinkedList;

function linkNodes(nodes) {
	if (nodes.length >= 2) {
		nodes[0].setLink(new NodeLink(null, nodes[1]));
		for (let i = 1; i < nodes.length - 1; i++) {
			nodes[i].setLink(new NodeLink(nodes[i - 1], nodes[i + 1]));
		}
		nodes[nodes.length - 1].setLink(new NodeLink(nodes[nodes.length - 2], null));
	}
}
