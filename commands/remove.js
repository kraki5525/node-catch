var inquirer = require('inquirer'),
    Q = require('q'),
    _ = require('underscore');

var configureFunction = function(program, db, config) {
    program
        .command('remove')
        .description('Remove a podcast or episdoes from storage')
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
                    'message': 'Select pdocasts to delete',
                    choices: choices },
                    function (answer) {
                        var ors =  _.map(answer.id, function(id) {
                                    return {_id : id};
                                }),
                            query = { $or: ors};

                        db.remove(query, {multi: true});
                    }
                );
            })
            .catch(function (err) {
                console.log(err);
            });
        });
};

exports.configureCommand = configureFunction;
