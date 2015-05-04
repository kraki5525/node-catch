'use strict';

var Promise = require('bluebird'),
    co = require('co'),
    _ = require('lodash');

var configureFunction = function(program, db, config) {
    program
        .command('list')
        .description('List the podcasts you are currently subscribed to.')
        .action(function() {
            var dbFind = Promise.promisify(db.find, db);

            co(function * () {
                var feeds = yield dbFind({});

                console.log('Podcasts:');
                _.forEach(feeds, function(feed) {
                    console.log(feed.title);
                });
            }).catch(function (err) {
                console.log(err);
            });
        });
};

exports.configureCommand = configureFunction;
