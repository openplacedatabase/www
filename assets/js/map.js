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

window.onhashchange = function(){
  processHashChange();
};
    
$(document).ready(function(){

  searchInput = $('#search-input');
  loadBar = $('#load-bar');

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
  
  $('#search-button').click(function(){
    placeSearch(searchInput.val(), 0, false);
  });
  
  searchInput.keypress(function(e) {
    // Enter pressed
    if(e.which == 13) {
      placeSearch(searchInput.val(), 0, false);
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
  
  // Remove the #
  var hashParts = getHash(),
      searchString = hashParts[0],
      placeId = hashParts[1],
      geoId = hashParts[2];
  
  // Initiate a search if the new hash doesn't match the current input value
  if(searchString.length > 0 && searchString !== state.search) {
  
    searchInput.val(searchString);
    
    placeSearch(searchString, 0, false, function(){
      
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
function placeSearch(searchString, searchOffset, infiniteScroll, callback){
  
  state.search = searchString;
  
  // Update the hash if the search is different
  if(searchString !== getHash()[0]){
    window.location.hash = '#' + searchString;
  }
  
  var resultsContainer = $('#search-results');
  
  // Remove previous infinite scroll handlers
  resultsContainer.off('scroll')
  
  // Clear current results if we're doing a new search
  if(!infiniteScroll){
    resultsContainer.html('');
  }
  
  // Show loading bar
  var width = 30;
  loadBar.width(width + '%');
  var loading = setInterval(function(){
    loadBar.width((++width) % 100 + '%');
  }, 10);
  
  $.get('/api/v0/search/places', {
    s: searchString,
    count: searchCount,
    offset: searchOffset
  }).done(function(response){
    
    // Finish loading bar by stretching to end
    // and fading out.
    clearInterval(loading);
    loadBar.width('100%');
    setTimeout(function(){
      loadBar.width('0%');
    }, 500);
    
    // Display the results if there are any
    if(response.data.results.length) {
      $.each(response.data.results, function(i, result){
        
        var buttonList = $('<div class="panel-body">');
        $.each(result.geojson, function(i, geo){
          buttonList.append(
            $('<div class="col-sm-4 btn-col">').append(
              $('<button class="btn btn-sm btn-white">' + geo.from.substr(0,4) + '-' + geo.to.substr(0,4) + '</button>')
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
        names.append('<a class="pull-right text-muted" href="/editor#' + result.id + '">edit</a>')
        
        var resultCard = $('<div class="panel panel-default">')
          .append(names)
          .append(buttonList);
          
        resultsContainer.append(resultCard);
      });
      
      // Enable infinite scrolling if there's more data
      if(response.data.total > searchOffset + searchCount){
        
        resultsContainer.scroll(function(){
        
          // Check to see if we've scrolled to the bottom
          if($(this)[0].scrollHeight - $(this).scrollTop() == $(this).outerHeight()){
          
            // Get next page of results
            placeSearch(searchString, searchOffset + searchCount, true);
          }
        });
        
      }
      
      // We're at the end
      else {
        resultsContainer.append('<p class="text-muted text-center">End of results.</p>');
      }
    }
    
    // Display message when there are no results
    else if(!infiniteScroll) {
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
      window.location.hash = '#' + state.search + '/' + state.placeId + '/' + state.geoId;
    }
  }
};

/**
 * Get the geojson
 */
function getGeoJSON(placeId, geoId){
  
  // Get the new shape
  $.get('/api/v0/place/' + placeId + '/' + geoId).done(function(result){
    
    // Convert the geojson to a google maps object
    var newShapes = google.maps.geojson.from(result.data, googleShapeOptions);
    
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