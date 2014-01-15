var fs = require('fs'),
    path = require('path'),
    AWS = require('aws-sdk'),
    s3 = new AWS.S3();
    
    
module.exports = function(settings) {
    
    return {
      getId:getId,
      deleteId:deleteId,
      updateId:updateId
    };
    
    function getId(id, callback) {
      
      var filename = getFilename(id);
      
      s3.getObject({
        Bucket: settings.bucket,
        Key: filename
      }, function(error, data) {
        if(error) {
          if(error.code == 'NoSuchKey') {
            callback({code:404,msgs:["Not Found"]});
          } else {
            callback({code:500,msgs:["S3 Retrieval Error"]});
          }
        } else {
          callback(null,JSON.parse(data.Body));
        }
      });
      
    }
    
    function deleteId(id, timestamp, callback) {
    
      var filename = getFilename(id);
      s3.copyObject({
        CopySource: settings.bucket+'/'+filename,
        Bucket: settings.bucket,
        Key: filename+'.'+timestamp,
        ContentType: 'application/json; charset=utf-8'
      }, function(error, data) {
        if(error && error.code == 'NoSuchKey') {
          callback(null);
        } else if(error) {
          console.log(error);
          callback({code:500,msgs:["S3 Copy Error"]});
        } else {
          s3.deleteObject({
            Bucket: settings.bucket,
            Key: filename
          }, function(error, data) {
            if(error) {
              console.log(error);
              callback({code:500,msgs:["S3 Delete Error"]});
            } else {
              callback(null);
            }
          });
        }
      })
    }
    
    function updateId(id, obj, timestamp, callback) {
      var filename = getFilename(id);
      
      s3.copyObject({
        CopySource: settings.bucket+'/'+filename,
        Bucket: settings.bucket,
        Key: filename+'.'+timestamp,
        ContentType: 'application/json; charset=utf-8'
      }, function(error, data) {
        if(error && error.code != 'NoSuchKey') {
          console.log(error);
          callback({code:500,msgs:["S3 Copy Error"]});
        } else {
          s3.putObject({
            Bucket: settings.bucket,
            Key: filename,
            Body: JSON.stringify(obj),
            ContentType: 'application/json; charset=utf-8'
          }, function(error, data) {
            if(error) {
              console.log(error);
              callback({code:500,msgs:["S3 Put Error"]});
            } else {
              callback(null);
            }
          });
        }
      });
      
    }
    
    function getFilename(id) {
      if(isPlace(id)) {
        return path.join(getFilePath(id),'place.json');
      } else {
        return path.join(getFilePath(id),id.substr(id.indexOf('/'))+'.geojson');
      }
    }
    
    function getFilePath(fullId) {
      var id = fullId.split('/')[0];
      return path.join(settings.prefix,id.substr(0,2),id.substr(2,2),id.substr(4));
    }
    
    function isPlace(id) {
      // If id has a /, it is a geojson
      return id.indexOf('/') == -1;
    }
};