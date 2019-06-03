var socket = io(), // connect to the websocket
    showCards = $('#showCards'),
    newCards = $('#newCards'),
    emitBtn = $('#emitBtn'),
    addBtn = $('#addBtn'),
    removeBtn = $('#removeBtn'),
    saveBtn = $('#saveBtn'),
    formDevice = $('#formDevice'),
    foundData = [],
    config;

// On Connect Handler for the Websocket
socket.on('connect', () => {
    console.log('Socket is connected: ' + socket.connected);
    // Say Hello
    socket.emit('my message', { 'data': 'Hello Server!' });
    socket.emit('my broadcast message', { 'data': 'Hello Everybody!' });

    // Subcribe to room
    socket.emit('subscribe', { 'room': 'guardians-of-the-galaxy' });

    //$('#blocker').hide();

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
    config = data;
    updateListOfKnownUUIDs();
    $('#blocker').hide();
});

socket.on('my message', (data) => {
    // Make sure a uuid property was received
    if (data.uuid) {
        checkForUnknownUUID(data.uuid);
    }
});

function checkForUnknownUUID(uuid) {
    // Make sure the uuid is note already known
    if (config.data.findIndex(item => item.uuid == uuid) == -1) {
        console.info(`UUID(${uuid}) is unknown!`);
        // Make sure the uuid wasn't found before
        if (!foundData.includes(uuid)) {
            // Push UUID to the found array
            foundData.push(uuid);
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
    var items = foundData.map(function (item) {
        return `<option value="${item}">${item}</option>`;
    });
    newCards.html(items.join(''));
}

function updateListOfKnownUUIDs() {
    var items = config.data.map(function (item) {
        return `<option value="${item.uuid}">${item.uuid}</option>`;
    });
    showCards.html(items.join(''));
    $('#formDevice').hide();
    $('#uuid').val(null);
}

$(document).ready(function () {

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
            socket.emit('my message', { 'uuid': item , 'event': 'start'});
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
            // Remove uuid from the new cards drop down
            foundData = foundData.filter(item => item !== value);
        });

        $('#blocker').show();


    });


    removeBtn.on('click', function(e) {
        e.preventDefault();

        // get selected uuids and stuff them into an array
        var arr = [];
        $('#showCards option:selected').each(function () {
            arr.push($(this).val());
        })
        //.remove();

        // TODO: Multi Select Support. Sending an array of uuids instead.
        // sending an emit for every selected uuid 
        arr.forEach((value) => {
            // TODO: Callback function if message was received!
            socket.emit('remove uuid', { 'uuid': value });
        });

        $('#blocker').show();

    });

    formDevice.on('submit', function (e) {
        console.log($('#image')[0].files[0]);
        e.preventDefault();
        var formData = new FormData(this);
        if ($('#image')[0].files[0]) {
            formData.delete('image');
        }

        $('#message').html("Sending data...").show();
        $('#message').removeClass().addClass('info');

        $.ajax({
            url: formDevice.attr('action'),
            type: 'POST',
            data: formData,
            success: function (data) {
                console.log(data);
                formDevice.trigger("reset");
                $('#formDevice').hide();
                $('#uuid').val(null);
                $('#message').html('config saved').removeClass().addClass('success').delay(5000).fadeOut("slow");
            },
            error: function (request, status, error) {
                let response = JSON.parse(request.responseText);
                $('#message').html(`Message: ${response.message} | StatusText: ${status}`).removeClass().addClass('error');
            },
            cache: false,
            contentType: false,
            processData: false
        });
    });

});
