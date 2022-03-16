from flask import Flask, render_template, request, jsonify
from collections import OrderedDict
import pyromat as pm

app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False


def compute_critical(subst):

    Tc, pc, dc = subst.critical(density=True)
    hc, sc, _ = subst.hsd(T=Tc, p=pc)
    ec = subst.e(T=Tc, p=pc)
    vc = 1/dc
    xc = 0

    critical = {
            'p': pc,
            'T': Tc,
            's': sc[0],
            'h': hc[0],
            'v': vc,
            'd': dc,
            'e': ec[0],
            'x': xc
        }
    return critical



@app.route('/subst_info', methods=['POST'])
def get_info():
    json_data = request.get_json()
    # print(json_data['subst'])
    subst = pm.get('mp.'+json_data['subst'])
    data = compute_critical(subst)

    proporder = ['T','p','d','v','e','h','s','x']
    odata = OrderedDict()
    for i in proporder:
        odata[i] = data[i]

    return jsonify(odata)


@app.route('/')
def hello_world():  # put application's code here
    substs = pm.info('mp', verbose=False)
    substs = [i.split('.')[1] for i in substs]
    return render_template('substance.html', subst_list=substs)

if __name__ == '__main__':
    app.run()
