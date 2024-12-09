from flask import Flask
from flask_cors import CORS
from routes import grammer,face
app = Flask(__name__)
CORS(app)
# Register blueprints
app.register_blueprint(grammer.bp,url_prefix='/grammer')
app.register_blueprint(face.bp, url_prefix='/face')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
