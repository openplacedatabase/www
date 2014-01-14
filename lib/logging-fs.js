var fs = require('fs');

module.exports = function(filename) {

  return {
    log:log
  };

  function log(id, timestamp, callback) {
    
    fs.appendFile(filename,timestamp+"\t"+id+"\n",function(error) {
      if(error) {
        callback(500);
      } else {
        callback(null);
      }
    });
  }
}