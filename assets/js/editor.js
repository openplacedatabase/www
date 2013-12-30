var NEW_GEO_CLASS = 'new-geo',

    sidebar,

    savePolygonsButton,
    editPolygonButton,
    deletePolygonButton,
    drawPolygonButton,
    
    placeId,
    selectedBoundaryId,
    
    editing = false,
    detailChanges = false,
    shapeChanges = true,
    
    map,
    shapes = [],
    selectedShape,
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
  placeId = window.location.hash.slice(1);
  
  // Load specified place
  if(placeId) {
    getPlace(placeId);
  } else {
    sidebar.html('<div class="alert alert-danger">No place was selected for editing. Return to the <a href="/map">search</a> page to select a place for editing.</div>');
  }
  
  //
  // Setup custom map controls
  //
  
  savePolygonsButton = $('#map-save-polygons-button').click(function(){
    saveShapes();
  });

  editPolygonButton = $('#map-edit-polygon-button').click(function(){
    enableEditing();
  });
  
  deletePolygonButton = $('#map-delete-polygon-button').click(deleteSelectedShape);
  
  drawPolygonButton = $('#map-draw-polygon-button').click(function(){
    clearSelection();
    disableShapeOperationButtons();
    drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
  });
  
  // Can't interact with the map until a boundary is chosen
  disableMapButtons();
  
  // When new shapes are drawn, save them and allow them to be selected  
  google.maps.event.addListener(drawingManager, 'overlaycomplete', function(e) {   
    drawingManager.setDrawingMode(null);
    var newShape = e.overlay;     
    shapes.push(newShape);
    shapesChanged();
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
    
    // Display the place details
    placeContainer.mustache('place-details', place);
    
    //
    // Setup event handlers
    //
    
    // Catch changes to input values
    placeContainer.on('change', 'input', function(){
      detailsChanged();
    });
    
    // Save button
    $('#save-place-details-button').click(savePlaceDetails);
    
    // Delete name button
    placeContainer.on('click', '.delete-name-button', function(){
      $(this).closest('.list-group-item').remove();
      detailsChanged();
    });
    
    // New name button
    $('#new-name-button').click(function(){
      detailsChanged();
      $('#new-name-list-item').before($.Mustache.render('names-list-item'));
    });
    
    // View boundary button
    placeContainer.on('click', '.view-boundary-button', function(){
      var geo = $(this).closest('.geo-list-item');
      selectBoundary(place.id, geo.data('geo-id'), geo.hasClass(NEW_GEO_CLASS));
    });
    
    // New geo button
    $('#new-geo-button').click(addNewBoundary);
    
    // Delete geo button
    placeContainer.on('click', '.delete-geo-button', function(){
      $(this).closest('.list-group-item').remove();
      detailsChanged();
    });
    
    // Download geojson button
    placeContainer.on('click', '.download-geojson-button', function(){
      var geoId = $(this).closest('.geo-list-item').data('geo-id');
      window.open('/api/v0/place/' + placeId + '/' + geoId, '_blank');
    });
    
    // Upload geojson button
    placeContainer.on('click', '.upload-geojson-button', function(){
      $('#upload-geojson-modal').modal('show');
      var geoId = $(this).closest('.geo-list-item').data('geo-id');
      $('#upload-geo-id').val(geoId);
    });
    
    // Select a file for upload
    $('#upload-file').change(selectUploadFile);
    
    // Finalize upload
    $('#upload-save-button').click(uploadGeojson);
    
  });

};

/**
 * Fetch shapes for selected boundary and update app state
 */
function selectBoundary(placeId, geoId, newGeo){
  selectedBoundaryId = geoId;
  savePolygonsButton.attr('disabled','disabled');
  clearShapes();
  if(!newGeo){
    getGeoJSON(placeId, geoId);
  } else {
    enableDrawingModeButtons();
  }
};

/**
 * Get the geojson
 */
function getGeoJSON(placeId, geoId){
  
  // Get the new shape
  $.get('/api/v0/place/' + placeId + '/' + geoId).done(function(result){
    
    // Convert the geojson to a google maps object
    var newShapes = google.maps.geojson.from(result.data, basePolygonStyle);
    
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

      enableDrawingModeButtons();
    }
  });
  
};

/**
 * Gets called when the user selects a file for uploading
 */
function selectUploadFile(event){
  console.log(event.target.files);
  
  var reader = new FileReader();
  reader.onload = function(e){
    console.log('reader onload');
    $('#upload-text').val(JSON.stringify(JSON.parse(e.target.result), null, 2));
  };
  reader.onerror = function(e){
    console.error('reader error');
    console.error(e);
  };
  reader.readAsText(event.target.files[0]);
};

/**
 * Save the geojson
 */
function uploadGeojson(){
  $('#upload-save-button').attr('disabled','disabled').text('Uploading...');
  var geoId = $('#upload-geo-id').val();
  saveGeojson(geoId, JSON.parse($('#upload-text').val())).done(function(){
    $('#upload-geojson-modal').modal('hide');
    $('#upload-save-button').removeAttr('disabled').text('Upload');
    $('#geo-' + geoId).find('.download-geojson-button').removeAttr('disabled');
  });
};

/**
 * Add a new boundary item to the list
 */
function addNewBoundary(){
  // Update state to reflect changes
  detailsChanged();
  
  // Set the id of the new boundary to one greater
  // than the last boundary in the list
  var lastGeo = $('#new-geo-list-item').prev(),
      newId = parseInt(lastGeo.data('geo-id')) + 1;
  
  // Insert new HTML
  var newGeo = $($.Mustache.render('geo-list-item', {
    from: '',
    to: '',
    id: newId
  })).insertAfter(lastGeo).addClass(NEW_GEO_CLASS);
  
  // Disable download geo-json until the shapes have been saved
  newGeo.find('.download-geojson-button').attr('disabled','disabled');
}

/**
 * Save place details
 */
function savePlaceDetails(){
  $('#save-place-details-button').attr('disabled','disabled').text('Saving...');
  
  // Gather data
  var postData = {
    id: placeId,
    version: 1,
    names: [],
    geojsons: []
  };
  
  // names
  sidebar.find('.names-list-item').each(function(){
    var row = $(this);
    var name = {
      name: row.find('.place-name-input').val(),
      from: row.find('.date-from').val(),
      to: row.find('.date-to').val()
    };
    if(name.name){
      postData.names.push(name);
    }
  });
  
  // geojson
  var minDate, minDateString, maxDate, maxDateString;
  
  sidebar.find('.geo-list-item .date-row').each(function(i){
    
    var fromDateString = $.trim($(this).find('.date-from').val()),
        toDateString = $.trim($(this).find('.date-to').val());
    
    if(fromDateString && toDateString){
    
      var fromDate = createComplexDate(fromDateString),
          toDate = createComplexDate(toDateString);

      // Set min and max on first traversal
      if(i === 0){
        minDate = fromDate;
        minDateString = fromDateString;
        maxDate = toDate;
        maxDateString = toDateString;
      }
      
      // Update max/min dates
      else {
        if(fromDate < minDate){
          minDate = fromDate;
          minDateString = fromDateString;
        }
        if(toDate > maxDate){
          maxDate = toDate;
          maxDateString = toDateString;
        }
      }
      
      // Push geojson
      postData.geojsons.push({
        from: fromDateString,
        to: toDateString,
        id: i+1+''
      });
      
    }
    
  });
  
  console.log(postData);
  
  // Ajax POST
  $.ajax('/api/v0/place/' + placeId, {
    contentType: 'application/json',
    data: JSON.stringify(postData),
    type: 'POST'
  }).done(function(){
    detailsSaved();
  }).fail(function(){
    console.error('Save failed');
  });
  
}

/**
 * Save the current state of the map
 */
function saveShapes(){

  savePolygonsButton.attr('disabled','disabled');
  
  if(shapes.length > 0){
  
    $('#geo-' + selectedBoundaryId)
      .removeClass(NEW_GEO_CLASS)
      .find('.download-geojson-button').removeAttr('disabled');
    
    // Convert google shapes into GeoJSON
    var geojson = google.maps.geojson.to(shapes);
    
    saveGeojson(selectedBoundaryId, geojson).done(function(){
      shapesSaved();
    }).fail(function(){
      console.error('Save failed');
    });
  
  }
};

/**
 * Save geojson
 */
function saveGeojson(geoId, geojson){
  return $.ajax('/api/v0/place/' + placeId + '/' + geoId, {
    contentType: 'application/json',
    data: JSON.stringify(geojson),
    type: 'POST'
  });
};

/**
 * Update state to reflect unsaved changes to the shapes on the map
 */
function shapesChanged(){
  shapeChanges = true;
  savePolygonsButton.removeAttr('disabled');
};

/**
 * Update state to reflect that changes to the shapes have been saved
 */
function shapesSaved(){
  console.log('shapes saved');
};

/**
 * Update state to reflect unsaved changes in place details
 */
function detailsChanged(){
  detailChanges = true;
  
  // Display and update 'save' button
  $('#save-place-details-button').css('visibility', 'visible').text('Save').removeAttr('disabled');
};

/**
 * Update state to reflect that place detail changes have been saved
 */
function detailsSaved(){
  detailChanges = false;
  $('#save-place-details-button').text('Saved').attr('disabled','disabled');
};

/**
 * Enable editing of the currently selected shape
 */
function enableEditing(){
  if(selectedShape){
  
    // Make sure the selected shape has no more than 1000 points
    var numPoints = 0;
    selectedShape.getPaths().forEach(function(path){
      numPoints += path.getLength();
    });
    if(numPoints > 1000){
      // Display error
      var alert = $('<div class="map-message alert alert-danger">Cannot edit a shape with more than 1,000 points.</div>').appendTo('#map');
      setTimeout(function(){ alert.fadeOut(function(){alert.remove();}); }, 3000);
      return;
    }
  
    editing = true;
    selectedShape.setEditable(true);
    
    // Listen for changes to the points
    selectedShape.getPaths().forEach(function(path, index){
      google.maps.event.addListener(path, 'insert_at', function(){
        shapesChanged();
      });
      google.maps.event.addListener(path, 'remove_at', function(){
        shapesChanged();
      });
      google.maps.event.addListener(path, 'set_at', function(){
        shapesChanged();
      });
    });
    
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
        shapesChanged();
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
    
    // Listen for changes to the shape
    selectedShape.addListener('dragend', function(){
      shapesChanged();
    });
    
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
    shapes = [];
  }
};

/**
 * Delete the selected shape and reset map mode
 */
function deleteSelectedShape(){
  // Remove the shape from the map
  selectedShape.setMap(null);
  
  // Remove shape from shapes array
  for(var i = 0; i < shapes.length; i++){
    if(shapes[i] === selectedShape){
      shapes.splice(i,1);
      break;
    }
  }
  
  // Update state
  clearSelection();
  shapesChanged();
  disableShapeOperationButtons();
  enableDrawingModeButtons();
};

/**
 * Disable all buttons on the map
 */
function disableMapButtons(){
  savePolygonsButton.attr('disabled','disabled');
  disableShapeOperationButtons();
  disableDrawingModeButtons();
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
 * Generate javascript from string of format '-yyyy-mm-dd'
 * by converting it to a string of format '-yyyyyy-mm-dd'
 * to correctly handle all BC and AD dates
 */
function createComplexDate(simpleDateString){
  var simpleParts = getDateParts(simpleDateString),
      simpleYear = simpleParts[0],
      simpleYearParts = simpleYear.match(/(-)?(\d{1,4})/),
      complexSign = simpleYearParts[1] === '-' ? '-' : '+',
      complexYear = complexSign + padLeftNumString(simpleYearParts[2], 6);     
  return new Date(complexYear + '-' + simpleParts[1] + '-' + simpleParts[2]);
};

/**
 * http://stackoverflow.com/a/2998822/879121
 */
function padLeftNumString(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
};

/**
 * Splits a string of format '-yyyy-mm-dd' into 
 * ['-yyyy', 'mm', 'dd']
 */
function getDateParts(dateString){
  return dateString.match(/(-?\d{1,4})-(\d{2})-(\d{2})/).slice(1);
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