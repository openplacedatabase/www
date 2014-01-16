# Schema
Below is the version 1 schema for place.json
````javascript
{
  "id":"<UUIDv4>",
  "version":1,
  "names":[
    {
      "from":"YYYY-MM-DD",
      "to":"YYYY-MM-DD",
      "name":"<utf8 fully qualified names (comma separated)>"
    }
  ],
  "geojsons":[
    {
      "from":"YYYY-MM-DD",
      "to":"YYYY-MM-DD",
      "id":"<the relative name of the geojson file, sans extension (.geojson)>"
    }
  ],
  "sources":["A UTF-8 string. This is reserved for source information, especially when importing."],
  "last_edited_time":123456789,
  "last_edited_by":0
}
````
The schema for x.geojson is detailed [here](http://geojson.org/geojson-spec.html). Geometry Objects only.

The folder structure for OPD is as follows
````
<root data folder>/
|
+-- 6a/
   |
   +-- 72/
       |
       +-- 44bc-1751-4f64-8089-05458c232a7e/
           |
           +-- place.json
           |
           +-- 1.geojson
           |
           +-- 2.geojson
           .
           .
           .
````