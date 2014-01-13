var argv = require('optimist').argv,
    async = require('async'),
    path = require('path'),
    fs = require('fs'),
    readdirp = require('readdirp'),
    elasticsearch = require('elasticsearch'),
    esClient = new elasticsearch.Client({
      host: 'localhost:9200'
    });


if(argv._.length !== 1) {
  console.log('Usage: node utils/init-elasticsearch-from-fs.js from-dir');
  process.exit();
}

var sourceDir = argv._[0];
//add dirname of path doesn't start with /
if(sourceDir.substr(0,1) != '/') {
  var sourceDir = path.join(process.cwd(),sourceDir);
}

var startCount = 0,
    endCount = 0,
    outstandingCalls = 0,
    fileReadFinished = false;

var queue = async.queue(queueWorker, 10);
queue.drain = terminateWhenDone;

// Recursively loop through the data directory and import each file
readdirp({ root: sourceDir, fileFilter: [ '*.json' ] })
  .on('error', function (err) { console.error('fatal error', err); })
  .on('end', function () { 
    fileReadFinished = true;
    console.log('dir scan complete');
  })
  .on('data', function (entry) {
    
    startCount++;
    
    queue.push({
      type: 'file',
      filename: entry.fullPath
    });
  
  });

function terminateWhenDone() {
  if(fileReadFinished && outstandingCalls === 0) {
    console.log('Processing Complete. Processed ',endCount);
    process.exit();
  }
}

function queueWorker(task, queueCallback){
  if(task.type == 'place'){
    processPlace(task.json, queueCallback);
  }
  if(task.type == 'file'){
    readFile(task.filename, queueCallback);
  }
};

function readFile(filename, callback){
  outstandingCalls++;
  fs.readFile(filename, function (err, data) {
    outstandingCalls--;
    
    if (err) throw err;
    
    var json = JSON.parse(data);
    
    queue.push({
        type: 'place', 
        json: json
      });
    callback();
  });
};

function processPlace(json, callback) {
  
  outstandingCalls++;
  esClient.index({
    index: 'places-test',
    type: 'place',
    id: json.id,
    body: json
  }, function (error, response) {
    endCount++;
    outstandingCalls--;
    if(endCount && endCount % 100 == 0) {
      console.log('Processed ',endCount);
    }
    
    if(error) {
      console.log(error);
    }
    callback(error);
  });
}