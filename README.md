# Open Place Database

An effort to provide historical boundary shapes for places worldwide in an easily consumable format. Browse it [here](http://www.openplacedatabase.com/map).

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

1. Clone this repository. The root of the cloned repo be referred to as `<root_dir>` for the rest of these instructions.
````bash
cd <somewhere>
git clone https://github.com/openplacedatabase/www.git
````

1. [Download](http://www.openplacedatabase.org/download) the latest data snapshot.

1. Set any needed environment variables:
````bash
// Only required if you want to use a google map
OPD_GOOGLE_API_KEY="<Your google maps key>"
// TODO document the rest of the env vars. For now look in app.js
````

1. run `npm install` while in `<root_dir>`

1. Run the Open Place Database by typing `node <root_dir>/app.js`. It will bind to port 8080 by default.

1. Import the latest snapshot by running `node <root_dir>/utils/import.js <path_to_downloaded_zip>.zip`. Note that by default this will populate the `<root_dir>/data` directory, which can swamp your machine if not careful. To back on S3 make sure to set your environment variables correctly


## License

Apache 2