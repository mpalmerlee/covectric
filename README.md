covectric
=========

Covectric is a simple vector based search engine using cosine similarity and tf–idf methods for finding text similarity between documents.

Define "covectric"
------------------

Two documents are said to be covectric if they share one or more dimensions.



Install
-------
```bash
> npm install covectric
```


Usage
-----
```javascript
//instantiate the model
var covectric = require('covectric');
var model = new covectric.Model();

//populate the vector space and weight tokens based on term frequency
var id = 1;
['hello','hi','hi there','hey','hi to you'].forEach(function(t) {
	model.upsertDocument(id++, t, t);
});
model.recomputeVectorBaseTokenWeights();

//search the vector space

var results = model.search("hi bob", 3);
console.log("Search Results:", results);

```

Samples
-------
See the samples directory in the repo for more examples of using Covectric

Reference
---------
http://en.wikipedia.org/wiki/Vector_space_model
http://en.wikipedia.org/wiki/Cosine_similarity
http://en.wikipedia.org/wiki/Tf-idf

License
-------
MIT Licensed
