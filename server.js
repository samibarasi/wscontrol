var express = require('express'),
    app = express(),
    http = require('http').createServer(app),
    io = require('socket.io')(http),
    port = 3000;

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', function(socket) {
    console.log('a user connected');

    socket.on('my message', function(msg) {
        console.log('my message', msg);
    });

    socket.on('my broadcast message', function(msg) {
        console.log('my broadcast message', msg);
        socket.broadcast.emit('my message', msg);
    });

    socket.on('start', function(msg) {
        console.log('start', msg.uuid);
    });

    socket.on('pause', function(msg) {
        console.log('pause');
    });

    socket.on('reset', function(msg) {
        console.log('reset');
    });

    socket.on('disconnect', function(){
        console.log('user disconnected');
    });

    socket.emit('my message', {'data': 'Hello User!'});
    
});

var listener = http.listen(port, function() {
    console.log(`listening on port ${listener.address().port}`);
});