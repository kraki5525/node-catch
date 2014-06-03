var _ = require('underscore'),
    FeedParser = require('feedparser'),
    request = require('request'),
    fs = require('fs'),
    urlParser = require('url'),
    async = require('async-q'),
    Q = require('q');

var configureFunction = function(program, db, config) {
    program
        .command('refresh')
        .description('Download new podcasts.')
        .action(function() {
            var dbFind = Q.denodeify(db.find.bind(db));

            dbFind({})
            .then(function (docs) {
                return _.chain(docs)
                        .map(function(doc) {
                            var name = chance.word();

                            return makeFeedTask(doc);
                        })
                        .toArray()
                        .value();
            })
            .then(function (feedTasks) {
                return async.parallelLimit(feedTasks,4);
            })
            
            .then(function (feeds) {
                _.each(feeds, function(feed) {
                    db.update({_id: feed._id}, feed);
                });
            })
            .then(function() {
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
                         .map(function (file) {
                            return makeFileTask(file);
                         })
                         .value();
            })
            .then(function (fileTasks) {
                return async.parallelLimit(fileTasks,4);
            })
            .then(function () {
                console.log('done');    
            })
            .catch(function(reason) {
                console.log("fail: " + reason);       
            });
        });
};

function makeFeedTask(doc) {
    return function() {
        var deferred = Q.defer();

        request(doc.url)
        .pipe(new FeedParser())
        .on('error', function (error) {
            console.error(error);
            deferred.resolve();
        })
        .on('meta', function (meta) {
            doc.title = meta.title;
            doc.description = meta.description;
            console.log('===== %s =====', meta.title);
        })
        .on('readable', function() {
            var stream = this, 
                item;
            while (item = stream.read()) {
                for (var i = 0; i < item.enclosures.length; i++) {
                    var feedItem = createDocItem(item);

                    if (!itemExists(feedItem, doc))
                        doc.items.push(feedItem);
                }
            }
        })
        .on('end', function() {
            deferred.resolve(doc);
        });

        return deferred.promise;
    }
}

function makeFileTask(item) {
    return function() {
        var deferred = Q.defer();

        var url = urlParser.parse(item.file.files[0]);
        var fileName = url.pathname.split('/').pop();

        request(urlParser.format(url))
        .on('response', function() { console.log('downloading ' + url); })
        .on('end', function() { deferred.resolve(); })
        .pipe(fs.createWriteStream(fileName));

        return deferred.promise;
    }
}

function createDocItem(item) {
    var docItem = {};

    docItem.title = item.title;
    docItem.description = item.description;
    docItem.date = item.date;
    docItem.status = "none";
    docItem.files = _.chain(item.enclosures)
                    .map(function(enclosure) { return enclosure.url; })
                    .toArray()
                    .value();

    return docItem;
}

function itemExists(feedItem, doc) {
    return _.some(doc.items, function(item) {
        return (feedItem.files.length == 0) 
                || (item.files != null && item.files.length > 0 && feedItem.files[0] == item.files[0]);
    });
}

exports.configureCommand = configureFunction;
