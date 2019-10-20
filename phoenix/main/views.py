import os
import datetime
from astropy import coordinates as coord
from astropy import units as u
from astropy.time import Time

from sgp4.earth_gravity import wgs72
from sgp4.io import twoline2rv

import requests

SATELLITES = os.path.join(os.path.dirname(__file__), '../data/active.txt')

import json

from flask import Blueprint, render_template_string, jsonify, make_response

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


@blueprint.route('/info/<string:sat_id>', methods=['GET'])
def sat_info(sat_id):
    # take frontend sat_id and return celestrak metadata html
    # load via jquery in modal on frontend
    """
    port falkos code to backend
     function get_celestrak_url(internal_designator) {
         //internal designator id looks like 1964-063B
         //data example https://celestrak.com/satcat/1964/1964-063.php#C
         [year, sub_id] = internal_designator.split("-");
         return "https://celestrak.com/satcat/" + year + "/" + internal_designator.slice(0, -1) + ".php#
          + internal_designator.slice(-1);
    """
    # the frontend sat_id is still in this TLE format...

    # 4	10–11	International Designator (last two digits of launch year)	98
    # 5	12–14	International Designator (launch number of the year)	067
    # 6	15–17	International Designator (piece of the launch)	A

    launch_year = int(sat_id[0:2])
    year = 1900 + launch_year if launch_year > 50 else 2000 + launch_year
    launch_number_str = sat_id[2:5]
    launch_piece = sat_id[5:]

    full_sat_id = "%d-%s" % (year, launch_number_str)

    if year >= 2013:
        # not satcat data on the database
        response = make_response("<span>Newer than 2012... NO SATCAT DATA AVAILABLE :(</span>", 200)

    else:

        url = "https://celestrak.com/satcat/%d/%s.php#%s" % (year, full_sat_id, launch_piece)
        resp = requests.get(url)
        try:
            resp.raise_for_status()
        except:
            response = make_response("<span>Pick another :) The programmer was too lazy :(</span>", 200)
        else:
            response = make_response(resp.content, 200)
    response.headers.add('Access-Control-Allow-Origin', 'https://majortom.outdated.at')
    return response


@blueprint.route('/satellite_position.json')
def satellite_position():
    """not used"""
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
