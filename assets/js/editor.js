var NEW_GEO_CLASS = 'new-geo',

    sidebar,

    savePolygonsButton,
    editPolygonButton,
    deletePolygonButton,
    drawPolygonButton,
    
    selectedBoundaryId,
    
    editing = false,
    detailChanges = false,
    shapeChanges = true,
    
    editingPointsLimit = 3,
    
    map,
    shapes = [],
    selectedShape,
    editingLines = [],
    selectedLine,
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
    
    // Editing polygons have no border
    editingPolygonStyle = {
      "strokeWeight": 0
    },
    
    // Editing lines are thick
    editLineStyle = {
      "strokeColor": "#000000",
      "strokeWeight": 5
    },
    
    // Hover line style
    hoverLineStyle = {
      "strokeColor": "#777777",
      "strokeWeight": 5
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
  
  // Load specified place
  // placeId is set by the html template in a separate script
  getPlace(placeId);
  
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
    $('#save-place-details-button').click(savePlaceDetails).attr('disabled','disabled').text('Saved');
    
    // Delete name button
    placeContainer.on('click', '.delete-name-button', function(){
      $(this).closest('.list-group-item').remove();
      detailsChanged();
    });
    
    // New name button
    $('#new-name-button').click(function(){
      detailsChanged();
      $('#new-name-list-item').before($.Mustache.render('names-list-item', {
        from: '',
        to: '',
        name: ''
      }));
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
    
    // Delete source button
    placeContainer.on('click', '.delete-source-button', function(){
      $(this).closest('.list-group-item').remove();
      detailsChanged();
    });
    
    // New source button
    $('#new-source-button').click(function(){
      detailsChanged();
      $('#new-source-list-item').before($.Mustache.render('sources-list-item'));
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
    
    // Delete dialog button
    $('#delete-place-dialog-button').click(function(){
      $('#delete-place-dialog').modal('show');
    });
    
    // Final delete button
    $('#delete-place-button').click(deletePlace);
    
  }).fail(function(xhr, error, status){
    var error = '';
    
    // Display message saying we couldn't find the place
    if(xhr.status === 404){
      error = 'This place no longer exists.';
    }
    
    // Generic error message for all other errors
    else {
      error = 'Unable to retrieve the place: ' + status;
    }
    
    sidebar.html('<div class="alert alert-danger">' + error + '</div>');
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
      newId = lastGeo.length ? parseInt(lastGeo.data('geo-id')) + 1 : 1;
  
  // Insert new HTML
  var newGeo = $($.Mustache.render('geo-list-item', {
    from: '',
    to: '',
    id: newId
  })).insertBefore($(this).closest('.list-group-item')).addClass(NEW_GEO_CLASS);
  
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
    geojsons: [],
    sources: []
  };
  
  // names
  sidebar.find('.names-list-item').each(function(){
    var row = $(this);
    var name = {
      name: $.trim(row.find('.place-name-input').val()),
      from: $.trim(row.find('.date-from').val()),
      to: $.trim(row.find('.date-to').val())
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
  
  // sources
  sidebar.find('.place-source-input').each(function(){
    postData.sources.push($.trim($(this).val()));
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
 * Issue a query to delete the place
 */
function deletePlace(){
  $.ajax({
    url: '/api/v0/place/' + placeId,
    type: 'DELETE'
  }).done(function(){
    window.location = '/map';
  }).fail(function(){
    console.error('failed to delete the place');
  });
};

/**
 * Enable editing of the currently selected shape
 */
function enableEditing(){
  if(selectedShape){
    
    editing = true;
  
    // Split the shape into multiple lines
    selectedShape.getPaths().forEach(function(path, pathIndex){
    
      // Calculate length of each line
      var lineLength = Math.ceil(path.getLength() / Math.ceil(path.getLength() / editingPointsLimit)),
          numChunks = Math.ceil(path.getLength() / lineLength),
          lines = [];
      
      // Create new lines
      for(var i = 0; i < numChunks; i++){
        var newLinePath = [],
            start = i * lineLength,
            end = Math.min((i + 1) * lineLength, path.getLength()-1);
        for(var j = start; j <= end; j++){
          newLinePath.push(path.getAt(j));
        }
        var line = new google.maps.Polyline({ 
          path: newLinePath, 
          map: map
        });
        line.setOptions(editLineStyle);
        line.addListener('click', function(){
          setLineSelection(this);
        });
        line.addListener('mouseover', function(){
          this.setOptions(hoverLineStyle);
        });
        line.addListener('mouseout', function(){
          this.setOptions(editLineStyle);
        });
        lines.push(line);
      }
      
      // Add first point to last line
      lines[lines.length-1].getPath().push(path.getAt(0));

      // Keep track of whether a point event was fired
      // by the user or by us updating a neighbor point
      var updatingNeighbor = false;
      
      // Add event listeners after modifying the last line
      // so that they're not needlessly fired when the
      // point is added
      $.each(lines, function(i, line){
        
        // New point
        line.getPath().addListener('insert_at', function(){
          updateShapeFromLines(selectedShape, pathIndex, lines);
        });
        
        // Point removed
        line.getPath().addListener('remove_at', function(){
          updateShapeFromLines(selectedShape, pathIndex, lines);
        });
        
        // Point moved
        line.getPath().addListener('set_at', function(vertex){
          
          // When either the first or last point was moved we need
          // to move the matching point of the neighboring line.
          // Because lines may be deleted (unlikely, but possible)
          // we have to figure out the line's position and neighbors
          // at runtime.
          if((vertex === 0 || vertex === this.getLength() - 1) && !updatingNeighbor){
            var neighbor = findNeighbor(lines, line, vertex);
            updatingNeighbor = true;
            neighbor.path.setAt(neighbor.index, this.getAt(vertex));
          } 
          
          // Update underlying shape with changes only if we're moving
          // a point in the middle of the line or we're updating a neighbor
          // point after the user moved a first/last point
          else {
            updatingNeighbor = false;
            updateShapeFromLines(selectedShape, pathIndex, lines);
          }
        });
        
        // Enable polygon vertexes to be deleted.
        // Inspired by http://stackoverflow.com/a/14441786/879121
        line.addListener('rightclick', function(event){
          var vertex = event.vertex;
          
          if(vertex != null){
            
            // Remove the point
            this.getPath().removeAt(event.vertex);
            
            // If the point being removed is the first or last
            // point in the line then we need to find and move
            // the neigbor's point to match our new end point.
            if(vertex === 0 || vertex === this.getPath().getLength()){
              var neighbor = findNeighbor(lines, this, vertex),
                  newEndIndex = vertex === 0 ? 0 : this.getPath().getLength() - 1;
              neighbor.path.setAt(neighbor.index, this.getPath().getAt(newEndIndex));
            }
            
            // If there if only one point left then delete the line.
            // It's neghbors should both be overlapping the last remaining point.
            if(this.getPath().getLength() === 1){
              this.setMap(null);
              var linePos = lines.indexOf(this);
              lines.splice(linePos, 1);
            }            
            
            shapesChanged();
          }
        });
      });
      
      editingLines = editingLines.concat(lines);
    });
    
    // Remove the border on original polygon
    selectedShape.setOptions(editingPolygonStyle);
  }
  
  /**
   * Finds the neighboring path and point index for
   * updating a neighbor's matching end point.
   */
  function findNeighbor(lines, line, pointIndex){
    var numLines = lines.length,
        lineIndex = lines.indexOf(line),
        neighborLineIndex, neighborPath, neighborPointIndex;
    
    // First point in line
    if(pointIndex === 0){
      neighborLineIndex = lineIndex === 0 ? numLines - 1 : lineIndex - 1;
      neighborPath = lines[neighborLineIndex].getPath();
      neighborPointIndex = neighborPath.getLength() - 1;
    }
    
    // Last point in line
    else {
      neighborLineIndex = lineIndex === numLines - 1 ? 0 : lineIndex + 1;
      neighborPath = lines[neighborLineIndex].getPath();
      neighborPointIndex = 0;
    }
    
    return {
      path: neighborPath,
      index: neighborPointIndex
    };
  };
};

/** 
 * Called whenever lines change; updates the specified
 * path of the shape based on the lines that were
 * derived from it
 */
function updateShapeFromLines(shape, pathIndex, lines){
  var newPoints = [];
  for(var i = 0; i < lines.length; i++){
    var linePath = lines[i].getPath(),
        lineLength = linePath.getLength();
    linePath.forEach(function(point, j){
      // Don't add the last point of each line
      // because those are duplicated
      if(j !== lineLength - 1){
        newPoints.push(point);
      }
    });
  }
  shape.getPaths().setAt(pathIndex, new google.maps.MVCArray(newPoints));
  shapesChanged();
};

/**
 * Select a shape and set it as editable
 */
function setSelection(shape){
  if(!editing){
    clearSelection();
    selectedShape = shape;
    
    // Highlight selected shape
    shape.setOptions(selectedPolygonStyle);
    
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
    selectedShape.setOptions(basePolygonStyle);
    selectedShape = null;
  }
  clearLineSelection();
  clearLines();
};

/**
 * Set the line as selected
 */
function setLineSelection(line){
  clearLineSelection();
  line.setEditable(true);
  selectedLine = line;
};

/**
 * Remove the selection from the currently
 * selected line
 */
function clearLineSelection(){
  if(selectedLine){
    selectedLine.setEditable(false);
    selectedLine = null;
  }
};

/**
 * Remove all shapes from the map
 */
function clearShapes(){
  $.each(shapes, function(i, shape){
    shape.setMap(null);
  });
  shapes = [];
};

/**
 * Remove edit lines from the map
 */
function clearLines(){
  $.each(editingLines, function(i, line){
    line.setMap(null);
  });
  editingLines = [];
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