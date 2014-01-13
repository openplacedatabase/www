
module.exports = function(settings) {

  return {
    log:log
  };

  function log(id, timestamp, callback) {
    callback(null);
  }
}