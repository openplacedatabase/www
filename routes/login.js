/**
 * Setup login via HTTP Basic Auth at the
 * /auth/login URL
 */
module.exports = function(app){
  
  var auth = require('express').basicAuth(function(username, password){
    return username == process.env.OPD_USERNAME && password == process.env.OPD_PASSWORD;
  });
  
  app.get('/auth/login', auth, function(req, res){
    res.cookie('opd-session', '1', {
      path: req.cookieOptions.path,
      domain: req.cookieOptions.domain,
      // Expire in one day
      maxAge: 86400000
    });
    res.redirect('/map');
  });
  
};