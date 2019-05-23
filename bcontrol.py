#!/usr/bin/env python

from flask import Flask, render_template, request, flash
from flask_wtf import FlaskForm
from wtforms import SubmitField, StringField, IntegerField, SelectField, validators
from flask_bootstrap import Bootstrap
from flask_socketio import SocketIO
import json
import logging
import argparse
import sys
from socket import gethostname

app = Flask(__name__)
app.config['SECRET_KEY'] = 'Thisissomethingsecret'

Bootstrap(app)
socketio = SocketIO(app)


class SettingsForm(FlaskForm):
    image_url = StringField('Image URL', [validators.DataRequired("Please enter URL")])
    page_url = StringField('Page URL', [validators.DataRequired("Please enter URL")])
    send_key = StringField('Send Key')
    uuids = SelectField('Delete UUIDs', coerce=str, choices=[])
    add = SelectField('Add UUIDs in range', coerce=str, choices=[])
    inrange = IntegerField("in Range", [validators.NumberRange(min=1, max=100)])
    startrange = IntegerField("Start Range", [validators.NumberRange(min=1)])
    stoprange = IntegerField("Stop Range", [validators.NumberRange(min=1)])
    timeout = IntegerField("Timeout", [validators.NumberRange(min=1, max=100)])
    submit = SubmitField("Save")

@app.route('/', methods=['GET', 'POST'])
def index():
    form = SettingsForm(request.form)
    form.uuids.choices = [(u"", "Select UUID to delete")] + [(uuid, uuid) for uuid in config['uuids']]
    form.add.choices = [(u"", "Select UUID to add")] + [(uuid, uuid) for uuid in unknown_uuids]
    if form.validate_on_submit():
        config['page_url'] = form.page_url.data
        config['send_key'] = form.send_key.data
        config['image_url'] = form.image_url.data
        if form.uuids.data:
            flash(form.uuids.data + " removed")
            config['uuids'].remove(form.uuids.data)
        elif form.add.data:
            if form.add.data not in config['uuids']:
                flash(form.add.data + " added")
                config['uuids'].append(form.add.data)
                unknown_uuids.remove(form.add.data)
        else:
            config['inrange'] = form.inrange.data
            config['startrange'] = form.startrange.data
            config['stoprange'] = form.stoprange.data
            config['timeout'] = form.timeout.data
            flash("Configuration stored")

        write_config()

    form.uuids.choices = [(u"", "Select UUID to delete")] + [(uuid, uuid) for uuid in config['uuids']]
    form.add.choices = [(u"", "Select UUID to add")] + [(uuid, uuid) for uuid in unknown_uuids]
    form.page_url.data = config['page_url']
    form.send_key.data = config['send_key']
    form.image_url.data = config['image_url']
    form.inrange.data = config['inrange']
    form.startrange.data = config['startrange']
    form.stoprange.data = config['stoprange']
    form.timeout.data = config['timeout']

    return render_template("index.html", form=form, hostname=gethostname())


def messageReceived(methods=['GET', 'POST']):
    print('message was received!!!')

@socketio.on('my event')
def handle_my_custom_event(json, methods=['GET', 'POST']):
    print('received my event: ' + str(json))
    socketio.emit('my response', json, callback=messageReceived)

def read_config(file_name):
    with open(file_name, 'r') as stream:
        try:
            return json.load(stream)
        except Exception, e:
            logging.error("can't read configuration: ", e)
            sys.exit(1)


def write_config():
    try:
        with open(args.config, 'w') as outfile:
            json.dump(config, outfile, sort_keys=True, indent=4, ensure_ascii=False)
    except Exception, e:
        logging.error("can't write configuration: ", e)

    input_device.set_config(config)
    output_device.set_image_url(config['image_url'])
    output_device.set_site_url(config['page_url'])


def control(ret):
    if not output_device:
        return
    s = ret.split(':')
    if s[0] == 'unknown':
        if s[1] and s[1] not in unknown_uuids:
            unknown_uuids.append(s[1])
    elif ret == "start":
        if args.startonly:
            output_device.stop()
        output_device.start()
    elif args.startonly:
        return
    elif ret == "resume":
        output_device.resume()
    elif ret == "pause":
        output_device.pause()
    elif ret == "stop":
        output_device.stop()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("-c", "--config", help="Configuration", default="config.json")
    parser.add_argument("--startonly", action="store_true", help="Just start the video, without pause/resume/rest")
    parser.add_argument("--rfid", action="store_true", help="Input: RFID")
    parser.add_argument("--ibeacon", action="store_true", help="Input: ibeacon")
    parser.add_argument("--chrome", action="store_true", help="Output: chrome")
    parser.add_argument("--chrome_host", help="Chrome remote host")
    parser.add_argument("--chrome_port", help="Chrome remote port", default=9222)
    parser.add_argument("--omxplayer", action="store_true", help="Output: omxplayer")
    args = parser.parse_args()

    if not args.rfid and not args.ibeacon:
        parser.error("select input device")

    if not args.chrome and not args.omxplayer:
        parser.error("select output device")

    # read configuration
    config = read_config(args.config)

    # logging
    logging.basicConfig(level=logging.DEBUG, format='%(asctime)s %(levelname)s %(message)s')

    unknown_uuids = []

    input_device = None
    output_device = None

    if args.rfid:
        from rfid import RFID
        input_device = RFID(app, config, control)
    else:
        from ibeacon import IBeacon
        input_device = IBeacon(config, control)

    if args.chrome:
        from chrome import Chrome
        output_device = Chrome(args.chrome_host, args.chrome_port, config['send_key'])
    else:
        from player import Player
        output_device = Player()

    output_device.set_image_url(config['image_url'])
    output_device.set_site_url(config['page_url'])

    app.run(debug=False, host='0.0.0.0')

    output_device.stop()
    input_device.terminate()
