var program = require('commander'),
    _ = require('underscore'),
    inquirer = require('inquirer'),
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
        db.insert({name: "podcast", url: url});
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

                    console.log(query);
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
                    console.log(answer);
                }
            );
        });
    });

program.parse(process.argv);
