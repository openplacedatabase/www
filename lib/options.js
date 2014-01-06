/**
 * Make host header easily available and set cookie options
 */

module.exports = function(req, res, next){
  
  req.mountDomain = req.headers.host;
  
  // We don't set maxAge or expires because 
  // it's different for each cookie
  req.cookieOptions = {
    domain: req.host,
    path: '/',
  };
  
  next();
  
}