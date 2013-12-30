/**
 * Converts GeoJSON into Google Maps overlays (shapes)
 */

(function(){

  if(typeof google.maps.geojson === 'undefined') {
    google.maps.geojson = {};
  }

  google.maps.geojson.from = function( geojson, options ){

    var obj;
    
    var opts = options || {};
    
    switch ( geojson.type ){
    
      case "FeatureCollection":
        if (!geojson.features){
          obj = _error("Invalid GeoJSON object: FeatureCollection object missing \"features\" member.");
        }else{
          obj = [];
          for (var i = 0; i < geojson.features.length; i++){
            obj.push(_geometryToGoogleMaps(geojson.features[i].geometry, opts, geojson.features[i].properties));
          }
        }
        break;
      
      case "GeometryCollection":
        if (!geojson.geometries){
          obj = _error("Invalid GeoJSON object: GeometryCollection object missing \"geometries\" member.");
        }else{
          obj = [];
          for (var i = 0; i < geojson.geometries.length; i++){
            obj.push(_geometryToGoogleMaps(geojson.geometries[i], opts));
          }
        }
        break;
      
      case "Feature":
        if (!( geojson.properties && geojson.geometry )){
          obj = _error("Invalid GeoJSON object: Feature object missing \"properties\" or \"geometry\" member.");
        }else{
          obj = _geometryToGoogleMaps(geojson.geometry, opts, geojson.properties);
        }
        break;
      
      case "Point": case "MultiPoint": case "LineString": case "MultiLineString": case "Polygon": case "MultiPolygon":
        obj = geojson.coordinates
          ? obj = _geometryToGoogleMaps(geojson, opts)
          : _error("Invalid GeoJSON object: Geometry object missing \"coordinates\" member.");
        break;
      
      default:
        obj = _error("Invalid GeoJSON object: GeoJSON object must be one of \"Point\", \"LineString\", \"Polygon\", \"MultiPolygon\", \"Feature\", \"FeatureCollection\" or \"GeometryCollection\".");
    
    }
    
    return obj;
    
  };
  
  /**
   * This function converts one GeoJSON geometry to a google maps object
   * or array of google maps objects
   */
  var _geometryToGoogleMaps = function( geojsonGeometry, options, geojsonProperties ){
    
    var googleObj, opts = _copy(options);
    
    switch ( geojsonGeometry.type ){
      case "Point":
        opts.position = new google.maps.LatLng(geojsonGeometry.coordinates[1], geojsonGeometry.coordinates[0]);
        googleObj = new google.maps.Marker(opts);
        if (geojsonProperties) {
          googleObj.set("geojsonProperties", geojsonProperties);
        }
        break;
        
      case "MultiPoint":
        googleObj = [];
        for (var i = 0; i < geojsonGeometry.coordinates.length; i++){
          opts.position = new google.maps.LatLng(geojsonGeometry.coordinates[i][1], geojsonGeometry.coordinates[i][0]);
          googleObj.push(new google.maps.Marker(opts));
        }
        if (geojsonProperties) {
          for (var k = 0; k < googleObj.length; k++){
            googleObj[k].set("geojsonProperties", geojsonProperties);
          }
        }
        break;
        
      case "LineString":
        var path = [];
        for (var i = 0; i < geojsonGeometry.coordinates.length; i++){
          var coord = geojsonGeometry.coordinates[i];
          var ll = new google.maps.LatLng(coord[1], coord[0]);
          path.push(ll);
        }
        opts.path = path;
        googleObj = new google.maps.Polyline(opts);
        if (geojsonProperties) {
          googleObj.set("geojsonProperties", geojsonProperties);
        }
        break;
        
      case "MultiLineString":
        googleObj = [];
        for (var i = 0; i < geojsonGeometry.coordinates.length; i++){
          var path = [];
          for (var j = 0; j < geojsonGeometry.coordinates[i].length; j++){
            var coord = geojsonGeometry.coordinates[i][j];
            var ll = new google.maps.LatLng(coord[1], coord[0]);
            path.push(ll);
          }
          opts.path = path;
          googleObj.push(new google.maps.Polyline(opts));
        }
        if (geojsonProperties) {
          for (var k = 0; k < googleObj.length; k++){
            googleObj[k].set("geojsonProperties", geojsonProperties);
          }
        }
        break;
        
      case "Polygon":
        var paths = [];
        var exteriorDirection;
        var interiorDirection;
        for (var i = 0; i < geojsonGeometry.coordinates.length; i++){
          // GeoJSON spec demands that the last point in a polygon ring matches the first point
          var firstPoint = geojsonGeometry.coordinates[i][0],
              lastPoint = geojsonGeometry.coordinates[i][geojsonGeometry.coordinates[i].length-1];
          if(firstPoint[0] !== lastPoint[0] && firstPoint[1] !== lastPoint[1]){
            googleObj = _error("First and last points of polygon ring " + (i + 1) + " do not match");
            break;
          }
          var path = [];
          for (var j = 0; j < geojsonGeometry.coordinates[i].length-1; j++){
            var ll = new google.maps.LatLng(geojsonGeometry.coordinates[i][j][1], geojsonGeometry.coordinates[i][j][0]);
            path.push(ll);
          }
          if(!i){
            exteriorDirection = _ccw(path);
            paths.push(path);
          }else if(i == 1){
            interiorDirection = _ccw(path);
            if(exteriorDirection == interiorDirection){
              paths.push(path.reverse());
            }else{
              paths.push(path);
            }
          }else{
            if(exteriorDirection == interiorDirection){
              paths.push(path.reverse());
            }else{
              paths.push(path);
            }
          }
        }
        opts.paths = paths;
        googleObj = new google.maps.Polygon(opts);
        if (geojsonProperties) {
          googleObj.set("geojsonProperties", geojsonProperties);
        }
        break;
        
      case "MultiPolygon":
        googleObj = [];
        for (var i = 0; i < geojsonGeometry.coordinates.length; i++){
          var paths = [];
          var exteriorDirection;
          var interiorDirection;
          for (var j = 0; j < geojsonGeometry.coordinates[i].length; j++){
            // GeoJSON spec demands that the last point in a polygon ring matches the first point
            var firstPoint = geojsonGeometry.coordinates[i][j][0],
                lastPoint = geojsonGeometry.coordinates[i][j][geojsonGeometry.coordinates[i][j].length-1];
            if(firstPoint[0] !== lastPoint[0] && firstPoint[1] !== lastPoint[1]){
              googleObj = _error("First and last points of multipolygon ring " + (j+1) + " in polygon " + (i+1) + " do not match");
              break;
            }
            var path = [];
            for (var k = 0; k < geojsonGeometry.coordinates[i][j].length-1; k++){
              var ll = new google.maps.LatLng(geojsonGeometry.coordinates[i][j][k][1], geojsonGeometry.coordinates[i][j][k][0]);
              path.push(ll);
            }
            if(!j){
              exteriorDirection = _ccw(path);
              paths.push(path);
            }else if(j == 1){
              interiorDirection = _ccw(path);
              if(exteriorDirection == interiorDirection){
                paths.push(path.reverse());
              }else{
                paths.push(path);
              }
            }else{
              if(exteriorDirection == interiorDirection){
                paths.push(path.reverse());
              }else{
                paths.push(path);
              }
            }
          }
          opts.paths = paths;
          googleObj.push(new google.maps.Polygon(opts));
        }
        if (geojsonProperties) {
          for (var k = 0; k < googleObj.length; k++){
            googleObj[k].set("geojsonProperties", geojsonProperties);
          }
        }
        break;
        
      case "GeometryCollection":
        googleObj = [];
        if (!geojsonGeometry.geometries){
          googleObj = _error("Invalid GeoJSON object: GeometryCollection object missing \"geometries\" member.");
        }else{
          for (var i = 0; i < geojsonGeometry.geometries.length; i++){
            googleObj.push(_geometryToGoogleMaps(geojsonGeometry.geometries[i], opts, geojsonProperties || null));
          }
        }
        break;
        
      default:
        googleObj = _error("Invalid GeoJSON object: Geometry object must be one of \"Point\", \"LineString\", \"Polygon\" or \"MultiPolygon\".");
    }
    
    return googleObj;
    
  };
  
  /**
   * Formats an error object
   */
  var _error = function( message ){
  
    return {
      type: "Error",
      message: message
    };
  
  };
  
  /**
   * Determines whether a given path is counterclockwise
   */
  var _ccw = function( path ){
    var isCCW;
    var a = 0;
    for (var i = 0; i < path.length-2; i++){
      a += ((path[i+1].lat() - path[i].lat()) * (path[i+2].lng() - path[i].lng()) - (path[i+2].lat() - path[i].lat()) * (path[i+1].lng() - path[i].lng()));
    }
    if(a > 0){
      isCCW = true;
    }
    else{
      isCCW = false;
    }
    return isCCW;
  };
  
  /**
   * Returns a non-recursive copy of the given object
   */
  var _copy = function(obj){
    var newObj = {};
    for(var i in obj){
      if(obj.hasOwnProperty(i)){
        newObj[i] = obj[i];
      }
    }
    return newObj;
  };

}());