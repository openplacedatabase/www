var _ = require('underscore')._;

module.exports.format_return = function(data, code, msg) {
  
  if(!data) data = false;

  if(!code) code = 200;

  var msgs = [];
  if(msg) {
    if(_.isArray(msg)) {
      msgs = msg;
    } else {
      msgs.push(msg);
    }
  }

  return {
    status:{
      code:code,
      msgs:msgs
    },
    data:data
  }
}