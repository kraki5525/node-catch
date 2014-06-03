var program = require('commander'),
    Q = require('q'),
    fs = require('fs'),
    Datastore = require('nedb'),
    db = new Datastore({
        filename: 'data/node-catch.data',
        autoload: true
    }),
    config = new Datastore({ filename: 'data/node-catch.config' }),
    generateConfig = false;

var commandList = ['list','remove','refresh','add'];
var configLoad = Q.denodeify(config.loadDatabase.bind(config));
var fsExists = Q.denodeify(fs.exists);

fsExists('data/node-catch.config')
.then(function (exists) {
    generateConfig = !exists;
})
.then(function() {
    return configLoad();
})
.then(function() {
    if (generateConfig) {
        var defaultConfig = {
            db: 'data/node-catch.data',
            maxCurrency: 4,
            storageDirectory: 'podcasts'
        };
        config.insert(defaultConfig)
    }
});

for (var i = 0; i < commandList.length; i++) {
    require('./commands/' + commandList[i] + '.js').configureCommand(program, db, config);
}

program.version('0.0.1');
program.parse(process.argv);

function loadConfig(path) {
    return function() {
        var deferred = Q.defer();

           

        return deferred;
    };
}
