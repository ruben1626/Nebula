exports.BattleScripts = {
	randomSkyTeam: function (side) {
		let keys = [];
		let pokemonLeft = 0;
		let pokemon = [];
		for (var i in this.data.FormatsData) {
			var template = this.getTemplate(i);
			if (this.data.FormatsData[i].randomBattleMoves && !this.data.FormatsData[i].isNonstandard && !template.evos.length && (template.forme.substr(0, 4) !== 'Mega')) {
				keys.push(i);
			}
		}
		keys = keys.randomize();

		// PotD stuff
		let potd = {};
		if ('Rule:potd' in this.getBanlistTable(this.getFormat())) {
			potd = this.getTemplate(Config.potd);
		}

		let typeCount = {};
		let typeComboCount = {};
		let baseFormes = {};
		let uberCount = 0;
		let nuCount = 0;
		let megaCount = 0;

		for (var i = 0; i < keys.length && pokemonLeft < 6; i++) {
			var template = this.getTemplate(keys[i]);
			if (!template || !template.name || !template.types) continue;
			let tier = template.tier;
			// This tries to limit the amount of Ubers and NUs on one team to promote "fun":
			// LC Pokemon have a hard limit in place at 2; NFEs/NUs/Ubers are also limited to 2 but have a 20% chance of being added anyway.
			// LC/NFE/NU Pokemon all share a counter (so having one of each would make the counter 3), while Ubers have a counter of their own.
			if (tier === 'LC' && nuCount > 1) continue;
			if ((tier === 'NFE' || tier === 'NU') && nuCount > 1 && Math.random() * 5 > 1) continue;
			if (tier === 'Uber' && uberCount > 1 && Math.random() * 5 > 1) continue;

			// CAPs have 20% the normal rate
			if (tier === 'CAP' && Math.random() * 5 > 1) continue;
			// Arceus formes have 1/18 the normal rate each (so Arceus as a whole has a normal rate)
			if (keys[i].substr(0, 6) === 'arceus' && Math.random() * 18 > 1) continue;
			// Basculin formes have 1/2 the normal rate each (so Basculin as a whole has a normal rate)
			if (keys[i].substr(0, 8) === 'basculin' && Math.random() * 2 > 1) continue;
			// Genesect formes have 1/5 the normal rate each (so Genesect as a whole has a normal rate)
			if (keys[i].substr(0, 8) === 'genesect' && Math.random() * 5 > 1) continue;
			// Gourgeist formes have 1/4 the normal rate each (so Gourgeist as a whole has a normal rate)
			if (keys[i].substr(0, 9) === 'gourgeist' && Math.random() * 4 > 1) continue;
			// Not available on XY
			if (template.species === 'Pichu-Spiky-eared') continue;

			// Limit 2 of any type
			let types = template.types;
			let skip = false;
			for (var t = 0; t < types.length; t++) {
				if (typeCount[types[t]] > 1 && Math.random() * 5 > 1) {
					skip = true;
					break;
				}
			}
			if (skip) continue;

			if (potd && potd.name && potd.types) {
				// The Pokemon of the Day belongs in slot 2
				if (i === 1) {
					template = potd;
					if (template.species === 'Magikarp') {
						template.randomBattleMoves = ['magikarpsrevenge', 'splash', 'bounce'];
					} else if (template.species === 'Delibird') {
						template.randomBattleMoves = ['present', 'bestow'];
					}
				} else if (template.species === potd.species) {
					continue; // No, thanks, I've already got one
				}
			}

			let set = this.randomSet(template, i, megaCount);
			if (toId(set.ability) !== 'levitate' && toId(template.types[0]) !== 'flying' && toId(template.types[1]) !== 'flying') continue;
			// Illusion shouldn't be on the last pokemon of the team
			if (set.ability === 'Illusion' && pokemonLeft > 4) continue;

			// Limit 1 of any type combination
			let typeCombo = types.join();
			if (set.ability === 'Drought' || set.ability === 'Drizzle') {
				// Drought and Drizzle don't count towards the type combo limit
				typeCombo = set.ability;
			}
			if (typeCombo in typeComboCount) continue;

			// Limit the number of Megas to one, just like in-game
			if (this.getItem(set.item).megaStone && megaCount > 0) continue;

			// Limit to one of each species (Species Clause)
			if (baseFormes[template.baseSpecies]) continue;
			baseFormes[template.baseSpecies] = 1;

			// Okay, the set passes, add it to our team
			pokemon.push(set);

			pokemonLeft++;
			// Now that our Pokemon has passed all checks, we can increment the type counter
			for (var t = 0; t < types.length; t++) {
				if (types[t] in typeCount) {
					typeCount[types[t]]++;
				} else {
					typeCount[types[t]] = 1;
				}
			}
			typeComboCount[typeCombo] = 1;

			// Increment Uber/NU and mega counter
			if (tier === 'Uber') {
				uberCount++;
			} else if (tier === 'NU' || tier === 'NFE' || tier === 'LC') {
				nuCount++;
			}
			if (this.getItem(set.item).megaStone) megaCount++;
		}
		return pokemon;
	},
	randomLCTeam: function (side) {
		let keys = [];
		let pokemonLeft = 0;
		let pokemon = [];
		for (var i in this.data.FormatsData) {
			var template = this.getTemplate(i);
			//!this.data.FormatsData[i].isNonstandard && !template.evos.length
			if (this.data.FormatsData[i].randomBattleMoves && (template.forme.substr(0, 4) !== 'Mega')) {
				keys.push(i);
			}
		}
		keys = keys.randomize();

		// PotD stuff
		let potd = {};
		if ('Rule:potd' in this.getBanlistTable(this.getFormat())) {
			potd = this.getTemplate(Config.potd);
		}

		let typeCount = {};
		let typeComboCount = {};
		let baseFormes = {};
		let uberCount = 0;
		let nuCount = 0;
		let megaCount = 0;

		for (var i = 0; i < keys.length && pokemonLeft < 6; i++) {
			var template = this.getTemplate(keys[i]);
			if (!template || !template.name || !template.types) continue;
			let tier = template.tier;
			// This tries to limit the amount of Ubers and NUs on one team to promote "fun":
			// LC Pokemon have a hard limit in place at 2; NFEs/NUs/Ubers are also limited to 2 but have a 20% chance of being added anyway.
			// LC/NFE/NU Pokemon all share a counter (so having one of each would make the counter 3), while Ubers have a counter of their own.
			if (tier !== 'LC') continue;
			// Arceus formes have 1/18 the normal rate each (so Arceus as a whole has a normal rate)
			if (keys[i].substr(0, 6) === 'arceus' && Math.random() * 18 > 1) continue;
			// Basculin formes have 1/2 the normal rate each (so Basculin as a whole has a normal rate)
			if (keys[i].substr(0, 8) === 'basculin' && Math.random() * 2 > 1) continue;
			// Genesect formes have 1/5 the normal rate each (so Genesect as a whole has a normal rate)
			if (keys[i].substr(0, 8) === 'genesect' && Math.random() * 5 > 1) continue;
			// Gourgeist formes have 1/4 the normal rate each (so Gourgeist as a whole has a normal rate)
			if (keys[i].substr(0, 9) === 'gourgeist' && Math.random() * 4 > 1) continue;
			// Not available on XY
			if (template.species === 'Pichu-Spiky-eared') continue;

			// Limit 2 of any type
			let types = template.types;
			let skip = false;
			for (var t = 0; t < types.length; t++) {
				if (typeCount[types[t]] > 1 && Math.random() * 5 > 1) {
					skip = true;
					break;
				}
			}
			if (skip) continue;

			if (potd && potd.name && potd.types) {
				// The Pokemon of the Day belongs in slot 2
				if (i === 1) {
					template = potd;
					if (template.species === 'Magikarp') {
						template.randomBattleMoves = ['magikarpsrevenge', 'splash', 'bounce'];
					} else if (template.species === 'Delibird') {
						template.randomBattleMoves = ['present', 'bestow'];
					}
				} else if (template.species === potd.species) {
					continue; // No, thanks, I've already got one
				}
			}

			let set = this.randomSet(template, i, megaCount);

			// Illusion shouldn't be on the last pokemon of the team
			if (set.ability === 'Illusion' && pokemonLeft > 4) continue;

			// Limit 1 of any type combination
			let typeCombo = types.join();
			if (set.ability === 'Drought' || set.ability === 'Drizzle') {
				// Drought and Drizzle don't count towards the type combo limit
				typeCombo = set.ability;
			}
			if (typeCombo in typeComboCount) continue;

			// Limit the number of Megas to one, just like in-game
			if (this.getItem(set.item).megaStone && megaCount > 0) continue;

			// Limit to one of each species (Species Clause)
			if (baseFormes[template.baseSpecies]) continue;
			baseFormes[template.baseSpecies] = 1;

			// Okay, the set passes, add it to our team
			set.level = 5; //Lc level 5
			pokemon.push(set);

			pokemonLeft++;
			// Now that our Pokemon has passed all checks, we can increment the type counter
			for (var t = 0; t < types.length; t++) {
				if (types[t] in typeCount) {
					typeCount[types[t]]++;
				} else {
					typeCount[types[t]] = 1;
				}
			}
			typeComboCount[typeCombo] = 1;

			// Increment Uber/NU and mega counter
			if (tier === 'Uber') {
				uberCount++;
			} else if (tier === 'NU' || tier === 'NFE' || tier === 'LC') {
				nuCount++;
			}
			if (this.getItem(set.item).megaStone) megaCount++;
		}
		return pokemon;
	},
	randomUberTeam: function (side) {
		let keys = [];
		let pokemonLeft = 0;
		let pokemon = [];
		for (var i in this.data.FormatsData) {
			var template = this.getTemplate(i);
			if (this.data.FormatsData[i].randomBattleMoves && !this.data.FormatsData[i].isNonstandard && !template.evos.length && (template.forme.substr(0, 4) !== 'Mega')) {
				keys.push(i);
			}
		}
		keys = keys.randomize();

		// PotD stuff
		let potd = {};
		if ('Rule:potd' in this.getBanlistTable(this.getFormat())) {
			potd = this.getTemplate(Config.potd);
		}

		let typeCount = {};
		let typeComboCount = {};
		let baseFormes = {};
		let uberCount = 0;
		let nuCount = 0;
		let megaCount = 0;

		for (var i = 0; i < keys.length && pokemonLeft < 6; i++) {
			var template = this.getTemplate(keys[i]);
			if (!template || !template.name || !template.types) continue;
			let tier = template.tier;
			// This tries to limit the amount of Ubers and NUs on one team to promote "fun":
			// LC Pokemon have a hard limit in place at 2; NFEs/NUs/Ubers are also limited to 2 but have a 20% chance of being added anyway.
			// LC/NFE/NU Pokemon all share a counter (so having one of each would make the counter 3), while Ubers have a counter of their own.
			if (tier !== 'Uber') continue;

			// CAPs have 20% the normal rate
			//if (tier === 'CAP' && Math.random() * 5 > 1) continue;
			// Arceus formes have 1/18 the normal rate each (so Arceus as a whole has a normal rate)
			if (keys[i].substr(0, 6) === 'arceus' && Math.random() * 18 > 1) continue;
			// Basculin formes have 1/2 the normal rate each (so Basculin as a whole has a normal rate)
			if (keys[i].substr(0, 8) === 'basculin' && Math.random() * 2 > 1) continue;
			// Genesect formes have 1/5 the normal rate each (so Genesect as a whole has a normal rate)
			if (keys[i].substr(0, 8) === 'genesect' && Math.random() * 5 > 1) continue;
			// Gourgeist formes have 1/4 the normal rate each (so Gourgeist as a whole has a normal rate)
			if (keys[i].substr(0, 9) === 'gourgeist' && Math.random() * 4 > 1) continue;
			// Not available on XY
			if (template.species === 'Pichu-Spiky-eared') continue;

			// Limit 2 of any type
			let types = template.types;
			let skip = false;
			for (var t = 0; t < types.length; t++) {
				if (typeCount[types[t]] > 1 && Math.random() * 5 > 1) {
					skip = true;
					break;
				}
			}
			if (skip) continue;

			if (potd && potd.name && potd.types) {
				// The Pokemon of the Day belongs in slot 2
				if (i === 1) {
					template = potd;
					if (template.species === 'Magikarp') {
						template.randomBattleMoves = ['magikarpsrevenge', 'splash', 'bounce'];
					} else if (template.species === 'Delibird') {
						template.randomBattleMoves = ['present', 'bestow'];
					}
				} else if (template.species === potd.species) {
					continue; // No, thanks, I've already got one
				}
			}

			let set = this.randomSet(template, i, megaCount);

			// Illusion shouldn't be on the last pokemon of the team
			if (set.ability === 'Illusion' && pokemonLeft > 4) continue;

			// Limit 1 of any type combination
			let typeCombo = types.join();
			if (set.ability === 'Drought' || set.ability === 'Drizzle') {
				// Drought and Drizzle don't count towards the type combo limit
				typeCombo = set.ability;
			}
			if (typeCombo in typeComboCount) continue;

			// Limit the number of Megas to one, just like in-game
			if (this.getItem(set.item).megaStone && megaCount > 0) continue;

			// Limit to one of each species (Species Clause)
			if (baseFormes[template.baseSpecies]) continue;
			baseFormes[template.baseSpecies] = 1;

			// Okay, the set passes, add it to our team
			pokemon.push(set);

			pokemonLeft++;
			// Now that our Pokemon has passed all checks, we can increment the type counter
			for (var t = 0; t < types.length; t++) {
				if (types[t] in typeCount) {
					typeCount[types[t]]++;
				} else {
					typeCount[types[t]] = 1;
				}
			}
			typeComboCount[typeCombo] = 1;

			// Increment Uber/NU and mega counter
			if (tier === 'Uber') {
				uberCount++;
			} else if (tier === 'NU' || tier === 'NFE' || tier === 'LC') {
				nuCount++;
			}
			if (this.getItem(set.item).megaStone) megaCount++;
		}
		return pokemon;
	},
	randomCapTeam: function (side) {
		let keys = [];
		let pokemonLeft = 0;
		let pokemon = [];
		for (var i in this.data.FormatsData) {
			var template = this.getTemplate(i);
			//!this.data.FormatsData[i].isNonstandard && !template.evos.length
			if (this.data.FormatsData[i].randomBattleMoves && (template.forme.substr(0, 4) !== 'Mega')) {
				keys.push(i);
			}
		}
		keys = keys.randomize();

		// PotD stuff
		let potd = {};
		if ('Rule:potd' in this.getBanlistTable(this.getFormat())) {
			potd = this.getTemplate(Config.potd);
		}

		let typeCount = {};
		let typeComboCount = {};
		let baseFormes = {};
		let uberCount = 0;
		let nuCount = 0;
		let megaCount = 0;

		for (var i = 0; i < keys.length && pokemonLeft < 6; i++) {
			var template = this.getTemplate(keys[i]);
			if (!template || !template.name || !template.types) continue;
			let tier = template.tier;
			// This tries to limit the amount of Ubers and NUs on one team to promote "fun":
			// LC Pokemon have a hard limit in place at 2; NFEs/NUs/Ubers are also limited to 2 but have a 20% chance of being added anyway.
			// LC/NFE/NU Pokemon all share a counter (so having one of each would make the counter 3), while Ubers have a counter of their own.
			if (tier !== 'CAP') continue;
			// Arceus formes have 1/18 the normal rate each (so Arceus as a whole has a normal rate)
			if (keys[i].substr(0, 6) === 'arceus' && Math.random() * 18 > 1) continue;
			// Basculin formes have 1/2 the normal rate each (so Basculin as a whole has a normal rate)
			if (keys[i].substr(0, 8) === 'basculin' && Math.random() * 2 > 1) continue;
			// Genesect formes have 1/5 the normal rate each (so Genesect as a whole has a normal rate)
			if (keys[i].substr(0, 8) === 'genesect' && Math.random() * 5 > 1) continue;
			// Gourgeist formes have 1/4 the normal rate each (so Gourgeist as a whole has a normal rate)
			if (keys[i].substr(0, 9) === 'gourgeist' && Math.random() * 4 > 1) continue;
			// Not available on XY
			if (template.species === 'Pichu-Spiky-eared') continue;

			// Limit 2 of any type
			let types = template.types;
			let skip = false;
			for (var t = 0; t < types.length; t++) {
				if (typeCount[types[t]] > 1 && Math.random() * 5 > 1) {
					skip = true;
					break;
				}
			}
			if (skip) continue;

			if (potd && potd.name && potd.types) {
				// The Pokemon of the Day belongs in slot 2
				if (i === 1) {
					template = potd;
					if (template.species === 'Magikarp') {
						template.randomBattleMoves = ['magikarpsrevenge', 'splash', 'bounce'];
					} else if (template.species === 'Delibird') {
						template.randomBattleMoves = ['present', 'bestow'];
					}
				} else if (template.species === potd.species) {
					continue; // No, thanks, I've already got one
				}
			}

			let set = this.randomSet(template, i, megaCount);

			// Illusion shouldn't be on the last pokemon of the team
			if (set.ability === 'Illusion' && pokemonLeft > 4) continue;

			// Limit 1 of any type combination
			let typeCombo = types.join();
			if (set.ability === 'Drought' || set.ability === 'Drizzle') {
				// Drought and Drizzle don't count towards the type combo limit
				typeCombo = set.ability;
			}
			if (typeCombo in typeComboCount) continue;

			// Limit the number of Megas to one, just like in-game
			if (this.getItem(set.item).megaStone && megaCount > 0) continue;

			// Limit to one of each species (Species Clause)
			if (baseFormes[template.baseSpecies]) continue;
			baseFormes[template.baseSpecies] = 1;

			// Okay, the set passes, add it to our team
			pokemon.push(set);

			pokemonLeft++;
			// Now that our Pokemon has passed all checks, we can increment the type counter
			for (var t = 0; t < types.length; t++) {
				if (types[t] in typeCount) {
					typeCount[types[t]]++;
				} else {
					typeCount[types[t]] = 1;
				}
			}
			typeComboCount[typeCombo] = 1;

			// Increment Uber/NU and mega counter
			if (tier === 'Uber') {
				uberCount++;
			} else if (tier === 'NU' || tier === 'NFE' || tier === 'LC') {
				nuCount++;
			}
			if (this.getItem(set.item).megaStone) megaCount++;
		}
		return pokemon;
	},
	randomMonoTypeTeam: function (side) {
		let keys = [];
		let pokemonLeft = 0;
		let pokemon = [];
		for (var i in this.data.FormatsData) {
			var template = this.getTemplate(i);
			if (this.data.FormatsData[i].randomBattleMoves && !this.data.FormatsData[i].isNonstandard && !template.evos.length && (template.forme.substr(0, 4) !== 'Mega')) {
				keys.push(i);
			}
		}
		keys = keys.randomize();

		// PotD stuff
		let potd = {};
		if ('Rule:potd' in this.getBanlistTable(this.getFormat())) {
			potd = this.getTemplate(Config.potd);
		}

		let monoType = '';
		let randomType = Math.floor(Math.random() * 18) + 1;
		switch (randomType) {
		case 1:
			monoType = 'Bug';
			break;
		case 2:
			monoType = 'Dark';
			break;
		case 3:
			monoType = 'Dragon';
			break;
		case 4:
			monoType = 'Electric';
			break;
		case 5:
			monoType = 'Fairy';
			break;
		case 6:
			monoType = 'Fighting';
			break;
		case 7:
			monoType = 'Fire';
			break;
		case 8:
			monoType = 'Flying';
			break;
		case 9:
			monoType = 'Ghost';
			break;
		case 10:
			monoType = 'Grass';
			break;

		case 11:
			monoType = 'Ground';
			break;
		case 12:
			monoType = 'Ice';
			break;
		case 13:
			monoType = 'Normal';
			break;
		case 14:
			monoType = 'Poison';
			break;
		case 15:
			monoType = 'Psychic';
			break;
		case 16:
			monoType = 'Rock';
			break;
		case 17:
			monoType = 'Steel';
			break;
		default:
			monoType = 'Water';
		}

		let typeCount = {};
		let typeComboCount = {};
		let baseFormes = {};
		let uberCount = 0;
		let nuCount = 0;
		let megaCount = 0;

		for (var i = 0; i < keys.length && pokemonLeft < 6; i++) {
			var template = this.getTemplate(keys[i]);
			if (!template || !template.name || !template.types) continue;
			let tier = template.tier;
			// This tries to limit the amount of Ubers and NUs on one team to promote "fun":
			// LC Pokemon have a hard limit in place at 2; NFEs/NUs/Ubers are also limited to 2 but have a 20% chance of being added anyway.
			// LC/NFE/NU Pokemon all share a counter (so having one of each would make the counter 3), while Ubers have a counter of their own.
			if (tier === 'LC' && nuCount > 1) continue;
			if ((tier === 'NFE' || tier === 'NU') && nuCount > 1 && Math.random() * 5 > 1) continue;
			if (tier === 'Uber' && uberCount > 1 && Math.random() * 5 > 1) continue;

			// CAPs have 20% the normal rate
			if (tier === 'CAP' && Math.random() * 5 > 1) continue;
			// Arceus formes have 1/18 the normal rate each (so Arceus as a whole has a normal rate)
			if (keys[i].substr(0, 6) === 'arceus' && Math.random() * 18 > 1) continue;
			// Basculin formes have 1/2 the normal rate each (so Basculin as a whole has a normal rate)
			if (keys[i].substr(0, 8) === 'basculin' && Math.random() * 2 > 1) continue;
			// Genesect formes have 1/5 the normal rate each (so Genesect as a whole has a normal rate)
			if (keys[i].substr(0, 8) === 'genesect' && Math.random() * 5 > 1) continue;
			// Gourgeist formes have 1/4 the normal rate each (so Gourgeist as a whole has a normal rate)
			if (keys[i].substr(0, 9) === 'gourgeist' && Math.random() * 4 > 1) continue;
			// Not available on XY
			if (template.species === 'Pichu-Spiky-eared') continue;

			// Limit 2 of any type
			let types = template.types;
			let skip = false;
			for (var t = 0; t < types.length; t++) {
				if (typeCount[types[t]] > 1 && Math.random() * 5 > 1) {
					skip = false;
					break;
				}
			}
			if (!types) continue;
			if (skip) continue;
			if (toId(types[0]) !== toId(monoType) && toId(types[1]) !== toId(monoType)) continue;

			if (potd && potd.name && potd.types) {
				// The Pokemon of the Day belongs in slot 2
				if (i === 1) {
					template = potd;
					if (template.species === 'Magikarp') {
						template.randomBattleMoves = ['magikarpsrevenge', 'splash', 'bounce'];
					} else if (template.species === 'Delibird') {
						template.randomBattleMoves = ['present', 'bestow'];
					}
				} else if (template.species === potd.species) {
					continue; // No, thanks, I've already got one
				}
			}

			let set = this.randomSet(template, i, megaCount);

			// Illusion shouldn't be on the last pokemon of the team
			if (set.ability === 'Illusion' && pokemonLeft > 4) continue;

			// Limit 1 of any type combination
			let typeCombo = types.join();
			if (set.ability === 'Drought' || set.ability === 'Drizzle') {
				// Drought and Drizzle don't count towards the type combo limit
				typeCombo = set.ability;
			}
			if (typeCombo in typeComboCount) continue;

			// Limit the number of Megas to one, just like in-game
			if (this.getItem(set.item).megaStone && megaCount > 0) continue;

			// Limit to one of each species (Species Clause)
			if (baseFormes[template.baseSpecies]) continue;
			baseFormes[template.baseSpecies] = 1;

			// Okay, the set passes, add it to our team
			pokemon.push(set);

			pokemonLeft++;
			// Now that our Pokemon has passed all checks, we can increment the type counter
			for (var t = 0; t < types.length; t++) {
				if (types[t] in typeCount) {
					typeCount[types[t]]++;
				} else {
					typeCount[types[t]] = 1;
				}
			}
			typeComboCount[typeCombo] = 1;

			// Increment Uber/NU and mega counter
			if (tier === 'Uber') {
				uberCount++;
			} else if (tier === 'NU' || tier === 'NFE' || tier === 'LC') {
				nuCount++;
			}
			if (this.getItem(set.item).megaStone) megaCount++;
		}
		return pokemon;
	},
	randomMonoGenTeam: function (side) {
		let monoGen = Math.floor(Math.random() * 6) + 1;

		let keys = [];
		let pokemonLeft = 0;
		let pokemon = [];
		for (var i in this.data.FormatsData) {
			var template = this.getTemplate(i);
			//!this.data.FormatsData[i].isNonstandard && !template.evos.length
			if (this.data.FormatsData[i].randomBattleMoves && (template.forme.substr(0, 4) !== 'Mega')) {
				keys.push(i);
			}
		}
		keys = keys.randomize();

		// PotD stuff
		let potd = {};
		if ('Rule:potd' in this.getBanlistTable(this.getFormat())) {
			potd = this.getTemplate(Config.potd);
		}

		let typeCount = {};
		let typeComboCount = {};
		let baseFormes = {};
		let uberCount = 0;
		let nuCount = 0;
		let megaCount = 0;

		for (var i = 0; i < keys.length && pokemonLeft < 6; i++) {
			var template = this.getTemplate(keys[i]);
			if (!template || !template.name || !template.types) continue;
			let tier = template.tier;
			// This tries to limit the amount of Ubers and NUs on one team to promote "fun":
			// LC Pokemon have a hard limit in place at 2; NFEs/NUs/Ubers are also limited to 2 but have a 20% chance of being added anyway.
			// LC/NFE/NU Pokemon all share a counter (so having one of each would make the counter 3), while Ubers have a counter of their own.
			//if (tier !== 'CAP') continue;
			let gen = 6;

			if (template.num <= 151) gen = 1;
			else if (template.num <= 251) gen = 2;
			else if (template.num <= 386) gen = 3;
			else if (template.num <= 493) gen = 4;
			else if (template.num <= 649) gen = 5;

			if (gen !== monoGen) continue;
			// Arceus formes have 1/18 the normal rate each (so Arceus as a whole has a normal rate)
			if (keys[i].substr(0, 6) === 'arceus' && Math.random() * 18 > 1) continue;
			// Basculin formes have 1/2 the normal rate each (so Basculin as a whole has a normal rate)
			if (keys[i].substr(0, 8) === 'basculin' && Math.random() * 2 > 1) continue;
			// Genesect formes have 1/5 the normal rate each (so Genesect as a whole has a normal rate)
			if (keys[i].substr(0, 8) === 'genesect' && Math.random() * 5 > 1) continue;
			// Gourgeist formes have 1/4 the normal rate each (so Gourgeist as a whole has a normal rate)
			if (keys[i].substr(0, 9) === 'gourgeist' && Math.random() * 4 > 1) continue;
			// Not available on XY
			if (template.species === 'Pichu-Spiky-eared') continue;

			// Limit 2 of any type
			let types = template.types;
			let skip = false;
			for (var t = 0; t < types.length; t++) {
				if (typeCount[types[t]] > 1 && Math.random() * 5 > 1) {
					skip = true;
					break;
				}
			}
			if (skip) continue;

			if (potd && potd.name && potd.types) {
				// The Pokemon of the Day belongs in slot 2
				if (i === 1) {
					template = potd;
					if (template.species === 'Magikarp') {
						template.randomBattleMoves = ['magikarpsrevenge', 'splash', 'bounce'];
					} else if (template.species === 'Delibird') {
						template.randomBattleMoves = ['present', 'bestow'];
					}
				} else if (template.species === potd.species) {
					continue; // No, thanks, I've already got one
				}
			}

			let set = this.randomSet(template, i, megaCount);

			// Illusion shouldn't be on the last pokemon of the team
			if (set.ability === 'Illusion' && pokemonLeft > 4) continue;

			// Limit 1 of any type combination
			let typeCombo = types.join();
			if (set.ability === 'Drought' || set.ability === 'Drizzle') {
				// Drought and Drizzle don't count towards the type combo limit
				typeCombo = set.ability;
			}
			if (typeCombo in typeComboCount) continue;

			// Limit the number of Megas to one, just like in-game
			if (this.getItem(set.item).megaStone && megaCount > 0) continue;

			// Limit to one of each species (Species Clause)
			if (baseFormes[template.baseSpecies]) continue;
			baseFormes[template.baseSpecies] = 1;

			// Okay, the set passes, add it to our team
			pokemon.push(set);

			pokemonLeft++;
			// Now that our Pokemon has passed all checks, we can increment the type counter
			for (var t = 0; t < types.length; t++) {
				if (types[t] in typeCount) {
					typeCount[types[t]]++;
				} else {
					typeCount[types[t]] = 1;
				}
			}
			typeComboCount[typeCombo] = 1;

			// Increment Uber/NU and mega counter
			if (tier === 'Uber') {
				uberCount++;
			} else if (tier === 'NU' || tier === 'NFE' || tier === 'LC') {
				nuCount++;
			}
			if (this.getItem(set.item).megaStone) megaCount++;
		}
		return pokemon;
	},
	randomMetroTeam: function (side) {
		let teamdexno = [];
		let team = [];

		//pick six random pokmeon--no repeats, even among formes
		//also need to either normalize for formes or select formes at random
		//unreleased are okay. No CAP for now, but maybe at some later date
		for (var i = 0; i < 6; i++)		{
			while (true) {
				var x = Math.floor(Math.random() * 718) + 1;
				if (teamdexno.indexOf(x) === -1) {
					teamdexno.push(x);
					break;
				}
			}
		}

		for (var i = 0; i < 6; i++) {
			//choose forme
			let formes = [];
			for (let j in this.data.Pokedex) {
				if (this.data.Pokedex[j].num === teamdexno[i] && this.getTemplate(this.data.Pokedex[j].species).learnset && this.data.Pokedex[j].species !== 'Pichu-Spiky-eared') {
					formes.push(this.data.Pokedex[j].species);
				}
			}
			let poke = formes.sample();
			let template = this.getTemplate(poke);

			//level balance--calculate directly from stats rather than using some silly lookup table
			let mbstmin = 1307; //sunkern has the lowest modified base stat total, and that total is 807

			let stats = template.baseStats;

			//modified base stat total assumes 31 IVs, 85 EVs in every stat
			let mbst = (stats["hp"] * 2 + 31 + 21 + 100) + 10;
			mbst += (stats["atk"] * 2 + 31 + 21 + 100) + 5;
			mbst += (stats["def"] * 2 + 31 + 21 + 100) + 5;
			mbst += (stats["spa"] * 2 + 31 + 21 + 100) + 5;
			mbst += (stats["spd"] * 2 + 31 + 21 + 100) + 5;
			mbst += (stats["spe"] * 2 + 31 + 21 + 100) + 5;

			let level = Math.floor(100 * mbstmin / mbst); //initial level guess will underestimate

			while (level < 100) {
				mbst = Math.floor((stats["hp"] * 2 + 31 + 21 + 100) * level / 100 + 10);
				mbst += Math.floor(((stats["atk"] * 2 + 31 + 21 + 100) * level / 100 + 5) * level / 100); //since damage is roughly proportional to lvl
				mbst += Math.floor((stats["def"] * 2 + 31 + 21 + 100) * level / 100 + 5);
				mbst += Math.floor(((stats["spa"] * 2 + 31 + 21 + 100) * level / 100 + 5) * level / 100);
				mbst += Math.floor((stats["spd"] * 2 + 31 + 21 + 100) * level / 100 + 5);
				mbst += Math.floor((stats["spe"] * 2 + 31 + 21 + 100) * level / 100 + 5);

				if (mbst >= mbstmin)					{
					break;
				}
				level++;
			}


			//random gender--already handled by PS?

			//random ability (unreleased hidden are par for the course)
			let abilities = [template.abilities['0']];
			if (template.abilities['1']) {
				abilities.push(template.abilities['1']);
			}
			if (template.abilities['H']) {
				abilities.push(template.abilities['H']);
			}
			let ability = abilities.sample();

			//random nature
			let nature = ["Adamant", "Bashful", "Bold", "Brave", "Calm", "Careful", "Docile", "Gentle", "Hardy", "Hasty", "Impish", "Jolly", "Lax", "Lonely", "Mild", "Modest", "Naive", "Naughty", "Quiet", "Quirky", "Rash", "Relaxed", "Sassy", "Serious", "Timid"].sample();

			//random item--I guess if it's in items.js, it's okay
			let item = Object.keys(this.data.Items).sample();

			//since we're selecting forme at random, we gotta make sure forme/item combo is correct
			if (template.requiredItem) {
				item = template.requiredItem;
			}
			if (this.getItem(item).megaStone) {
				// we'll exclude mega stones for now
				item = Object.keys(this.data.Items).sample();
			}
			while ((poke === 'Arceus' && item.indexOf("plate") > -1) || (poke === 'Giratina' && item === 'griseousorb')) {
				item = Object.keys(this.data.Items).sample();
			}


			//random IVs
			let ivs = {
				hp: Math.floor(Math.random() * 32),
				atk: Math.floor(Math.random() * 32),
				def: Math.floor(Math.random() * 32),
				spa: Math.floor(Math.random() * 32),
				spd: Math.floor(Math.random() * 32),
				spe: Math.floor(Math.random() * 32),
			};

			//random EVs
			let evs = {
				hp: 0,
				atk: 0,
				def: 0,
				spa: 0,
				spd: 0,
				spe: 0,
			};
			let s = ["hp", "atk", "def", "spa", "spd", "spe"];
			let evpool = 510;
			do			{
				var x = s.sample();
				let y = Math.floor(Math.random() * Math.min(256 - evs[x], evpool + 1));
				evs[x] += y;
				evpool -= y;
			} while (evpool > 0);

			//random happiness--useless, since return/frustration is currently a "cheat"
			let happiness = Math.floor(Math.random() * 256);

			//random shininess?
			let shiny = (Math.random() * 1024 <= 1);

			//four random unique moves from movepool. don't worry about "attacking" or "viable"
			let moves;
			let pool = ['metronome'];
			if (pool.length <= 4) {
				moves = pool;
			} else {
				moves = pool.sample(4);
			}

			team.push({
				name: poke,
				moves: moves,
				ability: ability,
				evs: evs,
				ivs: ivs,
				nature: nature,
				item: item,
				level: level,
				happiness: happiness,
				shiny: shiny,
			});
		}

		//console.log(team);
		return team;
	},
};
