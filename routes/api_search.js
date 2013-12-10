module.exports = function(app){

  //setup elasticsearch
  var ejs = require('elastic.js'),
      nc = require('elastic.js/elastic-node-client'),
       _ = require('underscore')._;
      
  ejs.client = nc.NodeClient('localhost',9200);
  
  
  //define routes
  app.get('/api/v0/search/places', function (req, res) {
    
    if(!req.query.q && !req.query.s) {
      res.status(400);
      return res.json(apiReturn(false, 400,"Parameter q or s is required"));
    }
    
    var query;
    
    if(req.query.q) {
      query = req.query.q;
    } else {
      query = 'names:'+req.query.s+'*';
    }
    
    //setup query
    var qsQuery = ejs.QueryStringQuery(query);
    qsQuery.defaultField('names');
    var r = ejs.Request().indices('places').query(qsQuery);
    
    //call query
    r.doSearch(function(esResults) {
      //verify search was good
      if (!esResults.hits) {
        console.error('Error: GET /api/v0/search/places - Elasticsearch Error, missing hits object');
        res.status(500);
        return res.json(apiReturn(false, 500,"Internal Error"));
      }
      if(esResults.hits.total < 1) {
        return res.json(apiReturn({}));
      }
      
      //search was good and we have results.
      var ret = [];
      for(x in esResults.hits.hits) {
        ret.push(esResults.hits.hits[x]._source);
      }
      
      return res.json(apiReturn(ret));
      
      
    }); //end elasticsearch callback

  });
  
  function apiReturn(data, code, msg) {
  
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

};