from flask import Flask, render_template, request
import json
from collections import OrderedDict

import pyromat as pm
from pyrowrapper.pyrocalc_mp1 import compute_critical

from numpy_encoder import NumpyArrayEncoder

app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False


@app.route('/subst_info', methods=['POST'])
def get_info():
    json_data = request.get_json()
    subst = pm.get('mp.'+json_data['subst'])
    data = compute_critical(subst)

    proporder = ['T', 'p', 'd', 'v', 'e', 'h', 's', 'x']
    odata = OrderedDict()
    for i in proporder:
        odata[i] = data[i][0]

    return json.dumps(odata, cls=NumpyArrayEncoder)


@app.route('/')
def hello_world():  # put application's code here
    substs = pm.info('mp', verbose=False)
    substs = [i.split('.')[1] for i in substs]
    return render_template('substance.html', subst_list=substs)


if __name__ == '__main__':
    app.run()
