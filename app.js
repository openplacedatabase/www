var express = require('express'),
    app = express(),
    fs = require('fs'),
    path = require('path');

// Load settings into app.locals
app.locals.settings = {
  backing: (process.env.OPD_BACKING)?process.env.OPD_BACKING:'fs', // Options are s3 or fs
  fs_directory: (process.env.OPD_BACKING_FS_DIR)?process.env.OPD_BACKING:path.join(__dirname,'data'),
  s3_bucket: (process.env.OPD_BACKING_S3_BUCKET)?process.env.OPD_BACKING_S3_BUCKET:'',
  s3_prefix: (process.env.OPD_BACKING_S3_PREFIX)?process.env.OPD_BACKING_S3_PREFIX:'',
  elasticsearch_host: (process.env.OPD_ES_HOST)?process.env.OPD_ES_HOST:'localhost',
  elasticsearch_port: (process.env.OPD_ES_PORT)?process.env.OPD_ES_PORT:9200
}

// Serve up static files in assets directory
app.use('/assets', express.static(__dirname + '/assets'));
app.use(express.favicon(__dirname + '/assets/img/favicon.ico'));

// Setup ejs as the template/layout engine
app.engine('.html', require('ejs').__express);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');

// Use cookies
app.use(express.cookieParser());
app.use(require(__dirname + '/lib/options.js'));

// Make the request body available as text instead of a stream
app.use(express.bodyParser());

/**
 * Routes
 */
fs.readdir(__dirname + '/routes', function(error, files){
  if(error){
    console.error('Unable to load routes', error);
  } else {
    for(var i = 0; i < files.length; i++){
      if(/\.js$/.test(files[i])){
        require(__dirname + '/routes/' + files[i])(app);
      }
    }
  }
});

app.listen(8080);
console.log('Listening on port 8080');