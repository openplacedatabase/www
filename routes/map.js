module.exports = function(app){

  // Home landing page
  app.get('/map', function(req, res){
    var data = {
      css: ['map.css'],
      js: ['map.js'],
      google_key: process.env.OPD_GOOGLE_API_KEY
    };
    res.render('map/map', data);
  });

};