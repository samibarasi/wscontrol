var express = require('express'),
    app = express(),
    http = require('http').createServer(app),
    io = require('socket.io')(http),
    formidable = require('formidable'),
    util = require('util'),
    moment = require('moment'),
    fs = require('fs'),
    fsp = fs.promises;
puppeteer = require('puppeteer'),
    path = require('path');

var port = process.env.PORT || 3000,
    supportedTypes = ['image/jpg', 'image/jpeg', 'image/png'];

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

renameFileAsync = async (source, destination, overwrite = false) => {
    
    // Check if file already exists
    if (!overwrite) {
        let exists = false,
            num = 0,
            destfile = destination;

        while (exists = await fsp.access(destfile, fs.constants.F_OK)) {
            destfile = path.join(destination, "-", num++);
        }
    }

    // Rename file
    return await fsp.rename(source, destfile);
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

// Write Config
writeConfig = () => {
    fs.writeFileSync(configFile, JSON.stringify(config, null, 4));
}

// Webserver Setup
app.use(express.static(__dirname + '/public'));

// Default Route 
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

// Admin Route
app.get('/admin', function (req, res) {
    res.sendFile(__dirname + '/admin/index.html');
});
app.post('/admin', function (req, res) {
    var form = formidable.IncomingForm();

    form.uploadDir = "temp";

    form.parse(req, function (err, fields, files) {
        console.log(files, fields);
        // Make sure type is image
        if (supportedTypes.includes(files.image.type)) {
            res.status(201).json({
                message: "received upload",
                fields: fields,
                files: files
            });

            // Make sure uuid was provided
            if (fields.uuid) {
                

                // Make sure the uuid is known in the config
                if (config.uuids.includes(fields.uuid)) {

                    // Change Non-URLconform letters
                    let filename = files.image.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
                    // Rename file to filename
                    fs.rename(files.image.path, path.join("public/uploads/", filename), function (err) {
                        if (err) {
                            console.log('ERROR: ' + err)
                        } else {
                            console.log('file uploaded and named: ' + filename);
                            let idx = config.data.findIndex((item) => {
                                return item.uuid == fields.uuid;
                            });
                            if (idx == -1) {
                                config.data.push({
                                    "uuid": fields.uuid,
                                    "title": fields.title,
                                    "image_url": path.join("/uploads/", filename)
                                });
                            } else {
                                config.data[idx] = {
                                    "uuid": fields.uuid,
                                    "title": fields.title,
                                    "image_url": path.join("/uploads/", filename)
                                };
                            }
                            
                            console.log('config updated', config);
                            writeConfig();
                        }
                    });

                } else {

                    // was not provided
                    // If file type is not image send status 500 and delete file from disk
                    res.status(500).json({
                        message: "uuid not found in config file"
                    });
                    fs.unlinkSync(path.join(files.image.path));
                }

            } else {
                // If file type is not image send status 500 and delete file from disk
                res.status(500).json({
                    message: "No uuid provided"
                });
                fs.unlinkSync(path.join(files.image.path));
            }

        } else {
            // If file type is not image send status 500 and delete file from disk
            res.status(500).json({
                message: "Unsupported file type"
            });
            fs.unlinkSync(path.join(files.image.path));
        }
        res.end();
    })
});

// Guard Route
app.get('/guard', function (req, res) {
    res.sendFile(__dirname + '/guard/index.html');
});

// SocketIO Setup
io.on('connection', function (socket) {

    // Set Locale to DE and log the datetime of the connection
    moment.locale('de');
    console.log(`a user (${socket.id}) connected at ${moment().format('L LT')}`);

    // Subcribe Handler for user requesting to join a room
    socket.on('subscribe', function (data) {
        socket.join(data.room);
        console.log(`User (${socket.id}) joined room ${data.room}.`);
        socket.emit('room joined', data);
    });

    //Unsubcribe Handler for user requesting to leave a room
    socket.on('unsubscribe', function (data) {
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
                writeConfig();

            } else {
                console.log(`UUID(${data.uuid}) was not added, because it's already registered in the config!`)
            }
        } else {
            console.log('Adding UUID failed, because no UUID was provided!');
        }
    });

    socket.on('save uuid', function (data) {
        console.log('add uuid', data);
        if (data.uuid) {

        }
    });

    socket.on('disconnect', function () {
        console.log('user disconnected');
    });

    socket.emit('my message', { 'data': 'Hello User!' });
    socket.emit('config', config);

});

// Start listening
var listener = http.listen(port, function () {
    console.log(`listening on port ${listener.address().port}`);
});