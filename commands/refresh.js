var _ = require('underscore'),
    inquirer = require('inquirer'),
    Orchestrator = require('orchestrator'),
    orchestrator = new Orchestrator(),
    Chance = require('chance'),
    chance = new Chance(),
    FeedParser = require('feedparser'),
    request = require('request'),
    fs = require('fs'),
    Q = require('q');
    //Queue = require('forkqueue');

var configureFunction = function(program, db) {
    program
        .command('refresh')
        .description('Download new podcasts.')
        .action(function() {
            db.find({}, function(err, docs) {
                var feedOrchestrator = new Orchestrator();
                var filesOrchestrator = new Orchestrator();
                var feedTasks = _.chain(docs)
                            .map(function(doc) {
                                    var name = chance.word();

                                    feedOrchestrator.add(name, makeFeedTask(doc));
                                    return name;})
                            .toArray()
                            .value();

                var feedOrchestratorStart = function(tasksToDo) {
                    var deferred = Q.defer();
                    feedOrchestrator.start(tasksToDo, deferred.resolve);
                    return deferred.promise;
                };

                feedOrchestratorStart(feedTasks)
                .then(function() {
                    _.each(docs, function(doc) {
                        db.update({_id: doc._id}, doc);
                    });
                })
                .then(function() {
                    db.find({"items.status" : "none"}, function(err, docs) {
                        console.log(err);
                        console.log(docs);
                    });
                });
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
