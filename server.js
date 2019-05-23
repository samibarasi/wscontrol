var express = require('express'),
    app = express(),
    http = require('http').createServer(app),
    io = require('socket.io')(http),
    moment = require('moment'),
    fs = require('fs'),
    puppeteer = require('puppeteer'),
    path = require('path'),
    port = 3000;

const configFile = './config.json';

var config = JSON.parse(fs.readFileSync(configFile));

console.log(`Watching for file changes on ${configFile}`);

fs.watchFile(configFile, (curr, prev) => {
  console.log(`${configFile} file Changed`);
  config = JSON.parse(fs.readFileSync(configFile));
  // Send config to guardians group
  io.to('guardians-of-the-galaxy').emit('config', config);
});

const logoURL = path.join('file://', '/Users/samibarasi/Temp/IPDM-Basistraining/WBT/WBT-Bauteil-Waechter/start.html');

checkForUnknownUUID = (uuid) => {
    // Make sure the uuid is note already known
    if (!known_uuids.includes(uuid)) {
        console.info(`UUID(${uuid}) is unknown!`);
        // Make sure the uuid wasn't found before
        if (!found_uuids.includes(uuid)) {
            // Push UUID to the found array
            found_uuids.push(uuid);
            console.info(`New UUID(${uuid}) found!`);
            // Update list of new devices
            updateListOfFoundUUIDs();

        } else {
            console.warn(`UUID(${uuid}) was already found!`)
        }
    } else {
        console.warn(`UUID(${uuid}) is already known!`);
    }
}

startPuppeteer = async () => {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        args: ['--kiosk', '--disable-infobars']
    });

    await browser.newPage();

    const pages = await browser.pages();
    const logoTab = pages[0];
    const siteTab = pages[1];

    await logoTab.goto(logoURL);
    await siteTab.goto('http://google.de');
    await siteTab.waitForSelector('body');
    await logoTab.bringToFront();

    //await browser.close();
};

//startPuppeteer();

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/admin', function (req, res) {
    res.sendFile(__dirname + '/admin/index.html');
});

app.get('/guard', function (req, res) {
    res.sendFile(__dirname + '/guard/index.html');
});

io.on('connection', function (socket) {

    // Set Locale to DE and log the datetime of the connection
    moment.locale('de');
    console.log(`a user (${socket.id}) connected at ${moment().format('L LT')}`);

    // Subcribe Handler for user requesting to join a room
    socket.on('subscribe', function(data) {
        socket.join(data.room);
        console.log(`User (${socket.id}) joined room ${data.room}.`);
        socket.emit('room joined', data);
    });

    //Unsubcribe Handler for user requesting to leave a room
    socket.on('unsubscribe', function(data) {
        socket.leave(data.room);
        console.log(`User (${socket.id}) left room ${data.room}.`);
        socket.emit('room left', data);
    });

    // 
    socket.on('my message', function (msg) {
        console.log('my message', msg);
        // Check if a uuid property was provided forward message to the guardians-of-the-galaxy group
        if (msg.uuid) {
            console.log('UUID received: ' + msg.uuid);
            io.to('guardians-of-the-galaxy').emit('my message', msg);
        }
    });

    socket.on('my broadcast message', function (msg) {
        console.log('my broadcast message', msg);
        socket.broadcast.emit('my message', msg);
    });

    socket.on('add uuid', function (data) {
        console.log('add uuid', data);
        //Make sure uuid property was received
        if (data.uuid) {
            // Make sure uuid is not already in the config
            if (!config.uuids.includes(data.uuid)) {
                // Add UUID to config
                config.uuids.push(data.uuid);
                console.log(`UUID(${data.uuid}) was added`);
                // Write config to file
                fs.writeFileSync(configFile, JSON.stringify(config, null, 4) );
                
            } else {
                console.log(`UUID(${data.uuid}) was not added, because it's already registered in the config!`)
            }
        } else {
            console.log('Adding UUID failed, because no UUID was provided!');
        }
    });

    socket.on('disconnect', function () {
        console.log('user disconnected');
    });

    socket.emit('my message', { 'data': 'Hello User!'});
    socket.emit('config', config);

});

var listener = http.listen(port, function () {
    console.log(`listening on port ${listener.address().port}`);
});