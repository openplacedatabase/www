var map,
    googleShape,
    mapOptions = {
      center: new google.maps.LatLng(54.5,-5),
      zoom: 5,
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
    $.each(searchResults.data, function(i, result){
      
      var buttonList = $('<div class="panel-body">');
      $.each(result.geojson, function(i, geo){
        buttonList.append(
          $('<button class="btn btn-sm btn-white">' + geo.from + '-' + geo.to + '</button>')
            .click(function(){
              getGeoJSON(result.id, geo.id);
            })
        );
      });
      
      var resultHtml = $('<div class="panel panel-default">')
        .append('<div class="panel-heading">' + result.names[0] + '</div>')
        .append(buttonList);
        
      resultsContainer.append(resultHtml);
    });
  });
};

/**
 * Get the geojson
 */
function getGeoJSON(placeId, geoId){
  
  // Remove a shape if there's one currently on the map
  if(googleShape) {
    googleShape.setMap(null);
  }
  
  // Get the new shape
  $.get('/api/v0/place/' + placeId + '/' + geoId).done(function(result){
    googleShape = new GeoJSON(result.data, googleShapeOptions);
    if(googleShape.error) {
      console.error(googleShape.error);
    } else {
      
      // Add shape to the map
      googleShape.setMap(map);
      
      // Move and zoom to fit the shape
      map.fitBounds(googleShape.getBounds());
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