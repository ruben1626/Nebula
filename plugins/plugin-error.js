"use strict";

/**
 *
 *	PluginError constructor
 *
 */

const PluginError = (function () {
	function PluginError(message, severity) {
		Error.captureStackTrace(this, PluginError);
		this.name = "PluginError";
		this.message = message || "";
	}
	PluginError.prototype = Object.create(Error.prototype);
	PluginError.prototype.constructor = PluginError;
	PluginError.prototype.toString = function () {
		if (!this.message) return this.name;
		return this.name + ": " + this.message;
	};

	return PluginError;
})();

module.exports = (function () {
	function createCustomConstructor(id, defaultSeverity) {
		if (!defaultSeverity) defaultSeverity = 'critical';
		const CustomError = function (message, severity, originalError) {
			if (typeof severity === 'object') {
				originalError = severity;
				severity = originalError.severity || defaultSeverity;
			}
			Error.captureStackTrace(this, CustomError);
			this.source = id;
			this.name = "PluginError@" + this.source;
			this.message = message || "";
			this.severity = severity || (originalError && originalError.severity || defaultSeverity);
			this.originalError = originalError;
		};
		CustomError.prototype = Object.create(PluginError.prototype);
		CustomError.prototype.constructor = CustomError;
		CustomError.prototype.toString = function () {
			if (!this.message) return this.name;
			return this.name + ": " + this.message;
		};
		CustomError.prototype.toJSON = function () {
			return {
				name: this.name,
				message: this.message,
				stack: this.stack,
				source: this.source,
				severity: this.severity,
			};
		};
		CustomError.prototype.source = id; // purposely duplicate
		return CustomError;
	}
	const cachedConstructors = Object.create(null);

	return function ErrorCreator(id, defaultSeverity) {
		if (cachedConstructors[id]) return cachedConstructors[id];
		const CustomConstructor = createCustomConstructor(id, defaultSeverity);
		cachedConstructors[id] = CustomConstructor;
		return CustomConstructor;
	};
})();
