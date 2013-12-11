var map,
    state = {
      search: null,
      page: null,
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

window.onhashchange = function(){
  console.log('hash change event');
  processHashChange();
};
    
$(document).ready(function(){

  // Check for google api key
  if(GOOGLE_API_KEY) {
    // Initialize map
    initializeMap();    
  } else {   
    // Display helpful error message
    $('#map').html('<div class="container"><div class="alert alert-danger">You need to set the <code>OPD_GOOGLE_API_KEY</code> environment variable as explained in the installation instructions.</div></div>');   
  }
  
  // Perform a search when the search button is clicked or the
  // enter key is pressed when the search input has focus
  $('#search-button').click(placeSearch);
  $('#search-input').keypress(function(e) {
    // Enter pressed
    if(e.which == 13) {
      placeSearch();
    }
  });
  
  processHashChange();

});

/**
 * Setup the map
 */
function initializeMap(){
  map = new google.maps.Map(document.getElementById("map"), mapOptions);
};

/**
 * Process the new hash
 */
function processHashChange(){
  console.log('processing hash change');
  
  // Remove the #
  var hashParts = getHash(),
      searchString = hashParts[0],
      placeId = hashParts[1],
      geoId = hashParts[2];
  
  // Initiate a search if the new hash doesn't match the current input value
  if(searchString.length > 0 && searchString !== state.search) {
  
    $('#search-input').val(searchString);
    
    placeSearch(function(){
      
      // Display selected geoJson if it's not already displayed.
      // We wait until the search returns so that we can highlight
      // the appropriate button.
      updateSelection(placeId, geoId);
      
    });
  }
  
  // If we don't initiate a new search, we still might want to change
  // selection. For example, we might still be looking at results for
  // "Virginia" but are just changing which shape is being displayed.
  else {
    updateSelection(placeId, geoId);
  }

};

/**
 * Get hash search value
 */
function getHash(){
  return window.location.hash.slice(1).split('/');
};

/**
 * Perform a place search and display results
 */
function placeSearch(callback){
  
  console.log('searching...');
  
  var searchString = state.search = $('#search-input').val();
  
  // Update the hash if the search is different
  if(searchString !== getHash()[0]){
    window.location.hash = '#' + searchString;
  }
  
  // Clear current results
  var resultsContainer = $('#search-results').html('');
  
  $.get('/api/v0/search/places', {s: searchString}).done(function(searchResults){
    
    // Display the results if there are any
    if(searchResults.data.results.length) {
      $.each(searchResults.data.results, function(i, result){
        
        var buttonList = $('<div class="panel-body">');
        $.each(result.geojson, function(i, geo){
          buttonList.append(
            $('<div class="col-sm-4 btn-col">').append(
              $('<button class="btn btn-sm btn-white">' + geo.from + '-' + geo.to + '</button>')
                .attr('id', 'btn_' + result.id + '_' + geo.id)
                .click(function(){
                  updateSelection(result.id, geo.id);
                })
            )
          );
        });
        
        var names = $('<div class="panel-heading">');
        $.each(result.names, function(i, name){
          names.append('<div class="result-name">' + name + '</div>');
        });
        
        var resultCard = $('<div class="panel panel-default">')
          .append(names)
          .append(buttonList);
          
        resultsContainer.append(resultCard);
      });
    }
    
    // Display message when there are no results
    else {
      resultsContainer.append('<div class="alert alert-info">No results match your search.</div>');
    }
    
    if(callback){
      callback();
    }
  });
};

/**
 * Update DOM and get new shape to display
 */
function updateSelection(placeId, geoId){
  console.log('updateSelection');
  if(state.placeId !== placeId || state.geoId !== geoId){
    
    // Save selection
    state.placeId = placeId;
    state.geoId = geoId;
    
    // Remove highlight from previous selection
    $('#search-results .btn-primary').addClass('btn-white').removeClass('btn-primary');
    
    clearShapes();
    
    if(placeId && geoId) {
    
      // Get shape
      getGeoJSON(placeId, geoId);
      
      // Add highlight to new selection
      $('#btn_' + placeId + '_' + geoId).addClass('btn-primary').removeClass('btn-white');
      
      // Update url hash    
      window.location.hash = '#' + getHash()[0] + '/' + placeId + '/' + geoId;
    }
  } else {
    console.log('no selection to update');
    console.log('placeId:', state.placeId, placeId);
    console.log('geoId:', state.geoId, geoId);
  }
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
      
      console.log('adding ' + newShapes.length + ' shapes');
      
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
    console.log('removing ' + state.shapes.length + ' shapes');
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