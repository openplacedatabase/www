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
  var mapOptions = {
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
  };
  var map = new google.maps.Map(document.getElementById("map"), mapOptions);
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
  console.log('Getting geojson', placeId, geoId);
};