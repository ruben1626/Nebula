"use strict";

const StatusError = (function () {
	function StatusError(status, message, headers) {
		Error.captureStackTrace(this, StatusError);
		this.name = "StatusError";
		this.status = status || 500;
		this.code = this.status;
		this.message = message || "";
		this.headers = headers || null;
	}
	StatusError.prototype = Object.create(Error.prototype);
	StatusError.prototype.constructor = StatusError;
	StatusError.prototype.toString = function () {
		if (!this.message) return this.name;
		return this.name + ": " + this.message;
	};
	StatusError.prototype.toJSON = function () {
		return {
			name: this.name,
			message: this.message,
			stack: this.stack,
			status: this.status,
			headers: this.headers,
		};
	};

	StatusError.handler = function (req, res, e) {
		if (e) {
			if (e.status === 404) return this.serveFile('404.html', 404, {}, req, res);
			if (!res.headersSent) {
				if (e.status && e.headers) {
					res.writeHead(e.status, Object.merge({"Content-Type": "text/plain"}, e.headers));
				} else {
					res.writeHead(e.status || 500, {"Content-Type": "text/plain"});
				}
			}
			res.write(("" + e.message) || "500 Internal Server Error");
			return res.end();
		}
	};

	return StatusError;
})();

module.exports = StatusError;
