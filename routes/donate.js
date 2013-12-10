module.exports = function(app){

  // Home landing page
  app.get('/donate', function(req, res){
    res.render('donate/donate');
  });

};