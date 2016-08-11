"use strict";

const ErrorCreator = require('./../../plugin-error.js');

exports.AuthenticationError = new ErrorCreator(exports.id + '-authentication', 'warning');
exports.IncompatibilityError = new ErrorCreator(exports.id + '-incompatibility', 'debug');
exports.LoadingError = new ErrorCreator(exports.id + '-loading', 'debug');
exports.OriginError = new ErrorCreator(exports.id + '-origin', 'warning');
exports.ProtocolError = new ErrorCreator(exports.id + '-protocol', 'critical');
exports.SecurityAdviceError = new ErrorCreator(exports.id + '-security-advice', 'debug');
exports.SecurityError = new ErrorCreator(exports.id + '-security', 'warning');
exports.RaceError = new ErrorCreator(exports.id + '-race', 'debug');
exports.UnhandledPathError = new ErrorCreator(exports.id + '-unhandled', 'critical');
exports.UnsupportedError = new ErrorCreator(exports.id + '-unsupported', 'debug');
exports.ValidationError = new ErrorCreator(exports.id + '-validation', 'debug');
exports.VerificationError = new ErrorCreator(exports.id + '-verification', 'debug');

exports.StatusError = require('./status-error');

exports.is = function (error, type) {
	// Must support cross-realm errors >_>
	if (typeof error !== 'object' || typeof error.message !== 'string' || typeof error.stack !== 'string') return false;
	if (!type || type.prototype.name === "StatusError" && Object.prototype.hasOwnProperty.call(error, 'status')) return true;
	return error.source === type.prototype.source;
};
