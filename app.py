from flask import Flask
import pyromat as pm

app = Flask(__name__)


@app.route('/')
def hello_world():  # put application's code here
    s = pm.get('mp.H2O')
    return "The temperature is T={} K.".format(s.Ts(p=1))


if __name__ == '__main__':
    app.run()
