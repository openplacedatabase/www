module.exports = function(app){
  
  var fs = require('fs'),
      path = require('path'),
      _ = require('underscore')._,
      async = require('async'),
      geoAssert = require('geojson-assert'),
      mkdirp = require('mkdirp'),
      check = require('validator').check,
      restrict = require(__dirname + '/../lib/restrict.js');
  
  // Get a place json or geojson file
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
  
  // Delete a place json or geojson file
  app.delete('/api/v0/place/:id/:geo?', restrict, function(req, res){
    
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
  app.post('/api/v0/place/:id/:geo?', restrict, function(req, res){
    
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
    for(var x in obj.names) {
      var elem = obj.names[x];
      
      if(!_.isObject(elem)) throw new Error("name must be an array of objects");
      if(Object.keys(elem).length != 3) throw new Error("in a name element, only from, to, and name are allowed");
      
      if(_.isUndefined(elem.from)) throw new Error("in a name element, from is required");
      if(!checkDate(elem.from)) throw new Error("in a name element, from must be of the format yyyy-mm-dd");
      
      if(_.isUndefined(elem.to)) throw new Error("in a name element, to is required");
      if(!checkDate(elem.to)) throw new Error("in a name element, to must be of the format yyyy-mm-dd");
      
      if(_.isUndefined(elem.name)) throw new Error("in a name element, name is required");
      if(!_.isString(elem.name)) throw new Error("in a name element, name must be a string");
    }
    
    // Check sources
    if(_.isUndefined(obj.sources)) throw new Error("sources is required");
    if(!_.isArray(obj.sources)) throw new Error("sources must be an array");
    for(var x in obj.sources) {
      if(!_.isString(obj.sources[x])) throw new Error("sources must be an array of string");
    }
    
    // Check geojson
    var geojsonsToCheck = [];
    
    if(_.isUndefined(obj.geojsons)) throw new Error("geojson is required");
    if(!_.isArray(obj.geojsons)) throw new Error("geojson must be an array");
    for(var x in obj.geojsons) {
      var elem = obj.geojsons[x];
      
      if(!_.isObject(elem)) throw new Error("geojson must be an array of objects");
      if(Object.keys(elem).length != 3) throw new Error("in a geojson element, only from, to, and id are allowed");
      
      if(_.isUndefined(elem.from)) throw new Error("in a geojson element, from is required");
      if(!checkDate(elem.from)) throw new Error("in a geojson element, from must be of the format yyyy-mm-dd");
      
      if(_.isUndefined(elem.to)) throw new Error("in a geojson element, to is required");
      if(!checkDate(elem.to)) throw new Error("in a geojson element, to must be of the format yyyy-mm-dd");
      
      if(_.isUndefined(elem.id)) throw new Error("in a geojson element, id is required");
      if(!_.isString(elem.id)) throw new Error("in a geojson element, id must be a string");
      
      geojsonsToCheck.push(elem.id);
    }
    
    //make sure there are no more than 5 elements in the object
    if(Object.keys(obj).length != 5) throw new Error("only id, version, names, sources, and geojsons are allowed"); 
    
  }
  
  /**
   * Returns true only if there is no overlap in the year range for the geojsons
   */
  function checkGeojsonOverlap() {
    // TODO
    return true;
  }
  
  /**
   * Returns true only if the date is valid according to version 1
   */
  function checkDate(date) {
    return /\d{1,4}-\d{2}-\d{2}/.test(date);
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