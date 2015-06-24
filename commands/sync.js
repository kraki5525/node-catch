var _ = require('lodash'),
    co = require('co'),
    Promise = require('bluebird'),
    fs = require('mz/fs'),
    feedParser = require('co-feedparser'),
    inquirer = require('inquirer'),
    request = require('request'),
    path = require('path'),
    urlParser = require('url');

var configureFunction = function (program, db, config) {
    program
        .command('sync')
        .description('Sync podcasts to another folder')
        .action(function (options) {    
            var dbFind = Promise.promisify(db.find, db);
            var prompt = options.prompt || false;

            co(function * () {
                var feedsWithFiles = yield dbFind({"items.status": "done"});
                feedsWithFiles = _.chain(feedsWithFiles)
                                 .map(function (feed) {
                                    var items = _.where(feed.items, {status: "done"});
                                    return _.map(items, function (item) {
                                       return {feed: feed, file: item}; 
                                    });
                                 })
                                 .toArray()
                                 .flatten()
                                 .value();

                console.log(feedsWithFiles[0].file);
                //var files = _.map(feedsWithFiles, function  

            });
        });
};

exports.configureCommand = configureFunction;
