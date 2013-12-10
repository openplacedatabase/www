# Open Place Database

An effort to provide historical boundary shapes for places worldwide in an easily consumable format.

## License

Apache 2

## Use

TODO

## Installation

1. Install [Node.js](http://nodejs.org/) and [git](http://git-scm.com/)

1. Clone this repository. The directory you clones this repo into will be referred to as `<root_dir>` for the rest of these instructions.

1. Make the following environment variables available:
````
// Only required if you want to use a google map
OPD_GOOGLE_MAPS_KEY="<Your google maps key>
````

1. [Download](http://www.openplacedatabase.org/download) the latest data snapshot and extract it into `<root_dir>/data`.

1. Install [elasticsearch](http://www.elasticsearch.org/) and the [Filesystem River Plugin](https://github.com/dadoonet/fsriver). You may also want to (optionally) install the [elasticsearch-head Plugin](http://mobz.github.io/elasticsearch-head/). Make sure to restart elasticsearch after installing the plugins.

1. Create an index called `places` by running the following command on your machine (assuming you have curl installed):
````
curl -XPUT 'localhost:9200/places/' -d '{}'
````

1. Create a Filesystem River to index the places data by running the following command. MAKE SURE TO REPLACE `<root_dir>` with the path to the root of your clones repo:
````
curl -XPUT 'localhost:9200/_river/places/_meta' -d '
{
  "type": "fs",
  "fs": {
    "url": "<root_dir>/data",
    "json_support" : true,
    "update_rate": 900000,
    "includes": "*\\.json$"
  },
  "index": {
    "index": "places",
    "type": "place",
    "bulk_size": 50
  }
}'
````

1. Run the Open Place Database by typing `node <root_dir>/app.js`. It will bind to port 8080 by default.
