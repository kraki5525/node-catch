var _ = require('underscore'),
    FeedParser = require('feedparser'),
    request = require('request'),
    fs = require('fs'),
    path = require('path'),
    urlParser = require('url'),
    async = require('async-q'),
    Q = require('q');

var configureFunction = function (program, db, config) {
    program
        .command('refresh')
        .description('Download new podcasts.')
        .action(function () {
            var dbFind = Q.denodeify(db.find.bind(db));

            dbFind({})
            .then(function (feeds) {
                return _.chain(feeds)
                        .map(function(feed) {
                            return makeFeedTask(feed, db, config);
                        })
                        .toArray()
                        .value();
            })
            .then(function (feedTasks) {
                return async.parallelLimit(feedTasks,4);
            })
            .then(function (feeds) {
                return _.chain(feeds)
                        .each(function (feed) {
                            if (feed.directory == null || feed.directory == "") 
                                feed.directory = path.join(config.storageDirectory, feed.title);
                        })
                        .value();
            })
            .then(function (feeds) {
                return Q.all(feeds.map(function (feed) {
                    return makeDirectoryTask(feed);
                }));
            })
            .then(function (feeds) {
                console.log(feeds);
                _.each(feeds, function (feed) {
                    db.update({_id: feed._id}, feed);
                });
            })
            .then(function () {
                return dbFind({"items.status": "none"});
            })
            .then(function (feedsWithFiles) {
                return _.chain(feedsWithFiles)
                         .map(function (feed) {
                            var items = _.where(feed.items, {status: "none"});
                            return _.map(items, function (item) {
                               return {feed: feed, file: item}; 
                            });
                         })
                         .toArray()
                         .flatten()
                         .value();
            })
            .then(function (feedFiles) {
               return _.chain(feedFiles)
                         .map(function (feedFile) {
                            return makeFileTask(feedFile, db, config);
                         })
                         .value();
            })
            .then(function (fileTasks) {
                return async.parallelLimit(fileTasks,config.maxCurrency);
            })
            .then(function () {
                console.log('done');    
            })
            .catch(function (reason) {
                console.log("fail: " + reason);       
            });
        });
};

function makeFeedTask (feed, config) {
    return function () {
        var deferred = Q.defer();

        request(feed.url)
        .pipe(new FeedParser())
        .on('error', function (error) {
            console.error(error);
            deferred.resolve();
        })
        .on('meta', function (meta) {
            feed.title = meta.title;
            feed.description = meta.description;
            console.log('===== %s =====', meta.title);
        })
        .on('readable', function () {
            var stream = this, 
                item;
            while (item = stream.read()) {
                for (var i = 0; i < item.enclosures.length; i++) {
                    var feedItem = createFeedItem(item);

                    if (!itemExists(feedItem, feed))
                        feed.items.push(feedItem);
                }
            }
        })
        .on('end', function() {
            deferred.resolve(feed);
        });

        return deferred.promise;
    }
}

function makeFileTask(item, db, config) {
    return function() {
        var deferred = Q.defer();

        var url = urlParser.parse(item.file.files[0]);
        var fileName = url.pathname.split('/').pop();

        request(urlParser.format(url))
        .on('response', function() { console.log('downloading ' + url); })
        .on('end', function() { 
            deferred.resolve(); 
        })
        .pipe(fs.createWriteStream(fileName));

        return deferred.promise;
    }
}

function makeDirectoryTask(feed) {
    return function() {
        var deferred = Q.defer();

        fs.readdir(feed.directory, function (err, files) {
            if (err) {
                fs.mkdir(feed.directory, function (err) {
                    if (err) {
                        console.log(err)
                        deferred.reject(err);
                    }
                    else {
                        deferred.resolve(feed);
                    }
                })
            }
            else {
                deferred.resolve(feed);
            }
        });

        return deferred.promise;
    };
}

function createFeedItem(item) {
    var feedItem = {};

    feedItem.title = item.title;
    feedItem.description = item.description;
    feedItem.date = item.date;
    feedItem.status = "none";
    feedItem.files = _.chain(item.enclosures)
                    .map(function(enclosure) { return enclosure.url; })
                    .toArray()
                    .value();

    return feedItem;
}

function itemExists(feedItem, feed) {
    return _.some(feed.items, function(item) {
        return (feedItem.files.length == 0) 
                || (item.files != null && item.files.length > 0 && feedItem.files[0] == item.files[0]);
    });
}

exports.configureCommand = configureFunction;
