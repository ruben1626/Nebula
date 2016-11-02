const pdDataFile = DATA_DIR + 'shopmoney.json';
const tcDataFile = DATA_DIR + 'tcards.json';
const symbolsDataFile = DATA_DIR + 'symbolauth.json';
const avatarsDataFile = DATA_DIR + 'shopavatars.json';
const iconsDataFile = DATA_DIR + 'shopicons.json';
const colorsDataFile = DATA_DIR + 'shopcolors.json';
const phrasesDataFile = DATA_DIR + 'shopphrase.json';
const botPhraseDataFile = DATA_DIR + 'botphrases.json';

let fs = require('fs');

for (const filePath of [pdDataFile, tcDataFile, symbolsDataFile, avatarsDataFile, iconsDataFile, colorsDataFile, phrasesDataFile, botPhraseDataFile]) {
	if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '{}');
}

let money = JSON.parse(fs.readFileSync(pdDataFile).toString());
let trainerCards = JSON.parse(fs.readFileSync(tcDataFile).toString());
let customSymbols = JSON.parse(fs.readFileSync(symbolsDataFile).toString());
let boughtAvatars = JSON.parse(fs.readFileSync(avatarsDataFile).toString());
let boughtIcons = JSON.parse(fs.readFileSync(iconsDataFile).toString());
let boughtColors = JSON.parse(fs.readFileSync(colorsDataFile).toString());
let boughtPhrases = JSON.parse(fs.readFileSync(phrasesDataFile).toString());
let botPhrase = JSON.parse(fs.readFileSync(botPhraseDataFile).toString());

exports.money = money;
exports.trainerCards = trainerCards;
exports.customSymbols = customSymbols;
exports.boughtAvatars = boughtAvatars;
exports.boughtIcons = boughtIcons;
exports.boughtColors = boughtColors;
exports.boughtPhrases = boughtPhrases;
exports.botPhrase = botPhrase;

function writePdData() {
	fs.writeFileSync(pdDataFile, JSON.stringify(money));
}

function writeTcData() {
	fs.writeFileSync(tcDataFile, JSON.stringify(trainerCards));
}

function writeSymbolsData() {
	fs.writeFileSync(symbolsDataFile, JSON.stringify(customSymbols));
}

function writeAvatarsData() {
	fs.writeFileSync(avatarsDataFile, JSON.stringify(boughtAvatars));
}

function writeIconsData() {
	fs.writeFileSync(iconsDataFile, JSON.stringify(boughtIcons));
}

function writeColorsData() {
	fs.writeFileSync(colorsDataFile, JSON.stringify(boughtColors));
}

function writePhrasesData() {
	fs.writeFileSync(phrasesDataFile, JSON.stringify(boughtPhrases));
}

function writePhrasesData() {
	fs.writeFileSync(botPhraseDataFile, JSON.stringify(botPhrase));
}

exports.deleteValues = function (text) {
	let textReturn = text;
	textReturn = textReturn.replace("lue=", "kek=");
	textReturn = textReturn.replace("Lue=", "kek=");
	textReturn = textReturn.replace("LUe=", "kek=");
	textReturn = textReturn.replace("lUe=", "kek=");
	textReturn = textReturn.replace("LuE=", "kek=");
	textReturn = textReturn.replace("luE=", "kek=");
	textReturn = textReturn.replace("lUE=", "kek=");
	textReturn = textReturn.replace("LUE=", "kek=");
	return textReturn;
};

exports.getPokemonId = function (text) {
	let textReturn = Chat.escapeHTML(text);
	textReturn = textReturn.toLowerCase();
	textReturn = textReturn.trim();
	return textReturn;
};

//money
exports.getUserMoney = function (user) {
	let userId = toId(user);
	if (!money[userId]) return 0;
	return parseInt(money[userId]);
};

exports.giveMoney = function (user, pds) {
	let userId = toId(user);
	let pokeDolars = parseInt(pds);
	if (!money[userId]) money[userId] = 0;
	money[userId] += pokeDolars;
	writePdData();
	return true;
};

exports.removeMoney = function (user, pds) {
	let userId = toId(user);
	let pokeDolars = parseInt(pds);
	if (!money[userId]) money[userId] = 0;
	if (money[userId] < pokeDolars) return false;
	money[userId] += (-pokeDolars);
	writePdData();
	return true;
};

exports.transferMoney = function (userA, userB, pds) {
	let userAId = toId(userA);
	let userBId = toId(userB);
	let pokeDolars = parseInt(pds);
	if (!money[userAId]) money[userAId] = 0;
	if (!money[userBId]) money[userBId] = 0;
	if (money[userAId] < pokeDolars) return false;
	money[userAId] += (-pokeDolars);
	money[userBId] += pokeDolars;
	writePdData();
	return true;
};
//symbols
exports.symbolPermision = function (user) {
	let userId = toId(user);
	if (!customSymbols[userId]) return false;
	return true;
};

exports.setSymbolPermision = function (user, permision) {
	let userId = toId(user);
	if (permision && !customSymbols[userId]) {
		customSymbols[userId] = 1;
	} else if (!permision && customSymbols[userId]) {
		delete customSymbols[userId];
	} else {
		return false;
	}
	writeSymbolsData();
	return true;
};
//trainer cards
exports.getTrainerCard = function (user) {
	let userId = toId(user);
	if (!trainerCards[userId]) return false;
	return {
		customTC: trainerCards[userId].customTC,
		customHtml: trainerCards[userId].customHtml,
		pokemon: trainerCards[userId].pokemon,
		nPokemon: trainerCards[userId].nPokemon,
		phrase: trainerCards[userId].phrase,
		image: trainerCards[userId].image,
	};
};

exports.giveTrainerCard = function (user) {
	let userId = toId(user);
	if (trainerCards[userId]) return false;
	trainerCards[userId] = {
		customTC: false,
		customHtml: 'Tajeta de Entrenador personalizada. Usa /tchtml para cambiarla a tu gusto.',
		pokemon: {},
		nPokemon: 0,
		phrase: 'Frase de la Tarjeta de Entrenador',
		image: 'http://play.pokemonshowdown.com/sprites/trainers/1.png',
	};
	writeTcData();
	return true;
};

exports.removeTrainerCard = function (user) {
	let userId = toId(user);
	if (!trainerCards[userId]) return false;
	delete trainerCards[userId];
	writeTcData();
	return true;
};

exports.getTrainerCardList = function () {
	let html = 'Lista de TCs: ';
	html += Object.keys(trainerCards).join(", ");
	return html;
};

exports.imageTrainerCard = function (user, image) {
	let userId = toId(user);
	if (!trainerCards[userId]) return false;
	trainerCards[userId].image = image;
	writeTcData();
	return true;
};

exports.phraseTrainerCard = function (user, phrase) {
	let userId = toId(user);
	if (!trainerCards[userId]) return false;
	trainerCards[userId].phrase = phrase;
	writeTcData();
	return true;
};

exports.pokemonTrainerCard = function (user, pokemonData) {
	let userId = toId(user);
	if (!trainerCards[userId]) return false;
	let nPokemonGiven = 0;
	trainerCards[userId].pokemon = {};
	for (let d in pokemonData) {
		if (nPokemonGiven < trainerCards[userId].nPokemon) {
			trainerCards[userId].pokemon[nPokemonGiven] = pokemonData[d];
		}
		++nPokemonGiven;
	}
	writeTcData();
	return true;
};

exports.nPokemonTrainerCard = function (user, value) {
	let userId = toId(user);
	if (!trainerCards[userId]) return false;
	trainerCards[userId].nPokemon = value;
	writeTcData();
	return true;
};

exports.htmlTrainerCard = function (user, htmlSource) {
	let userId = toId(user);
	if (!trainerCards[userId]) return false;
	trainerCards[userId].customHtml = htmlSource;
	writeTcData();
	return true;
};

exports.setCustomTrainerCard = function (user, value) {
	let userId = toId(user);
	if (!trainerCards[userId]) return false;
	trainerCards[userId].customTC = value;
	writeTcData();
	return true;
};
//avatars
exports.addPendingAvatar = function (user, url) {
	let userId = toId(user);
	if (boughtAvatars[userId]) return 'Ya tenias una solicitud de avatar pendiente, espera a que sea revisada por un administrador.';
	boughtAvatars[userId] = url;
	writeAvatarsData();
	return false;
};

exports.deletePendingAvatar = function (user, url) {
	let userId = toId(user);
	if (!boughtAvatars[userId]) return 'El usuario no estaba en la lista de avatares pendientes.';
	delete boughtAvatars[userId];
	writeAvatarsData();
	return false;
};

exports.getPendingAvatars = function () {
	let html = '';
	for (let i in boughtAvatars) {
		html += '<b>' + i + '</b>: <a href="' + boughtAvatars[i] + '">' + boughtAvatars[i] + '</a><br />';
	}
	if (html === '') html = 'No hay avatares pendientes';
	return html;
};
//icons
exports.addPendingIcon = function (user, url) {
	let userId = toId(user);
	if (boughtIcons[userId]) return 'Ya tenias una solicitud de icono pendiente, espera a que sea revisada por un administrador.';
	boughtIcons[userId] = url;
	writeIconsData();
	return false;
};

exports.deletePendingIcon = function (user, url) {
	let userId = toId(user);
	if (!boughtIcons[userId]) return 'El usuario no estaba en la lista de iconos pendientes.';
	delete boughtIcons[userId];
	writeIconsData();
	return false;
};

exports.getPendingIcons = function () {
	let html = '';
	for (let i in boughtIcons) {
		html += '<b>' + i + '</b>: <a href="' + boughtIcons[i] + '">' + boughtIcons[i] + '</a><br />';
	}
	if (html === '') html = 'No hay iconos pendientes';
	return html;
};
//colors
exports.addPendingColor = function (user, url) {
	let userId = toId(user);
	if (boughtColors[userId]) return 'Ya tenias una solicitud de color pendiente, espera a que sea revisada por un administrador.';
	boughtColors[userId] = url;
	writeColorsData();
	return false;
};

exports.deletePendingColor = function (user, url) {
	let userId = toId(user);
	if (!boughtColors[userId]) return 'El usuario no estaba en la lista de colores pendientes.';
	delete boughtColors[userId];
	writeColorsData();
	return false;
};

exports.getPendingColors = function () {
	let html = '';
	for (let i in boughtColors) {
		html += '<b>' + i + '</b>: ' + boughtColors[i] + '<br />';
	}
	if (html === '') html = 'No hay colores pendientes';
	return html;
};
//phrases
exports.addPendingPhrase = function (user, url) {
	let userId = toId(user);
	if (boughtPhrases[userId]) return 'Ya tenias una solicitud de frase pendiente, espera a que sea revisada por un administrador.';
	boughtPhrases[userId] = url;
	writePhrasesData();
	return false;
};

exports.deletePendingPhrase = function (user, url) {
	let userId = toId(user);
	if (!boughtPhrases[userId]) return 'El usuario no estaba en la lista de frases pendientes.';
	delete boughtPhrases[userId];
	writePhrasesData();
	return false;
};

exports.getPendingPhrases = function () {
	let html = '';
	for (let i in boughtPhrases) {
		html += '<b>' + i + '</b>: ' + boughtPhrases[i] + '<br />';
	}
	if (html === '') html = 'No hay frases pendientes';
	return html;
};
//bot
exports.getBotPhrase = function (user) {
	let userId = toId(user);
	if (botPhrase[userId]) return botPhrase[userId];
	return false;
};

exports.changeBotPhrase = function (user, text) {
	let userId = toId(user);
	if (botPhrase[userId] && toId(text) === 'off') {
		delete botPhrase[userId];
	} else {
		botPhrase[userId] = text;
	}
	writePhrasesData();
};
