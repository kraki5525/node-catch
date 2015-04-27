var inquirer = require('inquirer'),
    Q = require('q'),
    _ = require('lodash');

var configureFunction = function(program, db, config) {
    program
        .command('list')
        .description('List the podcasts you are currently subscribed to.')
        .action(function() {
            var dbFind = Q.denodeify(db.find.bind(db));

            dbFind({})
            .then(function (feeds) {
                var choices = _.map(feeds, function(feed) { 
                    return {name: feed.title, value: feed._id}; 
                });
                
                inquirer.prompt({
                    'type': 'list',
                    'name': 'id',
                    'message': 'List of subscribed podcasts',
                    choices: choices },
                    function (answer) {
                    }
                );
            })
            .catch(function (err) {
                console.log(err);
            })
        });
};

exports.configureCommand = configureFunction;
