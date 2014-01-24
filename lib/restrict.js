/**
 * Middleware that enforces http basic auth.
 * Designed to be included as route-specific middleware.
 */

var express = require('express'),
    fs = require('fs'),
    path = require('path'),
    credentials_file = process.env.OPD_CRED_FILE ? process.env.OPD_CRED_FILE : path.join(__dirname,'..','.credentials.json'),
    creds = {};

// Load credentials file
if(fs.existsSync(credentials_file)) {
  creds = JSON.parse(fs.readFileSync(credentials_file))
}

 
module.exports = express.basicAuth(function(username, password){
  return creds[username] && creds[username].pwd == password;
});