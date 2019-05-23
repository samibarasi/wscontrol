#!/usr/bin/env python

import RPi.GPIO as GPIO
import MFRC522
from flask_apscheduler import APScheduler
import logging
from time import time

class RFID:
    def __init__(self, app, config, ret):
        self.app = app
        self.config = config
        self.ret = ret
        self.last = 9999999999
        self.inrange = False
        self.resume = False

        GPIO.setwarnings(False)

        # Create an object of the class MFRC522
        self.MIFAREReader = MFRC522.MFRC522()

        self.app.config['JOBS'] = [
            {
                'id': 'job1',
                'func': 'rfid:read_rfid',
                'args': [self],
                'trigger': 'interval',
                'seconds': .1
            }
        ]

        self.scheduler = APScheduler()
        logging.getLogger('apscheduler').setLevel(logging.CRITICAL)
        self.scheduler.api_enabled = True
        self.scheduler.init_app(app)
        self.scheduler.start()

    def set_config(self, config):
        self.config = config

    def terminate(self):
        GPIO.cleanup()
        self.scheduler.shutdown()


def read_rfid(rfid):
    uid = None

    # Scan for cards
    (status, TagType) = rfid.MIFAREReader.MFRC522_Request(rfid.MIFAREReader.PICC_REQIDL)
    if status == rfid.MIFAREReader.MI_OK:
        # Get the UID of the card
        (status, uid_a) = rfid.MIFAREReader.MFRC522_Anticoll()
        if status == rfid.MIFAREReader.MI_OK:
            uid = "%02x-%02x-%02x-%02x" % (uid_a[0], uid_a[1], uid_a[2], uid_a[3])
            logging.debug("Found Card: %s" % uid)

    if uid in rfid.config['uuids']:
        if not rfid.inrange:
            logging.debug("Start")
            rfid.inrange = True
            if rfid.resume:
                rfid.ret("resume")
                rfid.resume = False
            else:
                rfid.ret("start")
        rfid.last = time()
    else:
        if uid:
            rfid.ret("unknown:%s" % uid)
        if rfid.last + rfid.config['timeout'] < time():
            logging.debug("Reset")
            rfid.inrange = False
            rfid.resume = False
            rfid.last = 9999999999
            rfid.ret("stop")
        elif rfid.inrange and rfid.last + 1 < time():
            logging.debug("Pause")
            rfid.inrange = False
            rfid.resume = True
            rfid.ret("pause")

def _test_callback(msg):
    print "callback: " + str(msg)

if __name__ == '__main__':
    import argparse
    import sys
    import json

    parser = argparse.ArgumentParser()
    parser.add_argument("-c", "--config", help="Configuration", default="config.json")
    args = parser.parse_args()
    config = {}
    logging.basicConfig(level=logging.DEBUG, format='%(asctime)s %(levelname)s %(message)s')
    with open(args.config, 'r') as stream:
        try:
            config = json.load(stream)
        except Exception, e:
            logging.error("can't read configuration: %s", e)
            sys.exit(1)

    from flask import Flask

    app = Flask(__name__)

    input = RFID(app, config, _test_callback)

    app.run(debug=False, host='0.0.0.0')

    input.terminate()
