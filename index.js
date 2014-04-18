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

covectric.Model.prototype.countVectorBaseDocuments = function(){
	var length = 0;
	for(var vi in this.vectorBase){
		length++;
	}
	return length;
};

covectric.Model.prototype.search = function(text, maxResults){
	var vector = new covectric.Model.VectorN(-1, text);
	vector.addTokens(this.textTransformFunction(text));
	vector.computeTokenWeights(this.dimensionDocumentCount, this.countVectorBaseDocuments());
	return this.vectorSearch(vector, maxResults);
};

covectric.Model.prototype.vectorSearch = function(inputVector, maxResults){
	var matches = [];
	for(var id in this.vectorBase) {
		if(id == inputVector.id){
			continue;
		}
		var vector = this.vectorBase[id];
		var similarity = covectric.util.vectorCosine(inputVector, vector);
		if (similarity != 0) {
			//this match has at least one dimensional commonality
			matches.push(new covectric.Model.VectorMatch(vector.id, similarity, vector.name));
		}
	}
	matches.sort(function(a, b){
		return b.similarity - a.similarity;
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
			if(r.similarity >= similarityThreshold && (!(r.id in seenSimilarDocuments))){
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
	var vectorBaseDocumentCount = this.countVectorBaseDocuments();
	for(var id in this.vectorBase){
		this.vectorBase[id].computeTokenWeights(this.dimensionDocumentCount, vectorBaseDocumentCount);
	}
};

covectric.Model.prototype.upsertDocument = function(id, name, text, baseTokenWeight, computeTokenWeights){

	var vector = null;
	if(!(id in this.vectorBase)){
		vector = new covectric.Model.VectorN(id, name);
		this.vectorBase[id] = vector;
	} else {
		vector = this.vectorBase[id];
		vector.name = name;
	}

	var tokens = this.updateVector(vector, text, baseTokenWeight, computeTokenWeights);

	this.updateDimensionDocumentCountForTokens(tokens);

	return vector;
};

covectric.Model.prototype.updateDimensionDocumentCountForTokens = function(tokens){
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

/**
 *
 * @param vector - the vector to update
 * @param text - the text to add to the vector
 * @param baseTokenWeight - optional, defaults to 1
 * @param computeTokenWeights - optional, defaults to false
 * @param vectorBaseDocumentCount - optional, defaults to lookup the vector base document count if computeTokenWeights is true
 * @returns {*}
 */
covectric.Model.prototype.updateVector = function(vector, text, baseTokenWeight, computeTokenWeights, vectorBaseDocumentCount){
	baseTokenWeight = baseTokenWeight || 1;

	//process text and add to vector dimensionLengths
	var tokens = this.textTransformFunction(text);
	vector.addTokens(tokens, baseTokenWeight);

	//NOTE: when we populate the entire vectorBase initially we don't want to do this for each vector
	// because we have to do a 2nd pass anyways after all documents are in the vectorBase
	if(computeTokenWeights){
		vectorBaseDocumentCount = vectorBaseDocumentCount || this.countVectorBaseDocuments();
		vector.computeTokenWeights(this.dimensionDocumentCount, vectorBaseDocumentCount);
	}

	return tokens;
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

covectric.Model.VectorN.prototype.computeTokenWeights = function(dimensionDocumentCount, vectorBaseDocumentCount){
	this.dimensionLengths = {};
	for(var tbw in this.tokenBaseWeights){
		this.dimensionLengths[tbw] = this.tokenBaseWeights[tbw];
	}

	//compute tf*idf weighting
	for(var dim in this.dimensionLengths){
		if(dim in dimensionDocumentCount){
			var inverseDocFreq = Math.log(vectorBaseDocumentCount / dimensionDocumentCount[dim]);
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

covectric.Model.VectorMatch = function(id, similarity, name){
	this.id = id;
	this.similarity = similarity;
	this.name = name;
};

covectric.util = {
	tokenizeString: function(text){
		if(!text){
			return [];
		}
		text = text + "";
		text = text.toLowerCase();
		text = text.replace(/\B\W|\W\B/g," ");//(/\?|\.|,|!|\-|'|`|:|;|\~|\(|\)|\[|\]|\{|\}/g, "");
		text = text.replace(/\b(the|it|in|a|and|to|of|is|for|as|on|his|was|i|they|are|that|you|at|he|with|be|had|have|what|or|this|but)\b/gi, "");
		var tokens = text.split(/\s/);
		for(var i = tokens.length; i >= 0; i--){
			if(tokens[i]){
				tokens[i] = tokens[i].trim();
			}

			if(!tokens[i]){
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



