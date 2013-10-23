var inquirer = require('inquirer'),
    _ = require('underscore');

var configureFunction = function(program, db) {
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
};

exports.configureCommand = configureFunction;
