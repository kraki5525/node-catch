var _ = require('underscore'),
    inquirer = require('inquirer'),
    Queue = require('forkqueue');

var configureFunction = function(program, db) {
    program
        .command('refresh')
        .description('Download new podcasts.')
        .action(function() {
            db.find({}, function(err, docs) {
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
            });    
        });
};

exports.configureCommand = configureFunction;
