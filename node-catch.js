var program = require('commander'),
    _ = require('underscore'),
    inquirer = require('inquirer'),
    Queue = require('forkqueue'),
    Datastore = require('nedb'),
    db = new Datastore({
        filename: 'data/node-catch.data',
        autoload: true
    });

program.version('0.0.1');

program
    .command('add <url>')
    .description('Add a podcast to the list of podcasts subscribed to.')
    .action(function(url) {
        db.insert({url: url});
    });

program
    .command('remove')
    .description('Remove a podcast or episdoes from storage')
    .action(function() {
        db.find({}, function(err, docs) {
            var choices = _.map(docs, function(d) {
                return {name: d.name, value: d._id};
            });

            inquirer.prompt({
                'type': 'checkbox',
                'name': 'id',
                'message': 'Select pdocasts to delete',
                choices: choices},
                function(answer) {
                    var ors =  _.map(answer.id, function(id) {
                                return {_id : id};
                            }),
                        query = { $or: ors};

                    db.remove(query, {multi: true});
                }
            );    
        });
    });

program
    .command('list')
    .description('List the podcasts you are currently subscribed to.')
    .action(function() {
        db.find({}, function(err, docs) {
            var choices = _.map(docs, function(d) { 
                return {name: d.name, value: d._id}; 
            });
            
            inquirer.prompt({
                'type': 'list',
                'name': 'id',
                'message': 'List of subscribed podcasts',
                choices: choices },
                function (answer) {
                }
            );
        });
    });

program
    .command('refresh')
    .description('Download new podcasts.')
    .action(function() {
        db.find({}, function(err, docs) {
            var queue = new Queue(4, 'worker.js'),
                urls = _.map(docs, function(d) {
                    return d.url;
                });

            queue
            .on('error', function(err) {
                console.log(err);
            })
            .on('msg', function(value) {
                console.log(value);
            });

            queue.concat(urls);

            queue.end(function() {
                console.log('end of queue')
            });
        });    
    });

program.parse(process.argv);
