/**
 * Setup login via HTTP Basic Auth at the
 * /auth/login URL
 */
 
var restrict = require(__dirname + '/../lib/restrict.js');
 
module.exports = function(app){
  
  app.get('/auth/login', restrict, function(req, res){
    res.cookie('opd-session', '1', {
      path: req.cookieOptions.path,
      domain: req.cookieOptions.domain,
      // Expire in one day
      maxAge: 86400000
    });
    res.redirect('/map');
  });
  
};