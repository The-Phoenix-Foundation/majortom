import os
import datetime
from astropy import coordinates as coord
from astropy import units as u
from astropy.time import Time

from sgp4.earth_gravity import wgs72
from sgp4.io import twoline2rv

SATELLITES = os.path.join(os.path.dirname(__file__), '../data/active.txt')

import json

from flask import Blueprint, render_template_string, jsonify

blueprint = Blueprint('main', __name__, static_folder='../static')


@blueprint.route('/')
def index():
    return render_template_string("<html><body>START</body></html>")


@blueprint.route('/satellites')
def satellites():
    satellites = []
    with open(SATELLITES, 'r') as f:
        data = f.read().splitlines(False)
    for j, i in enumerate(range(0, len(data), 3)):
        satellites.append({
            'name': data[i].strip(),
            'catalog_number': data[i+1][2:7],
            'id': data[i+1][9:17].strip(),
            'line1': data[i+1],
            'line2': data[i+2],
            'category': j % 3,  # FIXME: we have 3 models so far :) this should be replaced with magic
        })
    return jsonify(satellites)


@blueprint.route('/satellite_position.json')
def satellite_position():




    # Hardcoded for one satellite
    satellite_name = "ODIN"
    satellite_line1 = '1 26702U 01007A   19291.79098765 -.00000023  00000-0  25505-5 0  9996'
    satellite_line2 = '2 26702  97.5699 307.6930 0011485  26.4207 333.7604 15.07886437 19647'

    current_time = datetime.datetime.now()

    satellite = twoline2rv(satellite_line1, satellite_line2, wgs72)
    position, velocity = satellite.propagate(
        current_time.year,
        current_time.month,
        current_time.day,
        current_time.hour,
        current_time.minute,
        current_time.second)

    now = Time.now()
    # position of satellite in GCRS or J20000 ECI:
    cartrep = coord.CartesianRepresentation(x=position[0],
                                            y=position[1],
                                            z=position[2], unit=u.m)
    gcrs = coord.GCRS(cartrep, obstime=now)
    itrs = gcrs.transform_to(coord.ITRS(obstime=now))
    loc = coord.EarthLocation(*itrs.cartesian.xyz)

    return jsonify({
        'eci': {'x': position[0], 'y': position[1], 'z': position[2]},
        'geodetic': {'latitude': loc.lat.deg, 'longitude': loc.lon.deg, 'height': loc.height.to(u.m).value}
    })
