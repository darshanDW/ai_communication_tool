import os
from flask import Flask
from flask_cors import CORS
from routes import grammer, face
from dotenv import load_dotenv

# Load environment variables from .env file (for local development)
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Register blueprints
app.register_blueprint(grammer.bp, url_prefix='/grammer')
app.register_blueprint(face.bp, url_prefix='/face')

# Set upload folder
app.config['UPLOAD_FOLDER'] = 'C:/Users/asus/OneDrive/Documents/Communication-Assessment-Tool[1]/Communication-Assessment-Tool/backend'

# Get port from environment variables, default to 5000 if not set
port = os.getenv('PORT', 10000)

if __name__ == '__main__':
    # Run the app on the specified port
    app.run(debug=True, port=port)
