#!/usr/bin/env python

import engineio
import eventlet
import socketio

port = 3000
sio = socketio.Server()
app = socketio.WSGIApp(sio, static_files={
    '/': {'content_type': 'text/html', 'filename': 'templates/index.html'}
})

@sio.on('connect')
def connect(sid, environ):
    print('connect ', sid)
    sio.emit('my message', {'data': 'Hello User!'}, room=sid)

@sio.on('my message')
def message(sid, data):
    print('message ', data)
    sio.emit('my message', data, room=sid)

@sio.on('my broadcast message')
def broadcast(sid, data):
    print('broadcast message', data)
    sio.emit('my message', data)
 
@sio.on('disconnect')
def disconnect(sid):
    print('disconnect ', sid)

if __name__ == '__main__':
    eventlet.wsgi.server(eventlet.listen(('', port)), app)
