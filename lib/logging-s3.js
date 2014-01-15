var AWS = require('aws-sdk'),
    s3 = new AWS.S3(),
    _ = require('underscore')._;

module.exports = function(settings) {

  return {
    log:log,
    get_changes:get_changes
  };

  function log(id, timestamp, callback) {
    s3.putObject({
      Bucket: settings.bucket,
      Key: timestamp+'-'+id,
      Body: ''
    }, function(error, data) {
      if(error) {
        console.log(error);
        callback({code:500,msgs:["S3 Logging Error"]});
      } else {
        callback(null);
      }
    });
  }
  
  function get_changes(from, to, callback) {
    
    var options = {
      Bucket: settings.bucket,
      MaxKeys: 100
    }
    if(settings.prefix) options.Prefix = settings.prefix;
    if(from) options.Marker = from+'';
    
    getList(to, options, function(error, data) {
      callback(error,data);
    });
    
  }
  
  function getList(to, options, callback) {
    var data = [];
    
    s3.listObjects(options, function(error, response) {
      if(error) {
        console.log(error);
        callback({code:500,msgs:["S3 List Error"]});
      } else {
        
        var lastKey = null;
        
        for(var x in response.Contents) {
          var key = response.Contents[x].Key;
          lastKey = key;
          var timestamp = key.substr(0,key.indexOf('-'));
          var id = key.substr(key.indexOf('-')+1);
          
          // Skip rows outside of our bounds
          if(to && timestamp > to) return callback(null, data);
          
          data.push({
            timestamp: timestamp,
            id: id
          });
        }
        
        if(lastKey && response.IsTruncated) {
          var newOptions = _.clone(options);
          newOptions.Marker = lastKey;
          
          getList(to, newOptions, function(error, moreData) {
            if(error) {
              callback(error);
            } else {
              callback(null,data.concat(moreData));
            }
          });
          
        } else {
          callback(null, data);
        }
      }
      
    });
    
    
  }
  
}