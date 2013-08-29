var request = require('request'),
    FeedParser = require('feedparser'),
    url = require('url'),
    fs = require('fs');

process.on('message', function(objectInfo) {
    var object = objectInfo.object,
        type = objectInfo.type;

    if (type == 'feed') {
        fetchFeed(object);
    }
    else {
        fetchFile(object);
    }
});

process.send('next');

function fetchFeed(object) {
    var feed = object.url;

    request(feed)
        .pipe(new FeedParser())
        .on('error', function (error) {
            console.error(error);
        })
        .on('meta', function (meta) {
            object.title = meta.title;
            object.description = meta.description;

            process.send({type: "feed", object: object});
            console.log('===== %s =====', meta.title);
        })
        .on('readable', function() {
            var stream = this, item;
            while (item = stream.read()) {
                for (var i = 0; i < item.enclosures.length; i++) {
                    process.send({type: "file", object: {_id: object._id, item: item, enclosure: item.enclosures[i]}});
                }
            }
        })
        .on('end', function() {
            process.send('next');
        });
}

function fetchFile(file) {
    var pUrl = url.parse(file),
        fileName = pUrl.pathname.split('/').pop();

        request(file)
            .on('response', function(response) {

            })
            .on('end', function() {
                process.send('next');   
            })
            .pipe(fs.createWriteStream(fileName));
}
