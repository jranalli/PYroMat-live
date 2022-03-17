from flask import Flask, render_template, request
import json
from collections import OrderedDict

import pyromat as pm
from pyrowrapper import pyrocalc_mp1 as calc

from numpy_encoder import NumpyArrayEncoder

app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False


@app.route('/critical', methods=['POST'])
def get_info():
    json_data = request.get_json()
    subst = pm.get('mp.'+json_data['subst'])
    data = calc.compute_critical(subst)

    return json.dumps(data, cls=NumpyArrayEncoder)


@app.route('/steam_dome', methods=['POST'])
def steam_dome():
    json_data = request.get_json()
    subst = pm.get('mp.'+json_data['subst'])
    data = calc.compute_steamdome(subst)

    return json.dumps(data, cls=NumpyArrayEncoder)


@app.route('/isobars', methods=['POST'])
def isobars():
    json_data = request.get_json()
    subst = pm.get('mp.'+json_data['subst'])
    ps = calc.get_default_lines(subst, 'p', scaling='log')
    data = []
    for p in ps:
        try:
            data.append(calc.compute_iso_line(subst, p=p))
        except pm.utility.PMParamError:
            pass
    return json.dumps(data, cls=NumpyArrayEncoder)


@app.route('/point', methods=['POST'])
def point():
    json_data = request.get_json()
    subst = pm.get('mp.'+json_data.pop('subst'))

    # Fake a random point
    import random
    tlim = subst.Tlim()
    plim = subst.plim()
    slim = subst.s(tlim[0]+10,plim[1]-10), subst.s(tlim[1]-10,plim[0]+10)
    T = random.randrange(int(tlim[0]), int(tlim[1]))
    s = random.randrange(int(slim[0]), int(slim[1]))

    print("T: {}, s: {}.".format(json_data['T'], json_data['s']))
    print("T: {}, s: {}.".format(T, s))
    try:
        data = calc.compute_state(subst, T=T, s=s)
        return json.dumps(data, cls=NumpyArrayEncoder)
    except:
        return "whoops", 500


@app.route('/')
def index():  # put application's code here
    substs = pm.info('mp', verbose=False)
    substs = [i.split('.')[1] for i in substs]
    return render_template('substance.html', subst_list=substs)


if __name__ == '__main__':
    app.run()
