
from flask import Flask, redirect, url_for, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

from happytransformer import HappyTextToText
from happytransformer import TTSettings


def checker(row_text):
    settings = TTSettings(do_sample=True, top_k=10, temperature=0.5,  min_length=1, max_length=100)

    happy_tt = HappyTextToText("T5",  "prithivida/grammar_error_correcter_v1")
    text = "gec: " + row_text
   
    result = happy_tt.generate_text(text, args=settings)
    return result.text




@app.route('/', methods=['POST', 'GET'])


def hello_world():
     if request.method == 'POST':
        data=request.get_json()
        text=data.get('text')
        print(text)
        res= checker(text)
        print(res)
        return res





if __name__ == '__main__':

    # run() method of Flask class runs the application 
    # on the local development server.
    app.run()