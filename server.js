var express = require('express'),
    app = express(),
    http = require('http').createServer(app),
    io = require('socket.io')(http),
    formidable = require('formidable'),
    moment = require('moment'),
    fs = require('fs'),
    fsp = fs.promises,
    puppeteer = require('puppeteer'),
    path = require('path'),
    logoTab,
    siteTab,
    foundData = [],
    intervalID = 0;

var port = process.env.PORT || 3000,
    tempDir = 'temp',
    supportedTypes = ['image/jpg', 'image/jpeg', 'image/png'];

const configFile = path.resolve(__dirname + '/config.json');
const logoURL = path.join('file://', '/Users/samibarasi/Temp/IPDM-Basistraining/WBT/WBT-Bauteil-Waechter/start.html');

var config = JSON.parse(fs.readFileSync(configFile));

console.log("NODE_ENV: " + process.env.NODE_ENV);
console.log("CHROME_BIN: " + process.env.CHROME_BIN);
console.log("CWD: " + process.cwd());
process.on("SIGINT", function () {
    console.log('bye!');
    //graceful shutdown
    process.exit();
});

console.log(`Watching for file changes on ${configFile}`);

fs.watchFile(configFile, (curr, prev) => {
    console.log(`${configFile} file Changed`);
    config = JSON.parse(fs.readFileSync(configFile));
    // Send config to guardians group
    io.to('guardians-of-the-galaxy').emit('config', config);
});

const checkAccess = async (loc) => {
    // Check if the file exists in the current directory, and if it is writable.
    fs.access(loc, fs.constants.F_OK | fs.constants.W_OK, (err) => {
        if (err) {
            console.error(
                `${loc} ${err.code === 'ENOENT' ? 'does not exist' : 'is read-only'}`);
            fs.mkdir(loc, err => {
                if (err) {
                    console.error(`cannot create ${loc}`);
                    throw (err);
                }
                console.log(`${loc} was created`);
            })
        } else {
            console.log(`${loc} exists, and it is writable`);
        }
    });
}

// Make sure folder for uploads exists and are accessible
checkAccess(path.resolve(__dirname + '/temp'));
checkAccess(path.resolve(__dirname + '/public/uploads'));

const checkUnknownUUID = (uuid) => {
    // Make sure the uuid is note already known
    if (!known_uuids.includes(uuid)) {
        console.info(`UUID(${uuid}) is unknown!`);
        // Make sure the uuid wasn't found before
        if (!foundData.includes(uuid)) {
            // Push UUID to the found array
            foundData.push(uuid);
            console.info(`New UUID(${uuid}) found!`);
            // Update list of new devices
            updateFoundUUIDs();

        } else {
            console.warn(`UUID(${uuid}) was already found!`)
        }
    } else {
        console.warn(`UUID(${uuid}) is already known!`);
    }
}

const renameFileAsync = async (source, destination, overwrite = false) => {

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

function checkInUUID(uuid, reader) {
    // Make sure the uuid is known
    if (config.data.findIndex(item => item.uuid == uuid) != -1) {
        console.info('UUID ' + uuid + ' is known!');
        // Make sure the uuid wasn't found
        if (!foundData.find(item => item.data.uuid == uuid)) {
            // Push UUID to the found array
            foundData.push({ data: config.data.find((item) => item.uuid == uuid), reader: (reader) ? reader : foundData.length + 1 });
            console.info('Device found!');
            // Update Display to show correct numbers of devices
            if (config.launchChrome) numBauteile();

        } else {
            console.warn('Device was already found!')
        }
    } else {
        console.warn('UUID ' + uuid + ' is unknown!');
    }
}

function checkOutUUID(uuid) {
    let idx = foundData.findIndex(item => item.data.uuid == uuid);
    if (idx != -1) {
        foundData.splice(idx, 1);
        if (config.launchChrome) numBauteile();
    }
}

function numBauteile() {
    if (foundData.length > 0) {
        clearInterval(intervalID);
        siteTab.bringToFront();
    } else {

        intervalID = setTimeout(() => {
            logoTab.bringToFront();
            siteTab.goto(config.siteURL);
        }, config.timeout * 1000);

    }
    console.log(foundData);
}

function handleMessage(msg) {
    // Check if a uuid property was provided forward message to the guardians-of-the-galaxy group
    if (msg.uuid) {
        console.log('UUID received: ' + msg.uuid);
        io.to('guardians-of-the-galaxy').emit('my message', msg);
    }

    if (msg.uuid && msg.event == 'start') {
        console.log('UUID ' + msg.uuid + ' with event ' + msg.event + ' received!');
        checkInUUID(msg.uuid, msg.reader);
    }

    if (msg.uuid && msg.event == 'stop') {
        console.log('UUID ' + msg.uuid + ' with event ' + msg.event + ' received!');
        checkOutUUID(msg.uuid, msg.reader);
    }
}

// Start Puppeteer for remote control chrome browser 
const startPuppeteer = async () => {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        executablePath: process.env.CHROME_BIN, 
        //executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        args: ['--kiosk', '--disable-infobars']
    });

    await browser.newPage();

    const pages = await browser.pages();
    logoTab = pages[0];
    siteTab = pages[1];

    try {
        await logoTab.goto(config.logoURL);
    } catch (err) {
        console.error(`${err} can't open page ${config.logoURL}`);
    }

    try {
        await siteTab.goto(config.siteURL);
    } catch (err) {
        console.error(`${err} can't open page ${config.siteURL}`);
    }
    await siteTab.waitForSelector('body');
    await logoTab.bringToFront();

    //await browser.close();
};

// Write Config
const writeConfig = () => {
    fs.writeFileSync(configFile, JSON.stringify(config, null, 4));
}

// Webserver Setup
app.use(express.static(__dirname + '/public'));
app.use('/WBT', express.static(path.resolve(__dirname, '../WBT')));

// Default Route 
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

// RFID Route
app.get('/p', function (req, res) {
    console.log(`Incoming Request: RFID (${req.query.uuid}) from reader ${req.query.reader}`);
    res.status(200).json({ message: `Incoming Request: RFID (${req.query.uuid}) from reader ${req.query.reader}` });
    const msg = {
        uuid: req.query.uuid,
        event: req.query.event,
        reader: req.query.reader
    }
    handleMessage(msg);
});

// Admin Route
app.get('/admin', function (req, res) {
    res.sendFile(__dirname + '/admin/index.html');
});
app.post('/saveapp', function (req, res) {
    const form = formidable.IncomingForm();

    form.parse(req, function (err, fields, files) {
        if (err) {
            console.error('An error occured parsing form app');
            return;
        }

        // Mutate config
        config.timeout = Number(fields.timeout);
        config.launchChrome = (fields.launchChrome) ? true : false;
        config.chromeURL = fields.chromeURL;
        config.logoURL = fields.logoURL;
        config.siteURL = fields.siteURL;

        writeConfig();
        console.log('config updated', config);

        // Send status OK
        res.status(201).json({
            message: "OK",
            fields: fields,
            files: files
        });
    });
});

app.post('/savecard', function (req, res) {
    const form = formidable.IncomingForm();

    form.uploadDir = tempDir;

    form.parse(req, function (err, fields, files) {
        //console.log(files, fields);

        if (err) {
            console.error('An error occured parsing form card');
            return;
        }

        // Make sure uuid was provided
        if (fields.uuid) {

            let idx = config.data.findIndex(item => item.uuid == fields.uuid);

            // Make sure the uuid is known in the config
            if (idx != -1) {

                let filename;

                // Make sure an file for image was uploaded
                if (files.image) {

                    // Make sure the uploaded file is not empty
                    if (files.image.size > 0) {

                        // Make sure the uploaded file is supported
                        if (supportedTypes.includes(files.image.type)) {

                            // Substitute non-URLconform letters with _
                            filename = files.image.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();

                            // Rename file to substituted filename and move it to target folder
                            fs.rename(files.image.path, path.join("public/uploads/", filename), function (err) {
                                if (err) {
                                    console.log('ERROR: ' + err)
                                } else {
                                    console.log('file uploaded and named: ' + filename);
                                }
                            });
                        } else {
                            // If file type is not image send status 500 and delete file from disk
                            console.error("Unsupported file type");
                            res.status(500).json({
                                message: "Unsupported file type"
                            });
                            // Delete unsupported image file from server
                            fs.unlinkSync(files.image.path);
                            // exit
                            return;
                        }
                    } else {
                        // unlink empty uploaded file
                        console.error("Remove empty file");
                        fs.unlinkSync(files.image.path);
                    }
                }

                // Update config and write to disk.
                config.data[idx] = {
                    "uuid": fields.uuid,
                    "title": fields.title,
                    "image_url": (filename) ? path.join("/uploads/", filename) : config.data[idx].image_url
                };
                writeConfig();
                console.log('config updated', config);

                // Send status OK
                res.status(201).json({
                    message: "OK",
                    fields: fields,
                    files: files
                });

            } else {

                // If UUID wasn't found in config file send status ERROR
                console.error("uuid not found in config file");
                res.status(500).json({
                    message: "uuid not found in config file"
                });
                // If an image file was uploaded, delete it from server
                if (files.image) fs.unlinkSync(files.image.path);
            }

        } else {
            // If UUID wasn't provided send status ERROR
            console.error("No uuid provided");
            res.status(500).json({
                message: "No uuid provided"
            });
            // If an image file was uploaded, delete it from server
            if (files.image) fs.unlinkSync(files.image.path);
        }
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

    // Unsubcribe Handler for user requesting to leave a room
    socket.on('unsubscribe', function (data) {
        socket.leave(data.room);
        console.log(`User (${socket.id}) left room ${data.room}.`);
        socket.emit('room left', data);
    });

    // Message Handler for incoming messages. 
    socket.on('my message', function (msg) {
        console.log('my message', msg);
        handleMessage(msg);
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
            let idx = config.data.findIndex(item => item.uuid == data.uuid);
            if (idx == -1) {
                // Add UUID to config
                config.data.push({ uuid: data.uuid, title: "", image_url: "" });
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

    socket.on('remove uuid', function (data) {
        console.log('remove uuid', data);
        //Make sure uuid property was received
        if (data.uuid) {
            // Make sure uuid is in the config
            let idx = config.data.findIndex(item => item.uuid == data.uuid);
            if (idx != -1) {
                if (config.data[idx].image_url) {
                    fs.unlinkSync(path.join('public', config.data[idx].image_url));
                    console.log(`File ${config.data[idx].image_url} was removed`);
                }
                // Remove UUID from config
                config.data.splice(idx, 1);
                console.log(`UUID(${data.uuid}) was removed`);
                // Write config to file
                writeConfig();

            } else {
                console.log(`UUID(${data.uuid}) was not removed, because it wasn't found in the config!`)
            }

        } else {
            console.log('Removing UUID failed, because no UUID was provided!');
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
    // Start Puppeteer
    if (config.launchChrome && config.logoURL) startPuppeteer();
});

