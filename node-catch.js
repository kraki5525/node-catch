"use strict"

var program = require('commander'),
    Promise = require('bluebird'),
    fs = require('mz/fs'),
    co = require('co'),
    Datastore = require('nedb');

var configDb = new Datastore({ 
    filename: 'data/node-catch.config', 
    autoload: true });

var configFind = Promise.promisify(configDb.find, configDb);

var commandList = ['list','remove','refresh','add','sync'];

co(function * () {
    var configs = yield configFind({});
    var defaultConfig = {
        db: 'data/node-catch.data',
        maxCurrency: 4,
        storageDirectory: 'podcasts'
    };
    var config = configs[0] || defaultConfig;

    if (configs.length == 0) {
        configDb.insert(defaultConfig);
    }

    var db = new Datastore({
        filename: config.db,
        autoload: true
    });

    for (var i = 0; i < commandList.length; i++) {
        require('./commands/' + commandList[i] + '.js').configureCommand(program, db, config);
    }

    try {
        yield fs.readdir(config.storageDirectory);
    }
    catch (err) {
        yield fs.mkdir(config.storageDirectory);
    }

    program.parse(process.argv);
}).catch(function(error) {
    console.error(error);
});
