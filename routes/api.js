module.exports = function(app){
  
  var fs = require('fs'),
      path = require('path');
  
  // get a place json file
  app.get('/api/v0/place/:id/:geo?', function(req, res){
    
    if(!req.params.geo) {
      var id = req.params.id;
      var filename = path.join(__dirname,'..','data',id.substr(0,2),id.substr(2,2),id.substr(4),'place.json');
    } else {
      var id = req.params.id;
      var geo = req.params.geo;
      var filename = path.join(__dirname,'..','data',id.substr(0,2),id.substr(2,2),id.substr(4),geo+'.geojson');
    }
    
    console.log(filename);
    
    fs.readFile(filename, function (error, data) {
      if(error) {
        //console.log(error);
        res.status(404);
        res.json({error:"not found"});
      } else {
        res.json(JSON.parse(data));
      }
    });
    
  });
  
  app.post('/api/v0/place/:id/:geo?', function(req, res){
    
    //check json object
    
    if(!req.params.geo) {
      var id = req.params.id;
      var filename = path.join(__dirname,'..','data',id.substr(0,2),id.substr(2,2),id.substr(4),'place.json');
    } else {
      var id = req.params.id;
      var geo = req.params.geo;
      var filename = path.join(__dirname,'..','data',id.substr(0,2),id.substr(2,2),id.substr(4),geo+'.geojson');
    }
    
    //move old file
    if(fs.existsSync(filename)) {
      fs.renameSync(filename,filename+'.'+Date.now());
    }
    //save new file
    fs.writeFileSync(filename,JSON.stringify(req.body));
    
    res.json({});
  });
  
};