# PYroMat Live
Development for the hosting of the (PYroMat)[https://github.com/chmarti1/PYroMat] API and live webpages. 


## Development Setup

### Install python and dependencies

```
pip install flask
pip install numpy==1.22.3
pip install pyromat
```

### Activate the app 
Open a terminal (Windows)
```
set FLASK_APP=app
flask run
```

### Browsing the pages
Flask is now hosting the app on your computer. Based on the dev configuration,
HTML is served by the flask app rather than a separate server. This means that 
we need to use a route to access the pages. So currently, subpaths on the URL
serve a static HTML file, as mapped to the `/static/` directory.

For example to navigate to `static/index.html` you'd visit:
```
https://127.0.0.1:5000/index/
```

## Demo hosting
A demo is currently hosted at (PythonAnywhere)[https://jranalli.pythonanywhere.com/]
