var fs = require('fs'),
    csv = require('csv');

module.exports = function(filename) {

  return {
    log:log,
    get_changes:get_changes
  };

  function log(id, timestamp, callback) {
    
    fs.appendFile(filename,timestamp+"\t"+id+"\n",function(error) {
      if(error) {
        callback({code:500,msgs:["FS Log Error"]});
      } else {
        callback(null);
      }
    });
  }
  
  function get_changes(from, to, callback) {
    
    var data = [];
    
    csv().from.path(filename, { delimiter: '\t' })
    .on('record', function(row, index){
      
      // Skip rows outside of our bounds
      if(from && row[0] < from) return;
      if(to && row[0] > to) return;
      
      data.push({
        timestamp: parseInt(row[0]),
        id: row[1]
      });
    })
    .on('error', function(error){
      callback({code:500,msgs:["FS List Error"]});
    })
    .on('end', function(count){
      callback(null, data);
    });

  }
}