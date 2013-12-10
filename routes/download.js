module.exports = function(app){

  // Home landing page
  app.get('/download', function(req, res){
    res.render('download/download');
  });

};