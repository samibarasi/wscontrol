#!/usr/bin/env python

import socketio
import argparse
from time import sleep

host = 'localhost'
port = 3000
sio = socketio.Client()
connected = False

@sio.on('connect')
def on_connect():
    print('connection established')
    connected = True
    sio.emit('my message', {'data': 'Hello Server!'})
    sio.emit('my broadcast message', {'data': 'Hello Everybody!'})
    
    

@sio.on('my message')
def on_message(data):
    print('message received with ', data)

@sio.on('disconnect')
def on_disconnect():
    print('disconnected from server')
    connected = False

def control(command, data):
    sio.emit(command, data)

def exit_gracefully():
    if connected:
        sio.disconnect()

if __name__ == '__main__':
    sio.connect('http://%s:%s' % (host, port))
    try:
        while True:
            sleep(10)
            control('my message', {'uuid': '34-c5-f1-a5', 'event': 'start'})
    except KeyboardInterrupt:
        print("bye")
        pass
    finally:
        exit_gracefully()
