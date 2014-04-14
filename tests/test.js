#!/usr/bin/env node

var covectric = require('../');
var model = new covectric.Model();

var id = 1;
['hello','hi','what\'s up','How are you','how\'s it going?','what is the weather like','the weather today is sunny','what is funny', 'what\'s going on?'].forEach(function(t) {
	model.upsertDocument(id++, t, t);
});

model.recomputeVectorBaseTokenWeights();

var results = model.search("what's the weather today?");

console.log("Search Results:", results);