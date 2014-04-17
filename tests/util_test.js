#!/usr/bin/env node

var covectric = require('../');
var model = new covectric.Model();

var st = "Hello, my name  is Matt.  My 1st Email address is: matt@somedomain.com. What is yours?  I also have a website you should visit here; http://www.mattpalmerlee.com.";

var tokens = covectric.util.tokenizeString(st);

console.log("String:", st, "tokens:", tokens);

var expectedTokens = [ 'hello',
	'my',
	'name',
	'matt',
	'my',
	'1st',
	'email',
	'address',
	'matt@somedomain.com',
	'yours',
	'also',
	'website',
	'should',
	'visit',
	'here',
	'http',
	'www.mattpalmerlee.com' ];

for(var i = 0; i < expectedTokens.length; i++){
	if(tokens.length < i || tokens[i]!=expectedTokens[i]){
		console.warn("Tokens Don't match expected tokens!");
		process.exit(1);
	}
}