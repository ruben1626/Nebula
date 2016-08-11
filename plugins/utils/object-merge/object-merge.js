'use strict';

module.exports = (function () {
	function shallowMerge(target, source, resolve) {
		for (let key of Object.keys(source)) {
			let targetVal = target[key];
			let conflict = targetVal !== void 0; // as opposed to checking `in` or `hasOwnProperty`

			if (!conflict) {
				// there is definitely not a conflict: we are left with the source value, by reference
				target[key] = source[key];
				continue;
			}

			if (resolve === false) {
				target[key] = targetVal;
			} else if (typeof resolve === 'function') {
				let sourceVal = source[key];
				let result = resolve.call(source, key, targetVal, sourceVal);
				target[key] = (result === void 0) ? sourceVal : result;
			} else {
				target[key] = source[key];
			}
		}
	}

	function deepMerge(target, source, resolve) {
		for (let key of Object.keys(source)) {
			let sourceVal = source[key];
			if (sourceVal === void 0) continue;
			let targetVal = target[key];

			if (targetVal === void 0) {
				// there is definitely not a conflict: we are left with the source value (by reference if possible)
				target[key] = sourceVal;
				continue;
			}

			if (typeof resolve === 'function') {
				let result = resolve.call(source, key, targetVal, sourceVal);
				if (result !== void 0) {
					target[key] = result;
					continue;
				}
			}

			if ((sourceVal === null || typeof sourceVal !== 'object') || (targetVal === null || typeof targetVal !== 'object')) {
				// default resolve behavior: just copy the source value (by reference if possible),
				// or keep the target value if `resolve` is set to `false`

				if (resolve !== false) {
					target[key] = sourceVal;
				}
				continue;
			}

			deepMerge(targetVal, sourceVal, resolve);
		}
	}

	return function (target, source, isDeep, resolve) {
		if (typeof target !== 'object' || typeof source !== 'object') throw new TypeError("Aplicar en objetos!");
		if (target === null || source === null) throw new TypeError("`null` no es un parámetro válido!");
		if (resolve !== undefined && typeof resolve !== 'boolean' && typeof resolve !== 'function') throw new TypeError("`resolve` debe ser una función o booleano cuando se proporciona!");

		if (isDeep) {
			return deepMerge(target, source, resolve);
		} else {
			return shallowMerge(target, source, resolve);
		}
	};
})();
