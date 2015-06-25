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
                var feedsWithFiles = yield dbFind({"items.files.status": "done"});
                feedsWithFiles = _.chain(feedsWithFiles)
                                 .map(function (feed) {
                                    var items = _.filter(feed.items, function(item) {
                                        return _.where(item.files, {status: "done"});
                                    });
                                    return _.map(items, function (item) {
                                       return {
                                           feed: feed, 
                                           item: {
                                               title: item.title,
                                               date: item.date,
                                               files: _.where(item.files, {status: 'done'})
                                           } 
                                       };
                                    })
                                 })
                                 .toArray()
                                 .flatten()
                                 .value();

                console.log(feedsWithFiles);
                //var files = _.map(feedsWithFiles, function  

            });
        });
};

exports.configureCommand = configureFunction;
