/**
 * Covectric - Simple Vector Based Search engine for javascript/node.js
 * Converts text documents into vectors and stores them in memory
 *      Allows searching the vector space for similar documents
 */

var covectric = {};

covectric.Model = function(){
	this.config = {computeTokenWeightsBasedOnFrequency:true};
	this.dimensionDocumentCount = {}; //key is token or dimension, value is number of times that dimension is found in a document
	this.vectorBase = {}; //the "database" of vectors, indexed by id
	this.textTransformFunction = covectric.util.tokenizeString;//function that takes an input string and returns a list of tokens

};

covectric.Model.prototype.vectorBaseLength = function(){
	var length = 0;
	for(var vi in this.vectorBase){
		length++;
	}
	return length;
};

covectric.Model.prototype.search = function(text, maxResults){
	var vector = new covectric.Model.VectorN(-1, text);
	vector.addTokens(this.textTransformFunction(text));
	vector.computeTokenWeights(this.dimensionDocumentCount, this.vectorBaseLength());
	return this.vectorSearch(vector, maxResults);
};

covectric.Model.prototype.vectorSearch = function(inputVector, maxResults){
	var matches = [];
	for(var id in this.vectorBase) {
		if(id == inputVector.id){
			continue;
		}
		var vector = this.vectorBase[id];
		var distance = covectric.util.vectorCosine(inputVector, vector);
		if (distance != 0) {
			//this match has at least one dimensional commonality
			matches.push(new covectric.Model.VectorMatch(vector.id, distance, vector.name));
		}
	}
	matches.sort(function(a, b){
		return b.distance - a.distance;
	});

	return matches.slice(0, maxResults);
};

covectric.Model.prototype.findSimilarDocuments = function(similarityThreshold){
	var seenSimilarDocuments = {};
	var similarResults = {};//indexed by vector id, value is an array of similar VectorMatch objects
	for(var id in this.vectorBase){
		seenSimilarDocuments[id] = true;
		var vector = this.vectorBase[id];
		var results = this.vectorSearch(vector);
		for(var i in results){
			var r = results[i];
			if(r.distance >= similarityThreshold && (!(r.id in seenSimilarDocuments))){
				if(!(id in similarResults)){
					similarResults[id] = [];
				}
				similarResults[id].push(r);
			}
		}
	}

	return similarResults;
};

covectric.Model.prototype.getDocumentVector = function(id){
	//poor man's clone
	return JSON.parse(JSON.stringify(this.vectorBase[id]));
};

covectric.Model.prototype.recomputeVectorBaseTokenWeights = function(){
	var vectorBaseLength = this.vectorBaseLength();
	for(var id in this.vectorBase){
		this.vectorBase[id].computeTokenWeights(this.dimensionDocumentCount, vectorBaseLength);
	}
};

covectric.Model.prototype.upsertDocument = function(id, name, text, baseTokenWeight){
	baseTokenWeight = baseTokenWeight || 1;

	var vector = null;
	if(!(id in this.vectorBase)){
		vector = new covectric.Model.VectorN(id, name);
		this.vectorBase[id] = vector;
	} else {
		vector = this.vectorBase[id];
		vector.name = name;
	}

	//process text and add to vector dimensionLengths
	var tokens = this.textTransformFunction(text);
	vector.addTokens(tokens);

	//if we aren't computing token weights based on tf*idf, we can save some memory
	if(this.config.computeTokenWeightsBasedOnFrequency) {
		for (var t in tokens) {
			var token = tokens[t];

			if (!(token in this.dimensionDocumentCount)) {
				this.dimensionDocumentCount[token] = 1;
			} else {
				this.dimensionDocumentCount[token]++;
			}
		}
	}

};

covectric.Model.VectorN = function(id, name){
	this.id = id;
	this.name = name;//just for a friendly reference for the vector/document
	this.dimensionLengths = {};//indexed by token, value is length of the dimension
	this.tokenBaseWeights = {};//indexed by token, value is the base weight of that token
};

covectric.Model.VectorN.prototype.addTokens = function(tokens, baseTokenWeight){
	baseTokenWeight = baseTokenWeight || 1;

	for(var t in tokens) {
		var token = tokens[t];
		this.tokenBaseWeights[token] = baseTokenWeight;
		this.dimensionLengths[token] = baseTokenWeight;
	}
};

covectric.Model.VectorN.prototype.computeTokenWeights = function(dimensionDocumentCount, vectorBaseLength){
	this.dimensionLengths = {};
	for(var tbw in this.tokenBaseWeights){
		this.dimensionLengths[tbw] = this.tokenBaseWeights[tbw];
	}

	//compute tf*idf weighting
	for(var dim in this.dimensionLengths){
		if(dim in dimensionDocumentCount){
			var inverseDocFreq = Math.log(vectorBaseLength / dimensionDocumentCount[dim]);
			this.dimensionLengths[dim] = this.dimensionLengths[dim] * inverseDocFreq;
		}
	}
};

covectric.Model.VectorN.prototype.vectorLength = function(){
	var sum = 0;
	for(var dim in this.dimensionLengths){
		var length = this.dimensionLengths[dim];
		sum += length * length;
	}
	return Math.sqrt(sum);
};

covectric.Model.VectorMatch = function(id, distance, name){
	this.id = id;
	this.distance = distance;
	this.name = name;
};

covectric.util = {
	tokenizeString: function(text){
		text = text.toLowerCase();
		text = text.replace(/\?|\.|,|!|\-|'|`|;|\~|\(|\)|\[|\]|\{|\}/g, "");//(/\W/g," ");
		text = text.replace(/\b(the|it|in|a|and|to|of|is|for|as|on|his|was|i|they|are|that|you|at|he|with|be|had|have|what|or|this|but)\b/gi, "");
		var tokens = text.split(/\s/);
		for(var i = tokens.length; i >= 0; i--){
			if(tokens[i] == ""){
				tokens.splice(i, 1);
			}
		}
		return tokens;
	},

	vectorCosine: function(vector1, vector2){
		var norm = vector1.vectorLength() * vector2.vectorLength();
		if (norm == 0)
			return 0;
		else
			return (covectric.util.vectorProduct(vector1, vector2) / norm);
	},

	vectorProduct: function(vector1, vector2){
		var product = 0;
		for (var key in vector1.dimensionLengths) {
			if (key in vector2.dimensionLengths)	{
				product += vector1.dimensionLengths[key] * vector2.dimensionLengths[key];
			}
		}
		return product;
	}
};

exports = module.exports = covectric;



