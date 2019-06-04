var socket = io(), // connect to the websocket
    showCards = $('#showCards'),
    newCards = $('#newCards'),
    emitBtn = $('#emitBtn'),
    addBtn = $('#addBtn'),
    removeBtn = $('#removeBtn'),
    saveAppBtn = $('#saveAppBtn'),
    saveCardBtn = $('#saveCardBtn'),
    formApp = $('#formApp'),
    formCard = $('#formCard'),
    foundData = [],
    config;
    
message('Socket is connected: ' + socket.connected, 'warn');

// On Connect Handler for the Websocket
socket.on('connect', () => {
    console.log('Socket is connected: ' + socket.connected);
    message('Socket is connected: ' + socket.connected, 'success');
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
socket.on('config', data => {
    config = data;
    updateKnownUUIDs();
    updateForm();
    $('#blocker').hide();
});

socket.on('my message', msg => {
    // Make sure a uuid property was received
    if (msg.uuid && msg.event == "start") {
        checkUnknownUUID(msg.uuid);
    }
});

function checkUnknownUUID(uuid) {
    // Make sure the uuid is note already known
    if (config.data.findIndex(item => item.uuid == uuid) == -1) {
        console.info(`UUID(${uuid}) is unknown!`);
        // Make sure the uuid wasn't found before
        if (!foundData.includes(uuid)) {
            // Push UUID to the found array
            foundData.push(uuid);
            console.info(`New UUID(${uuid}) found!`);
            message(`New UUID(${uuid}) found!`, 'info');
            // Update list of new devices
            updateFoundUUIDs();

        } else {
            console.warn(`UUID(${uuid}) was already found!`);
            message(`UUID(${uuid}) was already found!`, 'warn');
        }
    } else {
        console.warn(`UUID(${uuid}) is already registered!`);
        message(`UUID(${uuid}) is already registered!`, 'warn');
    }
}

function message(str, level) {
    $('#message').html(str).removeClass().addClass(level).show().delay(5000).fadeOut("slow");
}

function updateFoundUUIDs() {
    var items = foundData.map(function (item) {
        return `<option value="${item}">${item}</option>`;
    });
    newCards.html(items.join(''));
    if (foundData.length) {
        addBtn.prop('disabled', false);
    } else {
        addBtn.prop('disabled', true);
    }
}

function updateKnownUUIDs() {
    var items = config.data.map(function (item) {
        return `<option value="${item.uuid}">${item.uuid}</option>`;
    });
    showCards.html(items.join(''));
    $('#formDevice').hide();
    $('#uuid').val(null);
}

function updateForm() {
    $('#logoURL').val(config.logoURL);
    $('#siteURL').val(config.siteURL);
}

$(document).ready(function () {

    updateFoundUUIDs();

    showCards.on('click', function (e) {
        var arr = $(this).val();
        if (arr && arr.length == 1) {
            formCard.show();
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
            formCard.hide();
            $('#uuid').val(null);
        }
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
        if (arr.length) {
            arr.forEach((value) => {
                // TODO: Callback function if message was received!
                socket.emit('add uuid', { 'uuid': value });
                // Remove uuid from the new cards drop down
                foundData = foundData.filter(item => item !== value);
            });
    
            $('#blocker').show();
        }
    });

    // Click Handler for emitting uuids and testing purposes
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

    formApp.on('submit', function (e) {
        e.preventDefault();
        var formData = new FormData(this);

        message('Sending data...', 'info');
        $.ajax({
            url: $(this).attr('action'),
            type: 'POST',
            data: formData,
            success: function (data) {
                console.log(data);
                message('config saved', 'success');
                $('#blocker').show();
            },
            error: function (request, status, error) {
                let response = JSON.parse(request.responseText);
                message(`Message: ${response.message} | StatusText: ${status}`, 'error')
            },
            cache: false,
            contentType: false,
            processData: false
        });
    });

    formCard.on('submit', function (e) {
        e.preventDefault();
        var formData = new FormData();
        formData.append('uuid', $('#uuid').val());
        formData.append('title', $('#title').val());

        // Make sure upload file is selected
        if ($('#image')[0].files[0]) {
            formData.append('image', $('#image')[0].files[0]);
        }

        // Submitting form
        message('Sending data...', 'info');
        $.ajax({
            url: $(this).attr('action'),
            type: 'POST',
            data: formData,
            success: function (data) {
                console.log(data);
                formCard.trigger("reset");
                formCard.hide();
                $('#uuid').val(null);
                message('config saved', 'success');
                $('#blocker').show();
            },
            error: function (request, status, error) {
                let response = JSON.parse(request.responseText);
                message(`Message: ${response.message} | StatusText: ${status}`, 'error')
            },
            cache: false,
            contentType: false,
            processData: false
        });
    });

});
