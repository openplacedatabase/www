# Open Place Database

An effort to provide historical boundary shapes for places worldwide in an easily consumable format.

[![Dependency Status](https://david-dm.org/openplacedatabase/www.png)](https://david-dm.org/openplacedatabase/www)

##API
The documentation is [here](https://github.com/openplacedatabase/www/blob/master/API.md).
The javascript sdk is available [here](https://github.com/openplacedatabase/opd-js-sdk).

##Schema
The actual schema for the data is documented [here](https://github.com/openplacedatabase/www/blob/master/SCHEMA.md).

## Installation

1. Install [Node.js](http://nodejs.org/) (0.10+ with npm), [git](http://git-scm.com/), and java 7 (we recommend `openjdk-7-jre`).

1. Install [elasticsearch](http://www.elasticsearch.org/). You may also want to (optionally) install the [elasticsearch-head Plugin](http://mobz.github.io/elasticsearch-head/) to view and manage indexes using your webbrowser. Make sure to restart elasticsearch if you install the plugin.
````bash
#example for Ubuntu
wget <link to elasticsearch >
sudo dpkg -i <elasticsearch.deb file>
cd /usr/share/elasticsearch/
sudo ./bin/plugin -install mobz/elasticsearch-head
sudo service elasticsearch restart
````

1. Clone this repository. The root of the cloned repo will be referred to as `<root_dir>` for the rest of these instructions.
````bash
cd <somewhere>
git clone https://github.com/openplacedatabase/www.git
````

1. [Download](https://s3.amazonaws.com/openplacedatabase/snapshots/2014-02-26.zip) the latest data snapshot.

1. Set any needed environment variables:
````bash
// Only required if you want to use a google map
OPD_GOOGLE_API_KEY="<Your google maps key>"
// TODO document the rest of the env vars. For now look in app.js
````

1. Add a credentials file called `<root_dir>/.credentials.json` that has your username and password in it.
````json
{
  "<your username>": {
    "pwd":"<a password you don't use anywhere else>",
    "id":"1",
    "name":"Your full name as it will appear in any edits you make"
  }
}
````

1. run `npm install` while in `<root_dir>`

1. Run the Open Place Database by typing `node <root_dir>/app.js`. It will bind to port 8080 by default.

1. Import the latest snapshot by running `node <root_dir>/utils/import.js <path_to_downloaded_zip>.zip -u username -p password`. Note that by default this will populate the `<root_dir>/data` directory, which can swamp your machine if not careful. To use S3 instead make sure to set your environment variables correctly.

Note that if you do not load data you need to create the index using `curl -XPUT 'localhost:9200/places/' -d '{}'`


## License

Apache 2
