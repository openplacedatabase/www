module.exports = function(app){

  // Home landing page
  app.get('/', function(req, res){
    res.render('home/home');
  });

};