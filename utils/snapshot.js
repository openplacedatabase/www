var archiver = require('archiver'),
		async = require('async'),
    knox = require('knox-copy'),
    AWS = require('aws-sdk'),
    s3 = new AWS.S3(),
    fs = require('fs'),
    argv = require('optimist')
    	.demand('b') // The bucket to snapshot from
    	.argv,
    doneStreamingKeys = false,
    processed = 0;

// Setup file stream
var outputStream = fs.createWriteStream('/tmp/tmp.zip');
outputStream.on('close', function() {
  console.log('archiver has been finalized and the output file descriptor has closed.');
});

// Connect archiver to the output file stream
var archive = archiver('zip');
archive.pipe(outputStream);

// Setup Async queue to get S3 objects
var queue = async.queue(function (key, callback) {
	s3.getObject({
    Bucket: argv.b,
    Key: key
  }, function(error, data){
  	if(error) {
  		console.log('s3 error',error);
  	} else {
  		archive.append(data.Body, { name: key });
  	}
  	processed++;
  	if(processed%1000 == 0) {
  		console.log(processed);
  	}
  	callback(null);
  });
},10);

queue.drain = function(){
  if(doneStreamingKeys){
	  archive.finalize(function(err, bytes) {
		  if (err) {
		    console.log('could not finalize zip file');
		  }
		  console.log(bytes + ' total bytes');
		});
  }
};

// Setup Knox client
knox.createClient({
  key: process.env.AWS_ACCESS_KEY_ID,
  secret: process.env.AWS_SECRET_ACCESS_KEY,
  bucket: argv.b
}).streamKeys().on('data', function(key){
	queue.push(key);
}).on('end', function(){
  doneStreamingKeys = true;
});