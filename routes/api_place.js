module.exports = function(app){
  
  var _ = require('underscore')._,
      async = require('async'),
      elasticsearch = require('elasticsearch'),
      esClient = new elasticsearch.Client({
        host: app.locals.settings.elasticsearch_host+':'+app.locals.settings.elasticsearch_port
      }),
      restrict = require(__dirname + '/../lib/restrict.js'),
      validate = require(__dirname + '/../lib/validate.js'),
      api = require(__dirname + '/../lib/api.js');
  
  // Load backing based on setting
  if(app.locals.settings.backing == 's3') {
    var backing = require(__dirname + '/../lib/backing-s3.js')({
      bucket: app.locals.settings.backing_s3_bucket,
      prefix: app.locals.settings.backing_s3_prefix
    });
  } else {
    var backing = require(__dirname + '/../lib/backing-fs.js')(app.locals.settings.backing_fs_directory);
  }
  
  // Load logging based on setting
  if(app.locals.settings.logging == 's3') {
    var logging = require(__dirname + '/../lib/logging-s3.js')({
      bucket: app.locals.settings.logging_s3_bucket,
      prefix: app.locals.settings.logging_s3_prefix
    });
  } else {
    var logging = require(__dirname + '/../lib/logging-fs.js')(app.locals.settings.logging_fs_file);
  }
  
  // Get a place json or geojson file
  app.get(/\/api\/v0\/places\/(.*)+/, function(req, res) {
    
    var ids = req.params[0].split(',');

    if(ids.length == 1) {
      var id = ids[0];
    
      backing.getId(id,function(error,data) {
        if(error) {
          console.log(error);
          res.status(error.code);
          res.json(api.format_return(false, error.code,error.msgs));
        } else {
          res.json(api.format_return(data));
        }
      });

    } else {
      var places = {};
      async.eachLimit(ids, 10, function(id, callback) {
        backing.getId(id,function(error,data) {
          if(error) {
            //console.log(error);
            places[id] = {status:error,data:false};
          } else {
            places[id] = {status:{code:200,msgs:[]},data:data};
          }
          // Always succeed so we can loop over everything
          callback(null);
        });
      },function(error) {
        res.json(api.format_return(places));
      });

    }
    
  });
  
  // Delete a place json or geojson file
  app.delete(/\/api\/v0\/places\/(.*)+/, restrict, function(req, res) {

    var ids = req.params[0].split(',');
    var timestamp = Date.now();
    var deleted = {};

    async.eachLimit(ids, 10, function(id, callback) {
      deletePlace(id, timestamp, function(error) {
        if(error) {
          //console.log(error);
          deleted[id] = {status:error,data:false};
        } else {
          deleted[id] = {status:{code:200,msgs:[]},data:true};
        }
        callback(null);
      });
    },function(error) {
      if(ids.length == 1) {
        var singleId = deleted[ids[0]];
        res.status = singleId.status.code;
        res.json(api.format_return(singleId.data, singleId.status.code, singleId.status.msgs));
      } else {
        res.json(api.format_return(deleted));
      }
    });

  });
  
  function deletePlace(id, timestamp, callback) {

    // Log the change
    logging.log(id, timestamp, function(error) {
      if(error) {
        callback(error);
      } else {
        // Delete the place
        backing.deleteId(id, timestamp, function(error,data) {
          if(error) {
           callback(error);
          } else {
            // Remove from elasticsearch if place
            if(isPlace(id)) {
              esClient.delete({
                index: app.locals.settings.elasticsearch_index,
                type: 'place',
                id: id
              }, function (error, response) {
                if(error && error.message != 'Not Found') {
                  callback({code:500,msgs:["Elasticsearch Removal Error"]});
                } else {
                  callback(null);
                }
              });
            } else {
              callback(null);
            }
          }
        });
      }
    });
  }

  // Create or update a place or geojson
  app.post('/api/v0/places/:id/:geo?', restrict, function(req, res) {
    
    var id = req.params.id + ((req.params.geo)?'/'+req.params.geo:'');
    var timestamp = Date.now();

    if(isPlace(id)) {
      req.body.last_edited_time = timestamp;
      req.body.last_edited_by = app.locals.settings.creds[req.user].id + ' - ' +app.locals.settings.creds[req.user].name;
    }

    validatePlace(id, req.body, function(error) {
      if(error) {
        //console.log(error);
        res.status = error.code;
        res.json(api.format_return(error.data, error.code, error.msgs));
      } else {
        updatePlace(id, timestamp, req.body, function(error) {
          if(error) {
            res.status = error.code;
            res.json(api.format_return(error.data, error.code, error.msgs));
          } else {
            res.json(api.format_return(true));
          }
        });
      }
    });
  });

  // Create or update multiple places or geojsons
  app.post('/api/v0/places', restrict, function(req, res) {
    
    if(!_.isObject(req.body)) {
      res.status = 400;
      res.json(api.format_return(false, 400, 'Body must be an array of places'));
    }
    var places = [];
    for(var x in req.body) {
      places.push({
        id:x,
        json:req.body[x]
      });
    }
    var timestamp = Date.now();

    var updated = {};
    async.eachLimit(places, 10, function(place, callback) {
      
      if(isPlace(place.id)) {
        place.json.last_edited_time = timestamp;
        place.json.last_edited_by = app.locals.settings.creds[req.user].id + ' - ' +app.locals.settings.creds[req.user].name;
      }

      validatePlace(place.id, place.json, function(error) {
        if(error) {
          updated[place.id] = {status:error,data:false};
          callback(null);
        } else {
          updatePlace(place.id, timestamp, place.json, function(error) {
            if(error) {
              updated[place.id] = {status:error,data:false};
              callback(null);
            } else {
              updated[place.id] = {status:{code:200,msgs:[]},data:true};
              callback(null);
            }
          });
        }
      });
    },function(error) {
      res.json(api.format_return(updated));
    });
    
  });
  
  function validatePlace(id, obj, callback) {
    // If this is a place and not a geojson
    if(isPlace(id)) {
      try {
        validate.validPlace(id, obj);
      } catch(error) {
        return callback({code:400,msgs:[error.message]});
      }
    } else {
      try {
        validate.validGeoJSON(obj);
      } catch(error) {
        return callback({code:400,msgs:[error.message]});
      }
    }
    callback(null);
  }

  function updatePlace(id, timestamp, obj, callback) {

    // Log the change
    logging.log(id, timestamp, function(error) {
      if(error) {
        callback(error);
      } else {
        // Save object
        backing.updateId(id, obj, timestamp, function(error,data) {
          if(error) {
            callback(error);
          } else {
        
            // Update elasticsearch if isPlace
            if(isPlace(id)) {
              esClient.index({
                index: app.locals.settings.elasticsearch_index,
                type: 'place',
                id: id,
                body: obj
              }, function (error, response) {
                if(error) {
                  callback({code:500,msgs:["Elasticsearch Update Error"]});
                } else {
                  callback(null);
                }
              });
            } else {
              callback(null);
            }
          }
        });
      }
    });
  }

  function isPlace(id) {
    return id.indexOf('/') == -1;
  }

};