var https = require('https');

//instantiate the model
var covectric = require('../');
var model = new covectric.Model();

var getGitHubRepos = function(callback){
	var options = {
		hostname: 'api.github.com',
		port: 443,
		path: '/repositories',
		method: 'GET',
		headers: {
			'Cookie':'logged_in=no',
			'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/34.0.1847.116 Safari/537.36',
			'Content-Type': 'application/json'
		}
	};
	var req = https.request(options, function(res){
		var data = '';

		res.setEncoding('utf8');

		res.on('data', function (chunk) {
			data += chunk;
		});

		res.on('end', function() {
			var obj = JSON.parse(data);
			callback(null, data);
		});

	});
	req.on('error', function(e){
		callback(e);
	});

	req.end();
};

getGitHubRepos(function(err, body){
	if(err){
		console.error("Problem with github call: ", err);
	} else {
		var parsedBody = JSON.parse(body);
		parsedBody.forEach(function(repo){
			model.upsertDocument(repo.id, repo.name, repo.name);
			model.upsertDocument(repo.id, repo.name, repo.owner.login, 0.2);
			model.upsertDocument(repo.id, repo.name, repo.description, 0.4);
		});

		model.recomputeVectorBaseTokenWeights();

		//search the vector space
		var results = model.search("ruby library", 10);
		console.log("Search Results:", results);
	}
});


