var program = require('commander'),
    Datastore = require('nedb'),
    db = new Datastore({
        filename: 'data/node-catch.data',
        autoload: true
    });

var commandList = ['list','remove','refresh','add'];

for (var i = 0; i < commandList.length; i++) {
    require('./commands/' + commandList[i] + '.js').configureCommand(program, db);
}

program.version('0.0.1');
program.parse(process.argv);
