module.exports = function(app){

  // Home landing page
  app.get('/contribute', function(req, res){
    res.render('contribute/contribute');
  });

};