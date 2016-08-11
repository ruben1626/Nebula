'use strict';

const util = require('util');

const STATUSES = new WeakMap();
const RESOLVERS = new WeakMap();
const REJECTERS = new WeakMap();

function trackPromise(promise) {
	STATUSES.set(promise, 0);
	promise.then(
		() => STATUSES.set(promise, 1),
		() => STATUSES.set(promise, 2)
	);
	return promise;
}

function unTrackPromise(promise) { // eslint-disable-line no-unused-vars
	STATUSES.delete(promise);
	return promise;
}

function getResolveDescriptors(source) {
	let resolve = Object.getOwnPropertyDescriptor(source, 'resolve');
	let reject = Object.getOwnPropertyDescriptor(source, 'reject');
	if (!resolve) {
		const inner = source.resolve;
		if (!inner) throw new Error("Invalid resolver");
		resolve = {value: inner, enumerable: false, writable: true, configurable: true};
	}
	if (!reject) {
		const inner = source.reject;
		if (!inner) throw new Error("Invalid rejector");
		reject = {value: inner, enumerable: false, writable: true, configurable: true};
	}
	return {resolve, reject};
}

function setController(promise, controller) {
	// `promise` is expected not to expose other resolver mechanisms
	// e.g. it should be created by Promise.all or Promise.resolve.

	// `controller` is wrapped so that it doesn't override the result
	// from `promise` components before Promise.all / Promise.race ticks
	const controlWrapper = Promise.all([controller]);
	const result = Promise.race([promise, controlWrapper]);

	Object.defineProperties(result, getResolveDescriptors(controller));
	result.resolve = result.resolve.bind(controller);
	result.reject = result.reject.bind(controller);
	return result;
}

function inspectPromiseState(promise) {
	// 0 is overloaded to also mean 'invalid' and/or 'unknown'
	if (typeof promise.constructor !== 'function' || typeof promise.constructor.name !== 'string') return 0;
	const inspectString = util.inspect(promise, {depth: 0});
	if (!promise.constructor.name || !inspectString.startsWith(promise.constructor.name)) return 0;
	const promiseData = inspectString.slice(promise.constructor.name.length).trim().slice(1, -1).trim();
	if (promiseData.startsWith('<pending>')) return 0;
	if (promiseData.startsWith('<rejected>')) return 2;
	return promiseData ? 1 : 0;
}

class PublicPromise extends Promise {
	constructor(fn) {
		const promiseArgs = [null, null];

		super(function (resolve, reject) {
			promiseArgs[0] = resolve;
			promiseArgs[1] = reject;
		});

		STATUSES.set(this, 0);
		RESOLVERS.set(this, promiseArgs[0]);
		REJECTERS.set(this, promiseArgs[1]);

		if (typeof fn !== 'function') return;
		fn(value => {
			if (STATUSES.get(this) === 0) STATUSES.set(this, 1);
			promiseArgs[0](value);
		}, reason => {
			if (STATUSES.get(this) === 0) STATUSES.set(this, 2);
			promiseArgs[1](reason);
		});
	}

	get settled() {
		if (!STATUSES.has(this)) throw new Error("Cannot be inspected");
		return STATUSES.get(this) !== 0;
	}

	get resolved() {
		if (!STATUSES.has(this)) throw new Error("Cannot be inspected");
		return STATUSES.get(this) === 1;
	}

	get rejected() {
		if (!STATUSES.has(this)) throw new Error("Cannot be inspected");
		return STATUSES.get(this) === 2;
	}

	resolve(value) {
		if (!STATUSES.has(this)) throw new Error("Cannot be resolved");
		if (STATUSES.get(this) === 0) STATUSES.set(this, 1);
		RESOLVERS.get(this)(value);
		return this;
	}

	reject(reason) {
		if (!STATUSES.has(this)) throw new Error("Cannot be rejected");
		if (STATUSES.get(this) === 0) STATUSES.set(this, 2);
		REJECTERS.get(this)(reason);
		return this;
	}

	static resolve(value) {
		const isThenable = value && typeof value.then === 'function';
		const result = super.resolve(value);

		let state = 0;
		if (!isThenable) { // Wrap a value
			state = 1;
		} else if (STATUSES.has(value)) { // Wrap an instance of PublicPromise
			state = STATUSES.get(value);
		} else if (value && value instanceof Promise) { // Apply Node magic!
			state = inspectPromiseState(value);
		}

		if (result !== value || !STATUSES.has(value)) {
			// INVESTIGATE: Can the second condition be true?
			// (and is it pertinent?)
			STATUSES.set(result, state);

			if (state === 0) {
				result.then(
					() => STATUSES.set(result, 1),
					() => STATUSES.set(result, 2)
				);
			}
		}

		return result;
	}

	static all(subPromises) {
		subPromises = Array.from(subPromises);
		const compound = super.all(subPromises);
		const result = setController(compound, new PublicPromise());
		return trackPromise(result);
	}

	static race(subPromises) {
		subPromises = Array.from(subPromises);
		const compound = super.race(subPromises);
		const result = setController(compound, new PublicPromise());
		return trackPromise(result);
	}
}

module.exports = PublicPromise;
