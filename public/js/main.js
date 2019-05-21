var socket = io(), // connect to the websocket, standard is localhost and the same port
    showCards = $('#showCards'),
    emitBtn = $('#emitBtn')
    uuids = [];

// On Connect Handler for the Websocket
socket.on('connect', () => {
    console.log(socket.connected);
    socket.emit('my message', {'data': 'Hello Server!'});
    socket.emit('my broadcast message', {'data': 'Hello Everybody!'});
});

$(document).ready(function() {

    // Read config json and populate known uuids into a multi-select
    $.getJSON('config.json')
    .done(function(data) {
        var items, content, select;
        if (data && data.uuids) {
            items = data.uuids.map(function(item) {
                return `<option value="${item}">${item}</option>`;
            });
            showCards.html(items.join(''));
        }
    });

    // Click Handler for emitting uuids and testing purposes
    emitBtn.on('click', function(e) {
        e.preventDefault();
        
        // get selected uuids and stuff them into an array
        var arr = [];
        $('#showCards option:selected').each(function() {
            arr.push($(this).val());
        });

        // sending an emit for every selected uuid 
        arr.forEach((item) => {
            socket.emit('my message', {'data': item});
        });
    })
});
