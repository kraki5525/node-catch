var request = require('request'),
    FeedParser = require('feedparser');

process.on('message', function(url) {
    console.log(url);
    console.log(process.pid);

    request(url)
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
              //console.log('Got article: %s', item.title || item.description);
              //console.log(item.enclosures);
            }
        })
        .on('end', function() {
            process.send('next');
        });
});

process.send('next');
