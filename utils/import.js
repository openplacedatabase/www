var fs = require('fs'),
  	path = require('path'),
    async = require('async'),
  	admZip = require('adm-zip'),
    opdSDK = require('opd-sdk'),
  	argv = require('optimist')
      .demand(['u','p'])
      .default('b',10)
      .default('c',10)
      .argv;

var opdClient = opdSDK.createClient({
    host: 'http://localhost:8080',
    username:argv.u,
    password:argv.p
  });

if(argv._.length !== 1) {
  console.log('Usage: node utils/import.js from-file.zip');
  process.exit();
}

var sourceFile = argv._[0];
//add dirname of path doesn't start with /
if(sourceFile.substr(0,1) != '/') {
  var sourceFile = path.join(process.cwd(),sourceFile);
}

var queue = async.queue(function (task, taskCallback) {
  //console.log(task.length);
  
  var requestObject = {};
  async.each(task,function(item, callback) {
    item.getDataAsync(function(data) {
      requestObject[item.opdId] = JSON.parse(data);
      callback(null);
    });
  },function(error) {
    if(error) taskCallback(error);
    //console.log(requestObject);
    opdClient.savePlaces(requestObject, function(error, data) {
      //console.log(error);
      //console.log(data);
      taskCallback(error);
    });
  });

}, 2);

// assign a callback
queue.drain = function() {
    console.log('all items have been processed');
};

var zip = new admZip(sourceFile);
var zipEntries = zip.getEntries(); // an array of ZipEntry records

var batch = [];
for(var x in zipEntries) {
  var entry = zipEntries[x];
  if(entry.isDirectory) continue;
  var extArr = entry.entryName.split('.');
  var pathSegments = extArr[0].split('/');
  if(extArr.length != 2 || (extArr[1] != 'json' && extArr[1] != 'geojson') || pathSegments.length != 4) {
    continue;
  }
  
  // Extract the ID
  entry.opdId = pathSegments[0]+pathSegments[1]+pathSegments[2];
  if(extArr[1] == 'geojson') continue;//entry.opdId += '/'+pathSegments[3];
  

  batch.push(entry);

  if(batch.length >= 10) {
    // Wrapping batch in an array before en-queuing makes async treat it as 1 task
    queue.push([batch],function(error) {
      if(error) console.log(error);
    });
    batch = [];
  }
}

// Enqueue anything left
if(batch.length > 0) {
  queue.push([batch],function(error) {
    if(error) console.log(error);
  });
}

//Clear out zipEntries array
zipEntries = [];