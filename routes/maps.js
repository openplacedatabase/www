var restrict = require(__dirname + '/../lib/restrict.js');

module.exports = function(app){

  /**
   * Simple map for browsing data
   */
  app.get('/map', function(req, res){
    var data = {
      css: ['/assets/css/map.css'],
      js: [
        'https://maps.googleapis.com/maps/api/js?sensor=false&key=' + process.env.OPD_GOOGLE_API_KEY,
        '/assets/vendor/js/geojson-google-maps-from.js',
        '/assets/vendor/js/uuid.js',
        '/assets/js/map.js'        
      ],
      google_key: process.env.OPD_GOOGLE_API_KEY,
      editing: req.cookies['opd-session'] ? true : false
    };
    res.render('map', data);
  });
  
  /**
   * Map for editing shapes
   */
  app.get('/editor/:place_id', restrict, function(req, res){
    var data = {
      css: ['/assets/css/editor.css'],
      js: [
        'https://maps.googleapis.com/maps/api/js?libraries=drawing&sensor=false&key=' + process.env.OPD_GOOGLE_API_KEY,
        '//cdnjs.cloudflare.com/ajax/libs/mustache.js/0.7.2/mustache.min.js',
        '/assets/vendor/js/geojson-google-maps-from.js',
        '/assets/vendor/js/geojson-google-maps-to.js',
        '/assets/vendor/js/jquery.mustache.js',
        '/assets/js/editor.js'
      ],
      google_key: process.env.OPD_GOOGLE_API_KEY,
      place_id: req.params.place_id
    };
    res.render('editor', data);
  });

};