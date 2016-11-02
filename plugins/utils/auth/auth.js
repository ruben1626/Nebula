
"use strict";

/**
 *	Login
 *	Server-side login system
 *
 *	Developed by Slayer95
 *
 */

const crypto = require('crypto');

const SecurityError = require('./../builtin-errors').SecurityError;

class CryptoSigner {
	constructor(hostName, cryptoAlgo, privateKey) {
		this.hostName = hostName;
		this.algorithm = cryptoAlgo;
		this.key = privateKey;
	}

	compound(userName, userType, hostName, challenge, clientId) {
		let userId = toId(userName);
		let expirySeconds = Math.floor((Date.now() / 1000) + 5 * 60);

		return challenge + ',' + userId + ',' + userType + ',' + expirySeconds + ',' + hostName + (clientId ? ',' + clientId.slice(0, 32) : '');
	}

	sign(data) {
		return new Promise((resolve, reject) => {
			let signer = crypto.createSign(this.algorithm);
			signer.update(data);

			let signature = signer.sign(this.key, 'hex');
			resolve(signature);
		});
	}
}

class CryptoVerifier {
	constructor(hostName, cryptoAlgo, publicKey) {
		this.hostName = hostName;
		this.algorithm = cryptoAlgo;
		this.key = publicKey;
	}

	verify(data, signature, cb) {
		// Success-back and Promise-based APIs
		if (typeof cb === 'function') {
			return this._verify(data, signature, function (err, result) {
				if (err) return cb(false);
				return cb(true, result);
			});
		}

		return new Promise((resolve, reject) => {
			this._verify(data, signature, function (err, result) {
				if (err) return reject(err);
				return resolve(result);
			});
		});
	}

	verifyAssertion(assertion, name, options) {
		if (!options) options = {};

		const tokenSemicolonPos = assertion.indexOf(';');
		if (tokenSemicolonPos < 0) return Promise.reject(new SecurityError("Firma ausente."));

		const tokenData = assertion.substr(0, tokenSemicolonPos);
		const tokenSig = assertion.substr(tokenSemicolonPos + 1);

		const userid = toId(name);

		return this.verify(tokenData, tokenSig).then(function () {
			const tokenDataSplit = tokenData.split(',');
			if (name && tokenDataSplit[1] !== userid) return Promise.reject(new SecurityError("Nombre de usuario no coincidente."));
			if (typeof options.challenge !== 'undefined' && tokenDataSplit[0] !== options.challenge) return Promise.reject(new SecurityError("Challenge no coincidente."));
			const deltaTimeAbs = Math.abs(parseInt(tokenDataSplit[3], 10) - Date.now() / 1000);
			if (deltaTimeAbs > (typeof options.expiry !== 'undefined' ? options.expiry : 25 * 60 * 60)) Promise.reject(new SecurityError("Challenge expirado."));
			const data = {
				userid: tokenDataSplit[1],
				userType: tokenDataSplit[2],
			};
			if (!options.revalidate || !options.revalidate.dataSchema(data)) return Promise.resolve(data);
			if (!(deltaTimeAbs > options.revalidate.threshold)) return Promise.resolve(data);
			return options.revalidate.method(data).then(function () {
				return Promise.resolve(data);
			});
		});
	}

	_verify(data, signature, cb) {
		if (!this.key) return cb(new Error("No public key"));

		let verifier = crypto.createVerify(this.algorithm);
		verifier.update(data);

		let success = false;
		try {
			success = verifier.verify(this.key, signature, 'hex');
		} catch (e) {
			return cb(new Error("Invalid signature"));
		}

		if (!success) return cb(new Error("Invalid signature"));
		return cb(null, data);
	}
}

class CryptoHandler {
	constructor(hostName, keyData) {
		this.hostName = hostName;
		process.nextTick(() => {
			if (keyData.publicKey) this.verifier = new CryptoVerifier(hostName, keyData.cryptoAlgo, keyData.publicKey);
			if (keyData.privateKey) this.signer = new CryptoSigner(hostName, keyData.cryptoAlgo, keyData.privateKey);
		});
	}
	sign() {
		return this.signer.sign.apply(this.signer, arguments);
	}
	verify() {
		return this.verifier.verify.apply(this.verifier, arguments);
	}
}

module.exports = CryptoHandler;
