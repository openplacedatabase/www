module.exports = function(app){

  // Home landing page
  app.get('/about', function(req, res){
    res.render('about/about');
  });

};