var map,
    googleShapes = [],
    selection = {
      placeId: null,
      geoId: null
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
      "strokeColor": "#FF7800",
      "strokeOpacity": 1,
      "strokeWeight": 2,
      "fillColor": "#46461F",
      "fillOpacity": 0.25
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
  if(searchString.length > 0 && searchString !== $('#search-input').val()) {
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
  
  var searchString = $('#search-input').val();
  
  // Update the hash if the search is different
  if(searchString !== getHash()[0]){
    window.location.hash = '#' + searchString;
  }
  
  // Clear current results
  var resultsContainer = $('#search-results').html('');
  
  $.get('/api/v0/search/places', {s: searchString}).done(function(searchResults){
    
    // Display the results if there are any
    if(searchResults.data.length) {
      $.each(searchResults.data, function(i, result){
        
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
    
    callback();
  });
};

/**
 * Update DOM and get new shape to display
 */
function updateSelection(placeId, geoId){
  console.log('updateSelection');
  if(selection.placeId !== placeId || selection.geoId !== geoId){
    
    // Save selection
    selection.placeId = placeId;
    selection.geoId = geoId;
    
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
    console.log('placeId:', selection.placeId, placeId);
    console.log('geoId:', selection.geoId, geoId);
  }
};

/**
 * Get the geojson
 */
function getGeoJSON(placeId, geoId){
  
  // Get the new shape
  $.get('/api/v0/place/' + placeId + '/' + geoId).done(function(result){
    
    // Convert the geojson to a google maps object
    googleShapes = new GeoJSON(result.data, googleShapeOptions);
    
    // Handle possible conversion errors
    if(googleShapes.error) {
      console.error(googleShapes.error);
    } else {
      
      // Put single polygons into an array
      if(!$.isArray(googleShapes)) {
        googleShapes = [ googleShapes ];
      }
      
      console.log('adding ' + googleShapes.length + ' shapes');
      
      // Add the shapes to the map. 
      // Move and zoom to fit the shape.
      var bounds = new google.maps.LatLngBounds();
      $.each(googleShapes, function(i, shape){
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
  if(googleShapes.length > 0) {
    console.log('removing ' + googleShapes.length + ' shapes');
    $.each(googleShapes, function(i, shape){
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