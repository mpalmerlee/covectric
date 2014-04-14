covectric
=========

Covectric is a simple vector based search engine using cosine similarity and tf–idf methods for finding text similarity between documents.

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


License
-------
MIT Licensed