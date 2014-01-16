#API documentation



##GET /api/v0/search/places?{q, s, count, offset}
Search for places.

###Parameters
* `s` - A string to query on. Not that this will search on the field `place.names.name`
* `q` - An elasticsearch Query String. See the [schema](https://github.com/openplacedatabase/www/blob/master/SCHEMA.md) for fields.
* `count` - The number of records you want returned (*Default* 10). A number between 1 and 100 inclusive
* `offset` - The offset for pagination (*Default* 0). A number greater than 0.

###Examples

**Search for "England"**
Get /api/v0/search/places?s=England
> Content-Type: application/json

Response `200`
> [JSON](api_examples/search-england-200.json)

**Search for "England" but use an invalid count**
Get /api/v0/search/places?count=1000&s=England
> Content-Type: application/json

Response `400`
> [JSON](api_examples/search-england-400.json)



##GET /api/v0/places/{id}
Get a place or a geojson associated with a place. 
The geojson's id is the place id and then the geojson id. {place-id}/{geojson-id}.

###Examples

**Get Derbyshire**
Get /api/v0/places/8fbe18e1-5d04-4b82-a0e9-1c386ed00de7
> Content-Type: application/json

Response `200`
> [JSON](api_examples/get-derbyshire-place.json)

**Get the GeoJSON for Derbyshire**
Get /api/v0/places/8fbe18e1-5d04-4b82-a0e9-1c386ed00de7/1
> Content-Type: application/json

Response `200`
> [JSON](api_examples/get-derbyshire-geojson.json)



##GET /api/v0/places/{id1, id2}
Get multiple places and/or geojsons

###Examples

**Get Derbyshire and Somerset at the same time**
Get /api/v0/places/8fbe18e1-5d04-4b82-a0e9-1c386ed00de7,54eebb2c-4a92-4ca7-a5f9-0ea9069f95b5
> Content-Type: application/json

Response `200`
> [JSON](api_examples/multiget-derbyshire-somerset-geojson.json)

**Get Derbyshire and a bogus place**
Get /api/v0/places/8fbe18e1-5d04-4b82-a0e9-1c386ed00de7,54eebb2c-4a92-4ca7-a5f9-0ea9069f95bf
> Content-Type: application/json

Response `200`
> [JSON](api_examples/multiget-derbyshire-bogus-geojson.json)



##POST /api/v0/places/{id}
Create or update a place or geojson

###Examples

**Add a new place**
POST /api/v0/places/61cc4c9f-0dd6-4dcd-8f5e-e8f52f28d3ae
> Content-Type: application/json
> [Body](api_examples/post-place-200-request.json)

Response `200`
> [JSON](api_examples/post-place-200-response.json)

**Add a new place, but missing the names block**
POST /api/v0/places/61cc4c9f-0dd6-4dcd-8f5e-e8f52f28d3ae
> Content-Type: application/json
> [Body](api_examples/post-place-400-request.json)

Response `400`
> [JSON](api_examples/post-place-400.json)



##POST /api/v0/places/
Create or update multiple places and/or geojsons simultaneously.

###Examples

**Add a new place and its geojsons**
POST /api/v0/places/
> Content-Type: application/json
> [Body](api_examples/multipost-place-200-request.json)

Response `200`
> [JSON](api_examples/multipost-place-200-response.json)

**Add a new place, but the geojson in is bad**
POST /api/v0/places/
> Content-Type: application/json
> [Body](api_examples/multipost-place-400-request.json)

Response `200`
> [JSON](api_examples/multipost-place-400.json)



##DELETE /api/v0/places/{id}
Delete a place and/or geojson

###Examples

**Delete a place**
POST /api/v0/places/61cc4c9f-0dd6-4dcd-8f5e-e8f52f28d3ae
> Content-Type: application/json

Response `200`
> [JSON](api_examples/delete-place-200.json)

**Delete a place, but for some reason it failed**
POST /api/v0/places/
> Content-Type: application/json

Response `400`
> [JSON](api_examples/delete-place-400.json)



##DELETE /api/v0/places/{id1, id2}
Delete multiple places and/or geojsons simultaneously.

###Examples

**Delete a place and its geojson**
POST /api/v0/places/61cc4c9f-0dd6-4dcd-8f5e-e8f52f28d3ae,61cc4c9f-0dd6-4dcd-8f5e-e8f52f28d3ae/1
> Content-Type: application/json

Response `200`
> [JSON](api_examples/multidelete-place-200.json)

**Delete a place and its geojson, but the place failed to delete**
POST /api/v0/places/61cc4c9f-0dd6-4dcd-8f5e-e8f52f28d3ae,61cc4c9f-0dd6-4dcd-8f5e-e8f52f28d3ae/1
> Content-Type: application/json

Response `200`
> [JSON](api_examples/multidelete-place-400.json)


##GET /api/changes?{from,to}
Get a list of all places and their geojsons that have changed

###Parameters
* `from` - A timestamp to get changes from (*Default* null). If not set changes from the beginning of time will be returned. Please don't do that.
* `to` - A timestamp to get changes until (*Default* null). If not set will return as many changes as it can.

###Examples

**Get Changes from 1389898363**
Get /api/v0/changes?from=1389898363
> Content-Type: application/json

Response `200`
> [JSON](api_examples/get-changes-from.json)

**Get the GeoJSON for Derbyshire**
Get /api/v0/changes?from=1389898363&to=1389899999
> Content-Type: application/json

Response `200`
> [JSON](api_examples/get-changes-from-to.json)

