var map,
    googleShapes = [],
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
      overviewMapControl: false
    },
    googleShapeOptions = {
      "strokeColor": "#FF7800",
      "strokeOpacity": 1,
      "strokeWeight": 2,
      "fillColor": "#46461F",
      "fillOpacity": 0.25
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

});

/**
 * Setup the map
 */
function initializeMap(){
  map = new google.maps.Map(document.getElementById("map"), mapOptions);
};

/**
 * Perform a place search and display results
 */
function placeSearch(){
  var resultsContainer = $('#search-results').html('');
  $.get('/api/v0/search/places', {s: $('#search-input').val()}).done(function(searchResults){
    
    // Display the results if there are any
    if(searchResults.data.length) {
      $.each(searchResults.data, function(i, result){
        
        var buttonList = $('<div class="panel-body">');
        $.each(result.geojson, function(i, geo){
          buttonList.append(
            $('<div class="col-sm-4 btn-col">').append(
              $('<button class="btn btn-sm btn-white">' + geo.from + '-' + geo.to + '</button>')
                .click(function(){
                  $('.btn-primary', resultsContainer).addClass('btn-white').removeClass('btn-primary');
                  $(this).addClass('btn-primary').removeClass('btn-white');
                  getGeoJSON(result.id, geo.id);
                  
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
  });
};

/**
 * Get the geojson
 */
function getGeoJSON(placeId, geoId){
  
  // Remove the shapes if there are some currently on the map
  if(googleShapes.length > 0) {
    $.each(googleShapes, function(i, shape){
      shape.setMap(null);
    });
  }
  
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