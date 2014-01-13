var AWS = require('aws-sdk'),
    s3 = new AWS.S3();

module.exports = function(settings) {

  return {
    log:log
  };

  function log(id, timestamp, callback) {
    s3.putObject({
      Bucket: settings.bucket,
      Key: timestamp+'-'+id,
      Body: ''
    }, function(error, data) {
      if(error) {
        console.log(error);
        callback(500);
      } else {
        callback(null);
      }
    });
  }
  
  function getDiff(from, to) {
    /*
    s3.listObjects({
      Bucket: 'opd-test',
      Marker: '101',
      //Prefix: 'ed/d0/c046-1576-4f70-9cbd-503fc60d5968/',
      MaxKeys: 10,
    }, function(error, data) {
      console.log(data);
    });
    */
  }
}