var fs = require('fs'),
    path = require('path'),
    _ = require('underscore')._
    AWS = require('aws-sdk'),
    s3 = new AWS.S3();
    
    
module.exports = function(obj) {
    
    var settings = _.extend({
      bucket: 'opd-data',
      prefix: ''
    },obj);
    
    return {
      getId:getId,
      deleteId:deleteId,
      updateId:updateId
    };
    
    function getId(id, callback) {
      
      var filename = getFilename(id);
      
      console.log(filename);
      
      s3.getObject({
        Bucket: settings.bucket,
        Key: filename
      }, function(error, data) {
        if(error) {
          console.log(error);
          callback("Not Found");
        } else {
          callback(null,JSON.parse(data.Body));
        }
      });
      
    }
    
    function deleteId(id, callback) {
    
      var filename = getFilename(id);
      s3.copyObject({
        CopySource: settings.bucket+'/'+filename,
        Bucket: settings.bucket,
        Key: filename+'.'+Date.now(),
        ContentType: 'application/json'
      }, function(error, data) {
        if(error && error.code != 'NoSuchKey') {
          console.log(error);
          callback(500);
        } else {
          s3.deleteObject({
            Bucket: settings.bucket,
            Key: filename
          }, function(error, data) {
            if(error) {
              console.log(error);
              callback(500);
            } else {
              callback(null);
            }
          });
        }
      })
    }
    
    function updateId(id, obj, callback) {
      var filename = getFilename(id);
      
      s3.copyObject({
        CopySource: settings.bucket+'/'+filename,
        Bucket: settings.bucket,
        Key: filename+'.'+Date.now(),
        ContentType: 'application/json'
      }, function(error, data) {
        if(error && error.code != 'NoSuchKey') {
          console.log(error);
          callback(500);
        } else {
          s3.putObject({
            Bucket: settings.bucket,
            Key: filename,
            Body: JSON.stringify(obj),
            ContentType: 'application/json'
          }, function(error, data) {
            if(error) {
              console.log(error);
              callback(500);
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