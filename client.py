#!/usr/bin/env python

import socketio
import argparse
from time import sleep

host = 'localhost'
port = 3000
sio = socketio.Client()

@sio.on('connect')
def on_connect():
    print('connection established')
    sio.emit('my message', {'data': 'Hello Server!'})
    sio.emit('my broadcast message', {'data': 'Hello Everybody!'})
    
    

@sio.on('my message')
def on_message(data):
    print('message received with ', data)

@sio.on('disconnect')
def on_disconnect():
    print('disconnected from server')

def control(command, uid):
    sio.emit('my message', {'command': command, 'uid': uid})

def exit_gracefully():
    sio.disconnect()

if __name__ == '__main__':
    sio.connect('http://%s:%s' % (host, port))
    try:
        while True:
            sleep(10)
    except KeyboardInterrupt:
        print("bye");
        pass
    finally:
        exit_gracefully()
