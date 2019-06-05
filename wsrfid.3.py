#!/usr/bin/env python

import argparse
from time import sleep, time
import RPi.GPIO as GPIO
import MFRC522
import logging
import argparse
import requests


def control(command, data):
    #sio.emit(command, data)
    r = requests.get('http://%s:%s/p' % (args.host, args.port), data)
    print r.url

if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG, format='%(asctime)s %(levelname)s %(message)s')

    parser = argparse.ArgumentParser()
    parser.add_argument("-H", "--host", help="Host", default="localhost")
    parser.add_argument("-p", "--port", help="Port", default="3000")
    parser.add_argument("-i", "--id", help="ID", default="1")
    args = parser.parse_args()


    GPIO.setwarnings(False)
    MIFAREReader = MFRC522.MFRC522()
    last = 9999999999
    lastUid = None
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
            if uid: 
                if not inrange:
                    logging.debug("Start")
                    control('my message', {'uuid': uid, 'event': 'start', 'reader': args.id})
                    inrange = True
                last = time()
                lastUid = uid
            elif inrange and last + 2.3 < time():
                logging.debug("Stop")
                last = 9999999999
                inrange = False
                control('my message', {'uuid': lastUid, 'event': 'stop', 'reader': args.id})
              
            sleep(0.1)

    except KeyboardInterrupt:
        print("bye")
    finally:
        GPIO.cleanup()
