var express = require('express'),
    app = express(),
    fs = require('fs');

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