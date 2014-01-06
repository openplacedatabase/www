/**
 * Middleware that enforces http basic auth.
 * Designed to be included as route-specific middleware.
 */

var express = require('express');
 
module.exports = express.basicAuth(function(username, password){
  return username == process.env.OPD_USERNAME && password == process.env.OPD_PASSWORD;
});