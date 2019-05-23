var known_uuids = [],
    found_uuids = [];

const socket = io();

// On Connect Handler for the Websocket
socket.on('connect', () => {
    console.log('Socket is connected: ' + socket.connected);

    // Say Hello
    socket.emit('my message', { 'data': 'Hello Server!' });
    socket.emit('my broadcast message', { 'data': 'Hello Everybody!' });
    // Subcribe to room
    socket.emit("subscribe", { room: "guardians-of-the-galaxy" });
});

socket.on("room joined", function (data) {
    console.log(`room ${data.room} joined`);
});

socket.on("room left", function (data) {
    console.log(`room ${data.room} left`);
});

socket.on('config', function (data) {
    known_uuids = data.uuids;
});

socket.on('disconnect', () => {
    console.log('Socket is connected: ' + socket.connected);
})

socket.on('my message', function (msg) {
    // Make sure a uuid property was received
    if (msg.uuid) {
        console.log('UUID ' + msg.uuid + ' received!');
        checkUUID(msg.uuid);
    }
});

$(document).ready(function () {

    // Read config json and populate known uuids into an array of known uuids
    // $.getJSON('config.json')
    //     .done(function (data) {
    //         known_uuids = data.uuids;
    //     });


});

function checkUUID(uuid) {
    // Make sure the uuid is known
    if (known_uuids.includes(uuid)) {
        console.info('UUID ' + uuid + ' is known!');
        // Make sure the uuid wasn't found
        if (!found_uuids.includes(uuid)) {
            // Push UUID to the found array
            found_uuids.push(uuid);
            console.info('Device found!');
            // Update Display to show correct numbers of devices
            numBauteile();

        } else {
            console.warn('Device was already found!')
        }
    } else {
        console.warn('UUID ' + uuid + ' is unknown!');
    }
}



function gotoPlayWBT() {
    document.getElementById("congrats").style.display = "block";
    setTimeout(function () {
        //window.open("story.html", "wbt");
        location.href = "../iRAM/01_MNV_IRAM/story.html"
    }, 3000);
}

function numBauteile() {
    document.getElementById("statustext").innerHTML = found_uuids.length + " von 3 Bauteilen.";
    document.getElementById("hinweis").innerHTML = "";
    if (found_uuids.length == 1) {
        document.getElementById("hinweis").innerHTML = "Findet mit Hilfe der SE Teams heraus, ob weitere Module von der Änderung betroffen sind.";
    }
    if (found_uuids.length >= 3) {
        gotoPlayWBT();
    }
}

var keys = [0, 0, 0];
document.addEventListener('keydown', function (event) {
    var key = event.key || event.keyCode;

    if (key === 'j' || key === 74) {
        checkUUID(known_uuids[0]);    
    }
    if (key === 'k' || key === 75) {
        checkUUID(known_uuids[1]);
    }
    if (key === 'l' || key === 76) {
        checkUUID(known_uuids[2]);
    }

    numBauteile();

});

numBauteile();