var program = require('commander'),
    _ = require('underscore'),
    inquirer = require('inquirer'),
    request = require('request'),
    FeedParser = require('feedparser'),
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
            var urls = _.map(docs, function(d) {
                return d.url;
            });

            console.log(urls[0]);
            request(urls[0])
                .pipe(new FeedParser())
                .on('error', function (error) {
                    console.error(error);
                })
                .on('meta', function (meta) {
                    console.log('===== %s =====', meta.title);
                })
                .on('readable', function() {
                    var stream = this, item;
                    while (item = stream.read()) {
                      console.log('Got article: %s', item.title || item.description);
                      console.log(item.enclosures);
                    }
                });
        });    
    });

program.parse(process.argv);
