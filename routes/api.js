module.exports = function(app){
  
  var fs = require('fs'),
      path = require('path'),
      _ = require('underscore')._,
      async = require('async'),
      geoAssert = require('geojson-assert'),
      mkdirp = require('mkdirp'),
      check = require('validator').check;
  
  // Get a place json file
  app.get('/api/v0/place/:id/:geo?', function(req, res){
    
    if(!req.params.geo) {
      var id = req.params.id;
      var filename = path.join(__dirname,'..','data',id.substr(0,2),id.substr(2,2),id.substr(4),'place.json');
    } else {
      var id = req.params.id;
      var geo = req.params.geo;
      var filename = path.join(__dirname,'..','data',id.substr(0,2),id.substr(2,2),id.substr(4),geo+'.geojson');
    }
    
    fs.readFile(filename, function (error, data) {
      if(error) {
        //console.log(error);
        res.status(404);
        res.json(apiReturn(false, 404,"Not Found"));
      } else {
        res.json(apiReturn(JSON.parse(data)));
      }
    });
    
  });
  
  // Delete a place json file
  app.delete('/api/v0/place/:id/:geo?', function(req, res){
    
    if(!req.params.geo) {
      var id = req.params.id;
      var filename = path.join(__dirname,'..','data',id.substr(0,2),id.substr(2,2),id.substr(4),'place.json');
    } else {
      var id = req.params.id;
      var geo = req.params.geo;
      var filename = path.join(__dirname,'..','data',id.substr(0,2),id.substr(2,2),id.substr(4),geo+'.geojson');
    }
    
    fs.exists(filename,function(exists) {
      if(exists) {
        fs.rename(filename,filename+'.'+Date.now(),function(error) {
          if(error) {
            res.status(500);
            return res.json(apiReturn(false, 500,error.message));
          } else {
            return res.json(apiReturn(true));
          }
        });
      } else {
        res.status(404);
        return res.json(apiReturn(false, 404,"Not Found"));
      }
    });
    
  });
  
  // Create or update a place or geojson
  app.post('/api/v0/place/:id/:geo?', function(req, res){
    
    // Check json object
    var obj = req.body;
    var id = req.params.id;
    var filepath = path.join(__dirname,'..','data',id.substr(0,2),id.substr(2,2),id.substr(4));
    
    if(req.params.geo) {
      geo = req.params.geo;
      var filename = path.join(filepath,geo+'.geojson');
      try {
        geoAssert(obj);
      } catch(error) {
        //console.log(error);
        res.status(400);
        return res.json(apiReturn(false, 400,error.message));
      }
      
    } else {
      var filename = path.join(filepath,'place.json');
      
      try {
        verifyPlace(id, obj);
      } catch(error) {
        //console.log(error);
        res.status(400);
        return res.json(apiReturn(false, 400,error.message));
      }
      
      // Add user_id and last_updated
      obj.last_updated = Date.now();
      obj.user_id = 0;
      
    }
    
    async.auto({
      fileExists:function(callback) {
        // If old file exists, rename it
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
      dirExists:function(callback) {
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
      saveFile:['fileExists','dirExists',function(callback) {
        fs.writeFile(filename,JSON.stringify(req.body),function(error) {
          return callback(error);
        });
      }]
    },function(error,callback) {
      if(error) {
        console.error(error);
        res.status(500);
        res.json(apiReturn(false, 500,"Internal Error"));
      } else {
        res.json(apiReturn(true));
      }
    });

  });
  
  function verifyPlace(id, obj) {
    
    if(!_.isObject(obj)) throw new Error("Place must be an object");
    
    // Check id
    if(_.isUndefined(obj.id)) throw new Error("id is required");
    if(obj.id !== id) throw new Error("ids must match");
    try {
      check(obj.id).isUUIDv4()
    } catch(error) {
      throw new Error("id must be a UUIDv4");
    }
    
    // Check version
    if(_.isUndefined(obj.version)) throw new Error("version is required");
    if(obj.version !== 1) throw new Error("version 1 is the only version supported right now");
    
    // Check names
    if(_.isUndefined(obj.names)) throw new Error("names is required");
    if(!_.isArray(obj.names)) throw new Error("names must be an array");
    for(x in obj.names) {
      if(!_.isString(obj.names[x])) throw new Error("names must be an array of string");
    }
    
    // Check from
    if(_.isUndefined(obj.from)) throw new Error("from is required");
    if(!checkYear(obj.from)) throw new Error("from must be an integer between -9999 and 9999");
    
    // Check to
    if(_.isUndefined(obj.to)) throw new Error("to is required");
    if(!checkYear(obj.to)) throw new Error("to must be an integer between -9999 and 9999");
    
    // Make sure from is not > to
    if(obj.from > obj.to) throw new Error("from must be <= to");
    
    // Check geojson
    var geojsonsToCheck = [];
    
    if(_.isUndefined(obj.geojson)) throw new Error("geojson is required");
    if(!_.isArray(obj.geojson)) throw new Error("geojson must be an array");
    for(x in obj.geojson) {
      var elem = obj.geojson[x];
      
      if(!_.isObject(elem)) throw new Error("geojson must be an array of objects");
      if(Object.keys(elem).length != 3) throw new Error("in a geojson element, only from, to, and id are allowed");
      
      if(_.isUndefined(elem.from)) throw new Error("in a geojson element, from is required");
      if(!checkYear(obj.from)) throw new Error("in a geojson element, from must be an integer between -9999 and 9999");
      
      if(_.isUndefined(elem.to)) throw new Error("in a geojson element, from is required");
      if(!checkYear(obj.to)) throw new Error("in a geojson element, from must be an integer between -9999 and 9999");
      
      if(_.isUndefined(elem.id)) throw new Error("in a geojson element, id is required");
      if(!_.isString(elem.id)) throw new Error("in a geojson element, id must be a string");
      
      geojsonsToCheck.push(elem.id);
    }
    
    //make sure there are no more than 6 elements in the object
    if(Object.keys(obj).length != 6) throw new Error("only id, version, names, from, to, and geojson are allowed"); 
    
  }
  
  /**
   * Returns true only if there is no overlap in the year range for the geojsons
   */
  function checkGeojsonOverlap() {
    // TODO
    return true;
  }
  
  /**
   * Returns true only if the year is valid according to version 1
   */
  function checkYear(year) {
    
    if(!_.isNumber(year) || parseInt(year) !== year || year < -9999 || year > 9999) {
      return false ;
    } else {
      return true;
    }
  }
  
  function apiReturn(data, code, msg) {
  
    if(!data) data = false;
  
    if(!code) code = 200;
  
    var msgs = [];
    if(msg) {
      if(_.isArray(msg)) {
        msgs = msg;
      } else {
        msgs.push(msg);
      }
    }
  
    return {
      status:{
        code:code,
        msgs:msgs
      },
      data:data
    }
  }
  
  
};