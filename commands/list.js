var inquirer = require('inquirer'),
    _ = require('underscore');

var configureFunction = function(program, db) {
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
};

exports.configureCommand = configureFunction;
