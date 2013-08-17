var request = require('request'),
    FeedParser = require('feedparser'),
    url = require('url'),
    fs = require('fs');

process.on('message', function(fileInfo) {
    var file = fileInfo.url,
        type = fileInfo.type;

    if (type == 'feed') {
        fetchFeed(file);
    }
    else {
        fetchFile(file);
    }
});

process.send('next');

function fetchFeed(file) {
    request(file)
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
                for (var i = 0; i < item.enclosures.length; i++) {
                    process.send(item.enclosures[i]);
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
            .on('end', function() {
                process.send('next');   
            })
            .pipe(fs.createWriteStream(fileName));
}
