var _ = require('lodash'),
    co = require('co'),
    Promise = require('bluebird'),
    fs = require('mz/fs'),
    feedParser = require('co-feedparser'),
    inquirer = require('inquirer'),
    request = require('request'),
    path = require('path'),
    urlParser = require('url');

var configureFunction = function (program, db, config) {
    program
        .command('refresh')
        .description('Download new podcasts.')
        .option("-p, --prompt", "Prompt about podcasts to download.")
        .action(function (options) {
            var dbFind = Promise.promisify(db.find, db);
            var prompt = options.prompt || false;

            co(function * () {
                var feeds = yield dbFind({});
                var feedTasks = _.map(feeds, function(feed) { return makeFeedTask(feed, db, config); });
                var results = yield feedTasks;

                _.each(results, function (result) {
                    var feed = result.feed,
                        parsedFeed = result.parsedFeed;

                    if (!feed.folder) {
                        feed.folder = path.join(config.storageDirectory, feed.title);
                    }

                    _.each(parsedFeed.articles, function (article) {
                        var feedItem = createFeedItem(article);
                        if (!itemExists(feedItem, feed)) {
                            feed.items.push(feedItem);
                        }
                    });
                    db.update({_id: feed._id}, feed);
                });

                var folderTasks = _.map(feeds, function(feed) { return makeDirectoryTask(feed); });
                var folders = yield folderTasks;

                var feedsWithFiles = yield dbFind({"items.status": "none"});
                feedsWithFiles = _.chain(feedsWithFiles)
                                 .map(function (feed) {
                                    var items = _.where(feed.items, {status: "none"});
                                    return _.map(items, function (item) {
                                       return {feed: feed, file: item}; 
                                    });
                                 })
                                 .toArray()
                                 .flatten()
                                 .value();

                if (feedsWithFiles.length == 0)
                    return;

                if (prompt) {
                    feedWithFiles = yield promptForFiles(feedsWithFiles);
                }

                var fileTasks = _.chain(feedWithFiles)
                                 .map(function (feedFile) { return makeFileTask(feedFile, db, config); })
                                 .value();

                var files = yield fileTasks;
                _.each(files, function(file) {
                    var feed = _.find(feeds, function (f) { return file.feed._id === f._id; });
                    if (feed) {
                        var item = _.find(feed.items, function (i) { return file.file.id === i.id; });
                        item.status = file.file.status;
                    }
                });
                _.each(feeds, function (feed) {
                    db.update({_id: feed._id}, feed);
                });
            })
            .then(function() {
                console.log('done');
            })
            .catch(function(err) {
                console.error(err);
            });
        });
};

function promptForFiles(feedsWithFiles) {
    return new Promise(function(resolve) {
        inquirer.prompt({
                type: 'checkbox',
                message: 'select episodes to download',
                name: 'episodes',
                choices: _.map(feedsWithFiles, function (file) { return {name: file.file.title, value: file.file.id}; })
            },
            function(answers) {
                var acceptedFiles = _.filter(feedsWithFiles, function (file) {
                    return _.includes(answers, file.file.id);
                });
                resolve(acceptedFiles);
            }
        );
    });
}

function makeFeedTask (feed, config) {
    return function * () {
        var parsedFeed = yield feedParser(feed.url);
        feed.title = parsedFeed.title;
        feed.description = parsedFeed.description;
        console.log('===== %s =====', parsedFeed.title);

        return {feed: feed, parsedFeed: parsedFeed};
    };
}

function makeFileTask(item, db, config) {
    return new Promise(function(resolve) {

        var url = urlParser.parse(item.file.files[0]);
        var fileName = url.pathname.split('/').pop();

        request(urlParser.format(url))
        .on('response', function() { console.log('downloading ' + url.href); })
        .on('end', function() { 
            item.file.status = 'done';
            resolve(item); 
        })
        .pipe(fs.createWriteStream(path.join(item.feed.folder, fileName)));
    });
}

function makeDirectoryTask(feed) {
    return function * () {
        try {
            yield fs.readdir(feed.folder);
        }
        catch (err) {
            yield fs.mkdir(feed.folder);
        }
        return feed.folder;
    };
}

function createFeedItem(item) {
    var feedItem = {};

    feedItem.title = item.title;
    feedItem.description = item.description;
    feedItem.date = item.date;
    feedItem.status = "none";
    feedItem.id = Date.now();
    feedItem.files = _.chain(item.enclosures)
                    .map(function(enclosure) { return enclosure.url; })
                    .toArray()
                    .value();

    return feedItem;
}

function itemExists(feedItem, feed) {
    return _.some(feed.items, function(item) {
        return (feedItem.files.length == 0) 
                || (item.files != null && item.files.length > 0 && feedItem.files[0] == item.files[0]);
    });
}

function pipeRequest(readable, requestThunk){
    return function(cb){
        readable.pipe(requestThunk(cb));
    }
}

exports.configureCommand = configureFunction;
