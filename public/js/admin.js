var socket = io(), // connect to the websocket
    showCards = $('#showCards'),
    newCards = $('#newCards'),
    emitBtn = $('#emitBtn'),
    addBtn = $('#addBtn'),
    deleteBtn = $('#deleteBtn'),
    saveBtn = $('#saveBtn'),
    formDevice = $('#formDevice'),
    known_uuids = [],
    found_uuids = [],
    config;

// On Connect Handler for the Websocket
socket.on('connect', () => {
    console.log('Socket is connected: ' + socket.connected);
    // Say Hello
    socket.emit('my message', { 'data': 'Hello Server!' });
    socket.emit('my broadcast message', { 'data': 'Hello Everybody!' });

    // Subcribe to room
    socket.emit('subscribe', { 'room': 'guardians-of-the-galaxy' });

});

// On room join Handler
socket.on('room joined', function (data) {
    console.log(`room ${data.room} joined`);
});
// On room left Handler
socket.on('room left', function (data) {
    console.log(`room ${data.room} left`);
});

// On config Handler
socket.on('config', (data) => {
    known_uuids = data.uuids;
    config = data;
    updateListOfKnownUUIDs();
});

socket.on('my message', (data) => {
    // Make sure a uuid property was received
    if (data.uuid) {
        checkForUnknownUUID(data.uuid);
    }
});

function checkForUnknownUUID(uuid) {
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

function updateListOfFoundUUIDs() {
    var items = found_uuids.map(function (item) {
        return `<option value="${item}">${item}</option>`;
    });
    newCards.html(items.join(''));
}

function updateListOfKnownUUIDs() {
    var items = known_uuids.map(function (item) {
        return `<option value="${item}">${item}</option>`;
    });
    showCards.html(items.join(''));
    $('#formDevice').hide();
    $('#uuid').val(null);
}

$(document).ready(function () {

    // Read config json and populate known uuids into a multi-select
    // $.getJSON('config.json')
    //     .done(function (data) {
    //         if (data && data.uuids) {
    //             known_uuids = data.uuids;
    //             updateListOfKnownUUIDs();
    //         }
    //     });

    showCards.on('click', function (e) {
        var arr = $(this).val();
        if (arr && arr.length == 1) {
            $('#formDevice').show();
            $('#uuid').val(arr[0]);
            let selected_item = config.data.find((item) => {
                return item.uuid == arr[0];
            });

            if (selected_item) {
                $('#title').val(selected_item.title);
                console.log(selected_item);
                $('#thumb').attr("src", selected_item.image_url);
            } else {
                $('#title').val(null);
                $('#thumb').removeAttr("src");
            }
            
        } else {
            $('#formDevice').hide();
            $('#uuid').val(null);
        }
    });

    // Click Handler for emitting uuids and testing purposes
    emitBtn.on('click', function (e) {
        e.preventDefault();

        // get selected uuids and stuff them into an array
        var arr = [];
        $('#showCards option:selected').each(function () {
            arr.push($(this).val());
        });

        // sending an emit for every selected uuid 
        arr.forEach((item) => {
            socket.emit('my message', { 'uuid': item });
        });
    });

    // Click Handler for adding new uuids to known array
    addBtn.on('click', function (e) {
        e.preventDefault();

        // get selected uuids and stuff them into an array
        var arr = [];
        $('#newCards option:selected').each(function () {
            arr.push($(this).val());
        }).remove();

        // TODO: Multi Select Support. Sending an array of uuids instead.
        // sending an emit for every selected uuid 
        arr.forEach((value) => {
            // TODO: Callback function if message was received!
            socket.emit('add uuid', { 'uuid': value });
            found_uuids = found_uuids.filter(item => item !== value)
        });


    });

    formDevice.on('submit', function (e) {
        e.preventDefault();
        var formData = new FormData(this);

        $('#message').html("Sending data...").show();

        $.ajax({
            url: formDevice.attr('action'),
            type: 'POST',
            data: formData,
            success: function (data) {
                console.log(data);
                formDevice.trigger("reset");
                $('#formDevice').hide();
                $('#uuid').val(null);
                $('#message').html('config saved').addClass('button-success').delay(5000).fadeOut("slow");
            },
            cache: false,
            contentType: false,
            processData: false
        });
    });

});
