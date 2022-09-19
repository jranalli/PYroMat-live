# flaskHosted
PythonAnywhere Hosted Flask App demo

Instructions for installing

```
pip install flask
pip install numpy==1.22.3
pip install pyromat
```

Open a terminal (Windows)
```
set FLASK_APP=app
flask run
```

You now have the flask app running and can navigate to the hosted pages in your browser. The way the app is configured, you navigate to `https://site/<pagename>/` to get one of the HTML pages stored in the `/static/` directory.

For example to navigate to `static/index.html` you'd visit:
```
https://127.0.0.1:5000/index/
```


# pythonanywhere
mkvirtualenv --python=/usr/bin/python3.8 venv
workon venv
