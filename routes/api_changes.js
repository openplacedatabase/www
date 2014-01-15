module.exports = function(app){
  
  var api = require(__dirname + '/../lib/api.js'),
      _ = require('underscore')._;
  
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
  app.get('/api/v0/changes', function(req, res) {
    
    var from = null;
    if(req.query.from) from = parseInt(req.query.from);
    
    var to = null;
    if(req.query.to) to = parseInt(req.query.to);
    
    logging.get_changes(from, to, function(error, data) {
      if(error) {
        res.status(error.code);
        res.json(api.format_return(false, error.code, error.msgs));
      } else {
        res.json(api.format_return(data));
      }
    });
    
  });


};