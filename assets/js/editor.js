var map,
    searchInput,
    searchCount = 10,
    loadBar,
    state = {
      search: null,
      offset: null,
      placeId: null,
      geoId: null,
      shapes: []
    },
    mapOptions = {
      center: new google.maps.LatLng(20,-10),
      zoom: 3,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      panControl: false,
      zoomControl: true,
      zoomControlOptions: {
        style: google.maps.ZoomControlStyle.SMALL,
        position: google.maps.ControlPosition.RIGHT_BOTTOM
      },
      mapTypeControl: false,
      scaleControl: true,
      streetViewControl: false,
      overviewMapControl: false,
      styles: [
        {
          featureType: "road",
          elementType: "geometry",
          stylers: [
            { visibility: "simplified" }
          ]
        },
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [
            { visibility: "off" }
          ]
        }     
      ]
    },
    googleShapeOptions = {
      "strokeColor": "#228b22",
      "strokeOpacity": 1,
      "strokeWeight": 3,
      "fillColor": "#228b22",
      "fillOpacity": 0.3
    };
    
$(document).ready(function(){

  // Check for google api key
  if(GOOGLE_API_KEY) {
    
    // Setup the page if we can connect to the Google Maps API
    initialize();
    
  } else {   
    
    // Display helpful error message
    $('#map').html('<div class="container"><div class="alert alert-danger">You need to set the <code>OPD_GOOGLE_API_KEY</code> environment variable as explained in the installation instructions.</div></div>');   
  
  }

});

/**
 * Setup the page
 */
function initialize(){

  map = new google.maps.Map(document.getElementById("map"), mapOptions);
  
  processHashChange();
  
};

/**
 * Process the new hash
 */
function processHashChange(){
  
  // Remove the #
  var placeId = window.location.hash.slice(1);
  
  // Get the place
  

};



/**
 * Get the geojson
 */
function getGeoJSON(placeId, geoId){
  
  // Get the new shape
  $.get('/api/v0/place/' + placeId + '/' + geoId).done(function(result){
    
    // Convert the geojson to a google maps object
    var newShapes = new GeoJSON(result.data, googleShapeOptions);
    
    // Handle possible conversion errors
    if(newShapes.error) {
      console.error(newShapes.error);
    } else {
      
      // Put single polygons into an array
      if(!$.isArray(newShapes)) {
        newShapes = [ newShapes ];
      }
      
      state.shapes = newShapes;
      
      // Add the shapes to the map. 
      // Move and zoom to fit the shape.
      var bounds = new google.maps.LatLngBounds();
      $.each(newShapes, function(i, shape){
        shape.setMap(map);
        bounds.union(shape.getBounds());
      });
      map.fitBounds(bounds);
      
    }
  });
  
};

/**
 * Remove all shapes from the map
 */
function clearShapes(){
  if(state.shapes.length > 0) {
    $.each(state.shapes, function(i, shape){
      shape.setMap(null);
    });
  }
};

/**
 * Polyfill to add getBounds() method to google maps polygons
 
 * http://stackoverflow.com/a/6339384/879121
 */
google.maps.Polygon.prototype.getBounds = function() {
    var bounds = new google.maps.LatLngBounds();
    var paths = this.getPaths();
    var path;        
    for (var i = 0; i < paths.getLength(); i++) {
        path = paths.getAt(i);
        for (var ii = 0; ii < path.getLength(); ii++) {
            bounds.extend(path.getAt(ii));
        }
    }
    return bounds;
};