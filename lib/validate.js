var _ = require('underscore')._,
    geoAssert = require('geojson-assert'),
    check = require('validator').check;


module.exports.validPlace = validPlace;
module.exports.validGeoJSON = validGeoJSON;

function validPlace(id, obj) {
  if(!_.isObject(obj)) throw new Error("Place must be an object");
    
  // Check id
  if(_.isUndefined(obj.id)) throw new Error("id is required");
  if(obj.id !== id) throw new Error("ids must match");
  try {
    check(obj.id).isUUIDv4()
  } catch(error) {
    throw new Error("id must be a UUIDv4");
  }
  
  // Check version
  if(_.isUndefined(obj.version)) throw new Error("version is required");
  if(obj.version !== 1) throw new Error("version 1 is the only version supported right now");
  
  // Check names
  if(_.isUndefined(obj.names)) throw new Error("names is required");
  if(!_.isArray(obj.names)) throw new Error("names must be an array");
  for(var x in obj.names) {
    var elem = obj.names[x];
    
    if(!_.isObject(elem)) throw new Error("name must be an array of objects");
    if(Object.keys(elem).length != 3) throw new Error("in a name element, only from, to, and name are allowed");
    
    if(_.isUndefined(elem.from)) throw new Error("in a name element, from is required");
    if(!checkDate(elem.from)) throw new Error("in a name element, from must be of the format yyyy-mm-dd");
    
    if(_.isUndefined(elem.to)) throw new Error("in a name element, to is required");
    if(!checkDate(elem.to)) throw new Error("in a name element, to must be of the format yyyy-mm-dd");
    
    if(_.isUndefined(elem.name)) throw new Error("in a name element, name is required");
    if(!_.isString(elem.name)) throw new Error("in a name element, name must be a string");
  }
  
  // Check sources
  if(_.isUndefined(obj.sources)) throw new Error("sources is required");
  if(!_.isArray(obj.sources)) throw new Error("sources must be an array");
  for(var x in obj.sources) {
    if(!_.isString(obj.sources[x])) throw new Error("sources must be an array of string");
  }
  
  // Check geojson
  var geojsonsToCheck = [];
  
  if(_.isUndefined(obj.geojsons)) throw new Error("geojson is required");
  if(!_.isArray(obj.geojsons)) throw new Error("geojson must be an array");
  for(var x in obj.geojsons) {
    var elem = obj.geojsons[x];
    
    if(!_.isObject(elem)) throw new Error("geojson must be an array of objects");
    if(Object.keys(elem).length != 3) throw new Error("in a geojson element, only from, to, and id are allowed");
    
    if(_.isUndefined(elem.from)) throw new Error("in a geojson element, from is required");
    if(!checkDate(elem.from)) throw new Error("in a geojson element, from must be of the format yyyy-mm-dd");
    
    if(_.isUndefined(elem.to)) throw new Error("in a geojson element, to is required");
    if(!checkDate(elem.to)) throw new Error("in a geojson element, to must be of the format yyyy-mm-dd");
    
    if(_.isUndefined(elem.id)) throw new Error("in a geojson element, id is required");
    if(!_.isString(elem.id)) throw new Error("in a geojson element, id must be a string");
    
    geojsonsToCheck.push(elem.id);
  }
  
  // Check last_edited_by
  if(_.isUndefined(obj.last_edited_by)) throw new Error("System error setting last_edited_by");
  if(!_.isString(obj.last_edited_by)) throw new Error("System error setting last_edited_by - must be a string");
  
  // Check last_edited_time
  if(_.isUndefined(obj.last_edited_time)) throw new Error("System error setting last_edited_time");
  if(!_.isNumber(obj.last_edited_time) || _.isNaN(obj.last_edited_time)) throw new Error("System error setting last_edited_time - must be an integer");
  
  // Make sure there are no more than 7 elements in the object
  if(Object.keys(obj).length != 7) throw new Error("only id, version, names, sources, and geojsons are allowed"); 
    
}

function validGeoJSON(obj) {
  geoAssert(obj);
}


/**
 * Returns true only if there is no overlap in the year range for the geojsons
 */
function checkGeojsonOverlap() {
  // TODO
  return true;
}

/**
 * Returns true only if the date is valid according to version 1
 */
function checkDate(date) {
  return /\d{1,4}-\d{2}-\d{2}/.test(date);
}