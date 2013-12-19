var sidebar,
    editPolygonButton,
    deletePolygonButton,
    drawPolygonButton,
    shapes = [],
    selectedShape,
    editing = false,
    map,
    drawingManager,
    
    // Options that control the display of the Google Map
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
    
    // Non-selected polygons are green
    basePolygonStyle = {
      "strokeColor": "#228b22",
      "strokeOpacity": 1,
      "strokeWeight": 3,
      "fillColor": "#228b22",
      "fillOpacity": 0.3
    },
    
    // Selected polygons are orange
    selectedPolygonStyle = {
      "strokeColor": "#FE8C00",
      "strokeOpacity": 1,
      "strokeWeight": 3,
      "fillColor": "#FE8C00",
      "fillOpacity": 0.3
    },
    
    // Options for the Google Maps Drawing Manager
    drawingControlOptions = {
      
      // Map is not in drawing mode when it loads
      drawingMode: null,
      
      // Don't use Google's controls; we will be using custom buttons
      drawingControl: false,
      
      // Only enable drawing polygons
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_LEFT,
        drawingModes: [
          google.maps.drawing.OverlayType.POLYGON
        ]
      },
      
      // Style of newly drawn polygons
      polygonOptions: basePolygonStyle
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
  
  // Load our templates
  $.Mustache.addFromDom()

  // Setup Google Maps objects
  map = new google.maps.Map(document.getElementById("map"), mapOptions);
  drawingManager = new google.maps.drawing.DrawingManager(drawingControlOptions);
  drawingManager.setMap(map);
  
  // Remove the # from the url hash
  var placeId = window.location.hash.slice(1);
  
  // Load specified place
  if(placeId) {
    getPlace(placeId);
  } else {
    sidebar.html('<div class="alert alert-danger">No place was selected for editing. Return to the <a href="/map">search</a> page to select a place for editing.</div>');
  }
  
  //
  // Setup custom map controls
  //

  editPolygonButton = $('#map-edit-polygon-button').click(function(){
    enableEditing();
  });
  
  deletePolygonButton = $('#map-delete-polygon-button').click(deleteSelectedShape);
  
  drawPolygonButton = $('#map-draw-polygon-button').click(function(){
    clearSelection();
    disableShapeOperationButtons();
    drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
  });
  
  disableShapeOperationButtons();
  enableDrawingModeButtons();
  
  // When new shapes are drawn, save them and allow them to be selected  
  google.maps.event.addListener(drawingManager, 'overlaycomplete', function(e) {   
    drawingManager.setDrawingMode(null);
    var newShape = e.overlay;     
    shapes.push(newShape);    
    google.maps.event.addListener(newShape, 'click', function() {
      setSelection(newShape);
    });
  });
  
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
    placeContainer.mustache('names-list', place);
    
    // Display the GeoJSON
    placeContainer.mustache('geo-list', place);
    
    //
    // Setup event handlers
    //
    
    // Edit boundary button click
    placeContainer.on('click', '.edit-geo-button', function(){
      getGeoJSON(place.id, $(this).data('geo-id'));
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
    var newShapes = new GeoJSON(result.data, basePolygonStyle);
    
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
 * Enable editing of the currently selected shape
 */
function enableEditing(){
  if(selectedShape){
    editing = true;
    selectedShape.setEditable(true);
    
    // Enable polygon vertexes to be deleted.
    // Inspired by http://stackoverflow.com/a/14441786/879121
    selectedShape.addListener('rightclick', function(event){
      if(event.path != null && event.vertex != null){
        var path = this.getPaths().getAt(event.path);
        if(path.getLength() > 3){
          path.removeAt(event.vertex);
        } else {
          this.getPaths().removeAt(event.path);
        }
      }
    });
  }
};

/**
 * Select a shape and set it as editable
 */
function setSelection(shape){
  if(!editing){
    clearSelection();
    selectedShape = shape;
    
    // Highlight selected shape and make it draggable
    shape.setOptions(selectedPolygonStyle);
    shape.setDraggable(true);
    
    enableShapeOperationButtons();
    disableDrawingModeButtons();
    
    // Clear the selection when the user clicks on the map
    addMapClickListener(function(){
      clearSelection();
      disableShapeOperationButtons();
      enableDrawingModeButtons();
    });
  }
};

/**
 * Removes selection from the currently selected shape
 */
function clearSelection(){
  editing = false;
  if(selectedShape) {
    selectedShape.setEditable(false);
    selectedShape.setDraggable(false);
    selectedShape.setOptions(basePolygonStyle);
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
 * Delete the selected shape and reset map mode
 */
function deleteSelectedShape(){
  selectedShape.setMap(null);
  clearSelection();
  disableShapeOperationButtons();
  enableDrawingModeButtons();
};

/**
 * Enable buttons which operate on the selected shape
 */
function enableShapeOperationButtons(){
  if(selectedShape){
    editPolygonButton.removeAttr('disabled');
    deletePolygonButton.removeAttr('disabled');
  } else {
    console.error('Cannot enable shapes operation buttons when a shape is not selected');
  }
};

/**
 * Disable shape operation buttons
 */
function disableShapeOperationButtons(){
  editPolygonButton.attr('disabled','disabled');
  deletePolygonButton.attr('disabled','disabled');
};

/**
 * Enable drawing mode buttons
 */
function enableDrawingModeButtons(){
  drawPolygonButton.removeAttr('disabled');
};

/** 
 * Disable drawing mode buttons
 */
function disableDrawingModeButtons(){
  drawPolygonButton.attr('disabled','disabled');
};

function addMapClickListener(listener){
  removeMapClickListeners();
  google.maps.event.addListener(map, 'click', listener);
};

/**
 * Remove all click listeners from map
 */
function removeMapClickListeners(){
  google.maps.event.clearListeners(map, 'click');
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