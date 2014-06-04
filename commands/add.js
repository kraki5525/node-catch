var configureFunction = function(program, db, config) {
    program
        .command('add <url>')
        .description('Add a podcast to the list of podcasts subscribed to.')
        .action(function(url) {
            db.insert({title: "", description: "", url: url, folder: "", items: []});
        });
};

exports.configureCommand = configureFunction;
