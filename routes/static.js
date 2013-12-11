module.exports = function(app){

  app.get('/', function(req, res){
    var data = {
      css: ['/assets/css/home.css']
    };
  
    res.render('home', data);
  });

  app.get('/about', function(req, res){
    res.render('about');
  });
  
  app.get('/contribute', function(req, res){
    res.render('contribute');
  });
  
  app.get('/donate', function(req, res){
    res.render('donate');
  });
  
  app.get('/download', function(req, res){
    res.render('download');
  });
  
  app.get('/license', function(req, res){
    res.render('license');
  });

};