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

                var tasks = _.chain(docs)
                            .map(function(doc) {
                                    var name = chance.word();

                                    orchestrator.add(name, makeFeedTask(doc));
                                    return name;})
                            .toArray()
                            .value();

                orchestrator.start(tasks, function (err) {
                    console.log(docs);
                    console.log(err);
                    _.each(docs, function(doc) {
                        db.update({_id: doc._id}, doc);
                    })
                });

                /*
                var queue = new Queue(4, 'worker.js'),
                    done = false,
                    files = [],
                    feeds = {},
                    urls = _.map(docs, function(d) {
                        return {type: 'feed', object: d};
                    });

                queue
                .on('error', function(err) {
                    if (done)
                        return;

                    console.log(err);
                })
                .on('msg', function(value) {

                    if (value.type == "feed") {
                        feeds[value.object._id] = value.object;
                    }
                    else {
                        var feed = feeds[value.object._id];
                        feed.items.push(value.object.item);
                        files.push(value.object.enclosure.url);
                    }
                });


                queue.concat(urls);

                queue.end(function() {
                    done = true;

                    var q = new Queue(4, 'worker.js'),
                        done2 = false,
                        f = _.map(files, function(file) {
                            return {type: 'file', object:file};
                        });

                    for (var id in feeds) {
                        if (feeds.hasOwnProperty(id)) {
                            db.update({_id: id}, feeds[id]);
                        }
                    }

                    q
                    .on('error', function(err) {
                        if (done2)
                            return;

                        console.log(err);
                    })
                    .on('msg', function(value) {
                        console.log(value);   
                    });

                    q.concat(f);

                    q.end(function() {
                        done2 = true;
                        console.log('done'); 
                    });
                });
                */
            });    
        });
};

function makeFeedTask(doc) {
    return function() {
        var deferred = Q.defer();

        request(doc.url)
//        .on('response', function() {
//            console.log('downloading ' + doc.url);
//        })
//        .on('end', function() {
//            console.log('downloaded ' + doc.url);
//        })
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
            var stream = this, item;
            while (item = stream.read()) {
                for (var i = 0; i < item.enclosures.length; i++) {
                    console.log(item.enclosures[i]);
                    //process.send({type: "file", object: {_id: object._id, item: item, enclosure: item.enclosures[i]}});
                }
            }
        })
        .on('end', function() {
            deferred.resolve();
        });

        return deferred.promise;
    }
}

exports.configureCommand = configureFunction;
