var configureFunction = function(program, db, config) {
    program
        .command('add <url>')
        .description('Add a podcast to the list of podcasts subscribed to.')
        .action(function(url) {
            var displayUrl = url.length > 25 
                            ? url.substr(0,25) + '...'
                            : url;
            db.insert({title: 'New Podcast [' + displayUrl + ']', description: "", url: url, folder: "", items: []});
        });
};

exports.configureCommand = configureFunction;
