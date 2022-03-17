from flask import Flask, render_template, request
import json
from collections import OrderedDict

import pyromat as pm
from pyrowrapper.pyrocalc_mp1 import compute_critical, compute_steamdome, compute_iso_line

from numpy_encoder import NumpyArrayEncoder

app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False


@app.route('/subst_info', methods=['POST'])
def get_info():
    json_data = request.get_json()
    subst = pm.get('mp.'+json_data['subst'])
    data = compute_critical(subst)

    return json.dumps(data, cls=NumpyArrayEncoder)


@app.route('/steam_dome', methods=['POST'])
def steam_dome():
    json_data = request.get_json()
    subst = pm.get('mp.'+json_data['subst'])
    data = compute_steamdome(subst)

    return json.dumps(data, cls=NumpyArrayEncoder)

@app.route('/isobars', methods=['POST'])
def isobar():
    json_data = request.get_json()
    subst = pm.get('mp.'+json_data['subst'])
    data = compute_iso_line(subst, p=1)
    return json.dumps(data, cls=NumpyArrayEncoder)


@app.route('/')
def hello_world():  # put application's code here
    substs = pm.info('mp', verbose=False)
    substs = [i.split('.')[1] for i in substs]
    return render_template('substance.html', subst_list=substs)


if __name__ == '__main__':
    app.run()
