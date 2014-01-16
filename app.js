var express = require('express'),
    app = express(),
    fs = require('fs'),
    path = require('path');

// Load settings into app.locals
app.locals.settings = {
  backing: (process.env.OPD_BACKING)?process.env.OPD_BACKING:'fs', // Options are s3 or fs
  backing_fs_directory: (process.env.OPD_BACKING_FS_DIR)?process.env.OPD_BACKING:path.join(__dirname,'data'),
  backing_s3_bucket: (process.env.OPD_BACKING_S3_BUCKET)?process.env.OPD_BACKING_S3_BUCKET:'',
  backing_s3_prefix: (process.env.OPD_BACKING_S3_PREFIX)?process.env.OPD_BACKING_S3_PREFIX:'',
  logging: (process.env.OPD_LOGGING)?process.env.OPD_LOGGING:'fs', // Options are s3 or fs
  logging_fs_file: (process.env.OPD_LOGGING_FS_FILE)?process.env.OPD_LOGGING_FS_FILE:path.join(__dirname,'changes.log'),
  logging_s3_bucket: (process.env.OPD_LOGGING_S3_BUCKET)?process.env.OPD_LOGGING_S3_BUCKET:'',
  logging_s3_prefix: (process.env.OPD_LOGGING_S3_PREFIX)?process.env.OPD_LOGGING_S3_PREFIX:'',
  elasticsearch_host: (process.env.OPD_ES_HOST)?process.env.OPD_ES_HOST:'localhost',
  elasticsearch_port: (process.env.OPD_ES_PORT)?process.env.OPD_ES_PORT:9200,
  elasticsearch_index: (process.env.OPD_ES_INDEX)?process.env.OPD_ES_INDEX:'places',
  credentials_file: (process.env.OPD_CRED_FILE)?process.env.OPD_CRED_FILE:path.join(__dirname,'.credentials.json')
}

// Load credentials file
if(fs.existsSync(app.locals.settings.credentials_file)) {
  app.locals.settings.creds = JSON.parse(fs.readFileSync(app.locals.settings.credentials_file));
} else {
  app.locals.settings.creds = {};
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
app.use(express.json());
app.use(express.urlencoded());

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