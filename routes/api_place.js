module.exports = function(app){
  
  var _ = require('underscore')._,
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
  app.get('/api/v0/place/:id/:geo?', function(req, res) {
    
    var id = req.params.id + ((req.params.geo)?'/'+req.params.geo:'');
    
    backing.getId(id,function(error,data) {
      if(error) {
        console.log(error);
        res.status(404);
        res.json(api.format_return(false, 404,"Not Found"));
      } else {
        res.json(api.format_return(data));
      }
    });
    
  });
  
  // Delete a place json or geojson file
  app.delete('/api/v0/place/:id/:geo?', restrict, function(req, res) {
  //app.delete('/api/v0/place/:id/:geo?', function(req, res) {
    
    var isPlace = false;
    if(!req.params.geo) isPlace = true;
    var id = req.params.id + ((req.params.geo)?'/'+req.params.geo:'');
    var timestamp = Date.now();
    
    // Log the change
    logging.log(id, timestamp, function(error) {
      if(error) {
        res.status(error);
        res.json(api.format_return(false, error));
      } else {
        backing.deleteId(id, timestamp, function(error,data) {
          if(error) {
            res.status(error);
            res.json(api.format_return(false, error));
          } else {
      
            // Remove from elasticsearch if place
            if(isPlace) {
              esClient.delete({
                index: 'places-test',
                type: 'place',
                id: id
              }, function (error, response) {
                if(error && error.message != 'Not Found') {
                  res.status(500);
                  res.json(api.format_return(false, 500, "Internal Server Error - Elasticsearch failure"));
                } else {
                  res.json(api.format_return(true));
                }
              });
            } else {
              res.json(api.format_return(true));
            }
          }
        });
      }
    });
  });
  
  // Create or update a place or geojson
  app.post('/api/v0/place/:id/:geo?', restrict, function(req, res) {
  //app.post('/api/v0/place/:id/:geo?', function(req, res) {
    
    var isPlace = false;
    var id = req.params.id + ((req.params.geo)?'/'+req.params.geo:'');
    
    var timestamp = Date.now();
    
    //console.log(req.body);
    
    // Validate input
    if(req.params.geo) {
      try {
        validate.validGeoJSON(req.body);
      } catch(error) {
        res.status(400);
        return res.json(api.format_return(false, 400,error.message));
      }
    } else {
      isPlace = true;
      req.body.last_edited_time = timestamp;
      req.body.last_edited_by = 'User 0';
      try {
        validate.validPlace(id, req.body);
      } catch(error) {
        //console.log(error);
        //console.log(error.stack);
        res.status(400);
        return res.json(api.format_return(false, 400,error.message));
      }
    }
    
    // Log the change
    logging.log(id, timestamp, function(error) {
      if(error) {
        res.status(error);
        res.json(api.format_return(false, error));
      } else {
        // Save object
        backing.updateId(id, req.body, timestamp, function(error,data) {
          if(error) {
            res.status(error);
            res.json(api.format_return(false, error));
          } else {
        
            // Update elasticsearch if isPlace
            if(isPlace) {
              esClient.index({
                index: 'places-test',
                type: 'place',
                id: id,
                body: req.body
              }, function (error, response) {
                if(error) {
                  console.log(error);
                  res.status(500);
                  res.json(api.format_return(false, 500, "Internal Server Error - Elasticsearch failure"));
                } else {
                  res.json(api.format_return(true));
                }
              });
            } else {
              res.json(api.format_return(true));
            }
          }
        });
      }
    });
    
  });
  
};