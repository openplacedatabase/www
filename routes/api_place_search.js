module.exports = function(app){

  //setup elasticsearch
  var elasticsearch = require('elasticsearch'),
      esClient = new elasticsearch.Client({
        host: app.locals.settings.elasticsearch_host+':'+app.locals.settings.elasticsearch_port
      }),
       _ = require('underscore')._,
       api = require(__dirname + '/../lib/api.js');
  
  
  //define routes
  app.get('/api/v0/search/places', function (req, res) {
    
    if(!req.query.q && !req.query.s) {
      res.status(400);
      return res.json(api.format_return(false, 400,"Parameter q or s is required"));
    }
    
    if(!req.query.q && !req.query.s) {
      res.status(400);
      return res.json(api.format_return(false, 400,"Parameter q or s is required"));
    }
    
    if(req.query.count) {
      if( _.isNaN(req.query.count) || req.query.count < 1 || req.query.count > 100) {
        res.status(400);
        return res.json(api.format_return(false, 400,"Parameter count must be a number and between 1 (inclusive) and 100 (inclusive)"));
      }
    } else {
      req.query.count = 10;
    }
    
    if(req.query.offset) {
      req.query.offset = parseInt(req.query.offset);
      if( _.isNaN(req.query.offset) || req.query.offset < 0) {
        res.status(400);
        return res.json(api.format_return(false, 400,"Parameter offset must be a number and greater than 0 (inclusive)"));
      }
    } else {
      req.query.offset = 0;
    }
    
    
    var query;
    
    if(req.query.q) {
      query = req.query.q;
    } else {
      query = 'place.names.name:'+req.query.s;
    }
    
    
    esClient.search({
      index: app.locals.settings.elasticsearch_index,
      q: query
    }, function (error, response) {
      if(error) {
        console.log(error);
        console.error('Error: GET /api/v0/search/places - Elasticsearch Error');
        res.status(500);
        return res.json(api.format_return(false, 500,"Internal Error"));
      } else {
        var ret = {total:response.hits.total,results:[]};
        for(x in response.hits.hits) {
          ret.results.push(response.hits.hits[x]._source);
        }
        return res.json(api.format_return(ret));
      }
    });
    

  });

};