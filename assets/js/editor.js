var sidebar,
    shapes = [],
    selectedShape,
    map,
    drawingManager,
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
    polygonOptions = {
      "strokeColor": "#228b22",
      "strokeOpacity": 1,
      "strokeWeight": 3,
      "fillColor": "#228b22",
      "fillOpacity": 0.3
    },
    drawingControlOptions = {
      drawingMode: null,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_LEFT,
        drawingModes: [
          google.maps.drawing.OverlayType.POLYGON
        ]
      },
      polygonOptions: polygonOptions
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

  sidebar = $('#sidebar');

  map = new google.maps.Map(document.getElementById("map"), mapOptions);
  drawingManager = new google.maps.drawing.DrawingManager(drawingControlOptions);
  drawingManager.setMap(map);
  
  // Remove the # from the hash
  var placeId = window.location.hash.slice(1);
  
  if(placeId) {
    getPlace(placeId);
  } else {
    sidebar.html('<div class="alert alert-danger">No place was selected for editing. Return to the <a href="/map">search</a> page to select a place for editing.</div>');
  }
  
};

/**
 * Get a place from the API and display it's info in the sidebar
 */
function getPlace(placeId){

  $.get('/api/v0/place/' + placeId).done(function(result){
    
    var place = result.data;
    
    // Clear the sidebar
    sidebar.html('');
    
    var placeContainer = $('<div class="col-sm-12">').appendTo(sidebar);
    
    // Display the names
    placeContainer.append('<h3>Names</h3>');
    $.each(place.names, function(i, name){
      placeContainer.append('<p>' + name + '</p>');
    });
    
    // Display the GeoJSON
    placeContainer.append('<h3>Boundaries</h3>');
    var geoList = $('<div>').appendTo(placeContainer);
    $.each(place.geojson, function(i, geo){
      var editButton = $('<button type="button" class="btn btn-white btn-xs">Edit</button>')
        .click(function(){
          getGeoJSON(place.id, geo.id);
        });
      $('<div class="row geo-row">')
        .append('<div class="col-sm-4">' + geo.from + '</div>')
        .append('<div class="col-sm-4">' + geo.to + '</div>')
        .append( $('<div class="col-sm-4">').append(editButton) )
        .appendTo(geoList);
    });
    
  });

};

/**
 * Get the geojson
 */
function getGeoJSON(placeId, geoId){
  
  clearShapes();
  
  // Get the new shape
  $.get('/api/v0/place/' + placeId + '/' + geoId).done(function(result){
    
    // Convert the geojson to a google maps object
    var newShapes = new GeoJSON(result.data, polygonOptions);
    
    // Handle possible conversion errors
    if(newShapes.error) {
      console.error(newShapes.error);
    } else {
      
      // Put single polygons into an array
      if(!$.isArray(newShapes)) {
        newShapes = [ newShapes ];
      }
      
      shapes = newShapes;
      
      // Add the shapes to the map. 
      // Move and zoom to fit the shape.
      // Add event listeners for selecting shapes.
      var bounds = new google.maps.LatLngBounds();
      $.each(newShapes, function(i, shape){
        shape.setMap(map);
        bounds.union(shape.getBounds());
        google.maps.event.addListener(shape, 'click', function() {
          setSelection(shape);
        });
      });
      map.fitBounds(bounds);
      
    }
  });
  
};

/**
 * Select a shape and set it as editable
 */
function setSelection(shape){
  clearSelection();
  selectedShape = shape;
  shape.setEditable(true);
  shape.setDraggable(true);
  shape.addListener('rightclick', function(event){
    if(event.vertex != null && this.getPath().getLength() > 3){
      this.getPath().removeAt(event.vertex);
    }
  });
};

/**
 * Removes selection from the currently selected shape
 */
function clearSelection(){
  if(selectedShape) {
    selectedShape.setEditable(false);
    selectedShape.setDraggable(false);
    selectedShape = null;
  }
};

/**
 * Remove all shapes from the map
 */
function clearShapes(){
  if(shapes.length > 0) {
    $.each(shapes, function(i, shape){
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