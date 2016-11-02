"use strict";

const EventEmitter = require('events').EventEmitter;

function FakeProcessHelper(input, output) {
	this.input = input;
	this.output = output;
}

FakeProcessHelper.prototype = {
	input: null,
	output: null,
	on: function (event, callback) {
		setImmediate(this.input.on.bind(this.input, event, callback));
		return this;
	},
	send: function (message) {
		setImmediate(this.output.emit.bind(this.output, 'message', message));
		return this;
	},
	cwd: process.cwd,
};

function FakeProcess() {
	this.serverEmitter = new EventEmitter();
	this.clientEmitter = new EventEmitter();
	this.server = new FakeProcessHelper(this.clientEmitter, this.serverEmitter);
	this.client = new FakeProcessHelper(this.serverEmitter, this.clientEmitter);
}

class FakeProcessWrapper extends EventEmitter {
	constructor(PM) {
		super();

		this.PM = PM;
		this.active = true;
		this.pendingTasks = new Map();

		this.fakeProcess = new FakeProcess();
		this.process = this.fakeProcess.server;
		this.client = this.fakeProcess.client;

		// Allow events to bubble-up to the wrapper
		this.process.on('message', message => this.emit('message', message));

		this.on('message', PM.onMessageUpstream);
	}

	send(data) {
		return this.process.send(data);
	}

	release() {
		if (this.load || this.active) return;
		this.process.disconnect();
	}

	get load() {
		return this.pendingTasks.size;
	}
}

exports.FakeProcess = FakeProcess;
exports.FakeProcessWrapper = FakeProcessWrapper;
