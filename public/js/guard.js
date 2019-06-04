var foundData = [],
    config;

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
    config = data;
    numBauteile();
});

socket.on('disconnect', () => {
    console.log('Socket is connected: ' + socket.connected);
})

socket.on('my message', function (msg) {
    // Make sure a uuid property was received
    if (msg.uuid && msg.event == 'start') {
        console.log('UUID ' + msg.uuid + ' with event ' + msg.event + ' received!');
        checkInUUID(msg.uuid, msg.reader);
    }

    if (msg.uuid && msg.event == 'stop') {
        console.log('UUID ' + msg.uuid + ' with event ' + msg.event + ' received!');
        checkOutUUID(msg.uuid, msg.reader);
    }
});

$(document).ready(function () {

    $('.flip-card').on('click', function() {
        $(this).toggleClass('hover');
    })


});

function checkInUUID(uuid, reader) {
    // Make sure the uuid is known
    if (config.data.findIndex(item => item.uuid == uuid) != -1) {
        console.info('UUID ' + uuid + ' is known!');
        // Make sure the uuid wasn't found
        if (!foundData.find(item => item.data.uuid == uuid )) {
            // Push UUID to the found array
            foundData.push({ data: config.data.find((item) => item.uuid == uuid), reader: (reader) ? reader: foundData.length + 1});
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

function checkOutUUID(uuid) {
    let idx = foundData.findIndex(item => item.data.uuid == uuid);
    if (idx != -1) {
        foundData.splice(idx, 1);
        numBauteile();
    }
}

function numBauteile() {
    $("#statustext").html(foundData.length + " von 3 Bauteilen.");
    
    if (foundData.length == 0) {
        $("#hinweis").html("Findet die drei Bauteile!");
    } else if (foundData.length == 1) {
        $("#hinweis").html("Findet mit Hilfe der SE Teams heraus, ob weitere Module von der Änderung betroffen sind.");
    } else if (foundData.length == 2) {
        $("#hinweis").html("Gut! Nur noch ein weiteres Bauteil finden.");
    } else if (foundData.length >= 3) {
        $('#hinweis').html('Sehr gut! Es wurden alle Bauteile gefunden!');
        $("#congrats").show();
        setTimeout(() => {
            window.location.href = 'http://localhost:3000/WBT/iRAM/01_MNV_IRAM/story.html';
        }, 5000)
    }

    $(`.flip-card`).removeClass('hover');
    for (let i = 0; i < foundData.length; i++) {
        $(`#card${foundData[i].reader} .bauteil > image`).attr('xlink:href', foundData[i].data.image_url);
        $(`#card${foundData[i].reader} .title`).html(foundData[i].data.title);
        $(`#card${foundData[i].reader}`).addClass('hover');
    }
}

var keys = [0, 0, 0];
document.addEventListener('keydown', function (event) {
    var key = event.key || event.keyCode;

    if (key === 'j' || key === 74) {
        checkInUUID(config.data[0].uuid, 1);    
    }
    if (key === 'k' || key === 75) {
        checkInUUID(config.data[1].uuid, 2);
    }
    if (key === 'l' || key === 76) {
        checkInUUID(config.data[2].uuid, 3);
    }

    numBauteile();

});

