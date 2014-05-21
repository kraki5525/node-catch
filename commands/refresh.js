var _ = require('underscore'),
    inquirer = require('inquirer'),
    Orchestrator = require('orchestrator'),
    orchestrator = new Orchestrator(),
    Chance = require('chance'),
    chance = new Chance(),
    FeedParser = require('feedparser'),
    request = require('request'),
    fs = require('fs'),
    urlParser = require('url'),
    Q = require('q');

var configureFunction = function(program, db) {
    program
        .command('refresh')
        .description('Download new podcasts.')
        .action(function() {
            var dbFind = Q.denodeify(db.find.bind(db));
            var feedOrchestrator = new Orchestrator();
            var fileOrchestrator = new Orchestrator();
            var feeds;

            fileOrchestrator.on('task_err', function (e) {
                console.log(e);
            });

            dbFind({})
            .then(function (docs) {
                feeds = docs;
                return _.chain(docs)
                        .map(function(doc) {
                            var name = chance.word();

                            feedOrchestrator.add(name, makeFeedTask(doc));
                            return name;
                        })
                        .toArray()
                        .value();
            })
            .then(function (feedTasks) {
                var deferred = Q.defer();
                feedOrchestrator.start(feedTasks, deferred.resolve);
                return deferred.promise;
            })
            .then(function () {
                _.each(feeds, function(feed) {
                    db.update({_id: feed._id}, feed);
                });
            })
            .then(function() {
                return dbFind({"items.status": "none"});
            })
            .then(function (feedsWithFiles) {
                var files = _.chain(feedsWithFiles)
                             .map(function (feed) {
                                var items = _.where(feed.items, {status: "none"});
                                return _.map(items, function (item) {
                                   return {feed: feed, file: item}; 
                                });
                             })
                             .toArray()
                             .flatten()
                             .value();

                return _.chain(files)
                        .map(function (file) {
                            var name = chance.word();
                            fileOrchestrator.add(name, makeFileTask(file));
                            return name;
                        })
                        .toArray()
                        .value();
            })
            .then(function (fileTasks) {
                var deferred = Q.defer();
                fileOrchestrator.start(fileTasks, deferred.resolve);
                return deferred.promise;
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
            deferred.resolve();
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
