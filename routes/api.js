module.exports = function(app){
  
  var restrict = require(__dirname + '/../lib/restrict.js'),
      validate = require(__dirname + '/../lib/validate.js');
  
  // Load backing based on setting
  if(app.locals.settings.backing == 's3') {
    var backing = require(__dirname + '/../lib/backing-s3.js')();
  } else {
    var backing = require(__dirname + '/../lib/backing-fs.js')();
  }
  
  // Get a place json or geojson file
  app.get('/api/v0/place/:id/:geo?', function(req, res){
    
    var id = req.params.id + ((req.params.geo)?'/'+req.params.geo:'');
    
    backing.getId(id,function(error,data) {
      if(error) {
        console.log(error);
        res.status(404);
        res.json(apiReturn(false, 404,"Not Found"));
      } else {
        res.json(apiReturn(data));
      }
    });
    
  });
  
  // Delete a place json or geojson file
  //app.delete('/api/v0/place/:id/:geo?', restrict, function(req, res){
  app.delete('/api/v0/place/:id/:geo?', function(req, res){
    
    var id = req.params.id + ((req.params.geo)?'/'+req.params.geo:'');
    
    backing.deleteId(id,function(error,data) {
      if(error) {
        res.status(error);
        res.json(apiReturn(false, error));
      } else {
        res.json(apiReturn(true));
      }
    });
    
  });
  
  // Create or update a place or geojson
  //app.post('/api/v0/place/:id/:geo?', restrict, function(req, res){
  app.post('/api/v0/place/:id/:geo?', function(req, res){
    
    var id = req.params.id + ((req.params.geo)?'/'+req.params.geo:'');
    
    //console.log(req.body);
    
    // Validate input
    if(req.params.geo) {
      try {
        validate.validGeoJSON(req.body);
      } catch(error) {
        res.status(400);
        return res.json(apiReturn(false, 400,error.message));
      }
    } else {
      req.body.last_edited_time = Date.now();
      req.body.last_edited_by = 'User 0';
      try {
        validate.validPlace(id, req.body);
      } catch(error) {
        //console.log(error);
        //console.log(error.stack);
        res.status(400);
        return res.json(apiReturn(false, 400,error.message));
      }
    }
    
    // Save object
    backing.updateId(id, req.body, function(error,data) {
      if(error) {
        res.status(error);
        res.json(apiReturn(false, error));
      } else {
        res.json(apiReturn(true));
      }
    });
    
  });
  
  /**
   * Format the API return
   */
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