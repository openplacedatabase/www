module.exports = function(app){

  // Home landing page
  app.get('/map', function(req, res){
    var data = {
      css: ['/assets/css/map.css'],
      js: [
        'https://maps.googleapis.com/maps/api/js?sensor=false&key=' + process.env.OPD_GOOGLE_API_KEY,
        '/assets/vendor/js/GeoJSON.js',
        '/assets/js/map.js'
      ],
      google_key: process.env.OPD_GOOGLE_API_KEY
    };
    res.render('map', data);
  });

};