module.exports = function(app){

  // Home landing page
  app.get('/', function(req, res){
    var data = {
      css: ['/assets/css/home.css']
    };
  
    res.render('home/home', data);
  });

};