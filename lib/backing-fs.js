var fs = require('fs'),
    path = require('path'),
    _ = require('underscore')._,
    async = require('async'),
    mkdirp = require('mkdirp');
    
    
module.exports = function(directory) {
    
    return {
      getId:getId,
      deleteId:deleteId,
      updateId:updateId
    };
    
    function getId(id, callback) {
      
      var filename = getFilename(id);
      
      fs.readFile(filename, function (error, data) {
        if(error) {
          callback("Not Found");
        } else {
          callback(null,JSON.parse(data));
        }
      });
    }
    
    function deleteId(id, callback) {
      
      var filename = getFilename(id);
      
      fs.exists(filename,function(exists) {
        if(exists) {
          fs.rename(filename,filename+'.'+Date.now(),function(error) {
            if(error) {
              callback(500);
            } else {
              callback(null);
            }
          });
        } else {
          callback(404);
        }
      });
      
    }
    
    function updateId(id, obj, updateCallback) {
      
      var filename = getFilename(id);
      var filepath = getFilePath(id);
      async.auto({
    
        // If old file exists, rename it
        fileExists: function(callback) {
          fs.exists(filename,function(exists) {
            if(exists) {
              fs.rename(filename,filename+'.'+Date.now(),function(error) {
                return callback(error);
              });
            } else {
              return callback(null);
            }
          });
        },
      
        // Make sure the directories exist
        dirExists: function(callback) {
          fs.exists(filepath,function(exists) {
            if(exists) {
              return callback(null);
            } else {
              mkdirp(filepath,function(error) {
                return callback(error);
              });
            }
          });
        },
      
        // Save the file
        saveFile: ['fileExists','dirExists',function(callback) {
          fs.writeFile(filename,JSON.stringify(obj),function(error) {
            return callback(error);
          });
        }]
      
      },function(error,callback) {
        if(error) {
          console.error(error);
          updateCallback(500);
        } else {
          updateCallback(null);
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
      return path.join(directory,id.substr(0,2),id.substr(2,2),id.substr(4));
    }
    
    function isPlace(id) {
      // If id has a /, it is a geojson
      return id.indexOf('/') == -1;
    }
};