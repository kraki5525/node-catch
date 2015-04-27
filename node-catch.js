"use strict"

var program = require('commander'),
    Q = require('q'),
    fs = require('fs'),
    Datastore = require('nedb');

var configDb = new Datastore({ 
    filename: 'data/node-catch.config', 
    autoload: true });

var configFind = Q.denodeify(configDb.find.bind(configDb));

var commandList = ['list','remove','refresh','add'];

configFind({})
.then(function (configs) {
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

    fs.readdir(config.storageDirectory, function (err, files) {
        if (err) {
            fs.mkdir(config.storageDirectory, function (err) {
                if (err) {
                    console.log(err)
                    process.exit(1);
                }
                program.parse(process.argv);
            });
        }
        else {
            program.parse(process.argv);
        }
    });

    program.version('0.0.1');
})
.catch(function (err) {
    console.log(err);
})
