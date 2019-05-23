#!/usr/bin/env python

import socketio
import argparse
from time import sleep
import RPi.GPIO as GPIO
import MFRC522
import logging
import argparse

sio = socketio.Client()
connected = False

@sio.on('connect')
def on_connect():
    logging.info('server connection established')
    connected = True
    #sio.emit('my message', {'data': 'Hello Server!'})
    #sio.emit('my broadcast message', {'data': 'Hello Everybody!'})

@sio.on('my message')
def on_message(data):
    logging.debug('message received with ', data)

@sio.on('disconnect')
def on_disconnect():
    logging.info('disconnected from server')
    connected = False

def control(command, data):
    sio.emit(command, data)

def exit_gracefully():
    if connected:
        sio.disconnect()

if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG, format='%(asctime)s %(levelname)s %(message)s')

    parser = argparse.ArgumentParser()
    parser.add_argument("-h", "--host", help="Host", default="localhost")
    parser.add_argument("-p", "--port", help="Port", default="3000")
    args = parser.parse_args()

    while not connected:
        try:
            sio.connect('http://%s:%s' % (args.host, args.port))
        except Exception, e:
            logging.error("Can't connect to http://%s:%s - %s", args.host, args.port, e)
            sleep(5)

    GPIO.setwarnings(False)
    MIFAREReader = MFRC522.MFRC522()
    last = 9999999999
    inrange = False

    try:
        while True:
            uid = None
            # Scan for cards
            (status, TagType) = MIFAREReader.MFRC522_Request(MIFAREReader.PICC_REQIDL)
            if status == MIFAREReader.MI_OK:
                # Get the UID of the card
                (status, uid_a) = MIFAREReader.MFRC522_Anticoll()
                if status == MIFAREReader.MI_OK:
                    uid = "%02x-%02x-%02x-%02x" % (uid_a[0], uid_a[1], uid_a[2], uid_a[3])
                    logging.debug("Found Card: %s" % uid)

            if uid and not inrange:
                logging.debug("Start")
                control('rfid', {'uuid': uid, 'event': 'start'})
                last = time()
                inrange = True
            elif inrange and lasst + 1 < time():
                logging.debug("Stop")
                last = 9999999999
                control('rfid', {'uuid': uid, 'event': 'stop'})
                
            sleep(0.1)

    except KeyboardInterrupt:
        print("bye")
    finally:
        exit_gracefully()
        GPIO.cleanup()
