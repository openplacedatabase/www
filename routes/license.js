module.exports = function(app){

  // Home landing page
  app.get('/license', function(req, res){
    res.render('license/license');
  });

};