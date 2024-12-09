from flask import redirect, url_for, request
from flask import Blueprint
 
bp = Blueprint('grammer', __name__)

from happytransformer import HappyTextToText
from happytransformer import TTSettings


def Checker(row_text):
    try:
        settings = TTSettings(do_sample=True, top_k=0, temperature=0.5,  min_length=1, max_length=5000)
        happy_tt = HappyTextToText("T5",  "prithivida/grammar_error_correcter_v1")
        text = "gec: " + row_text
        result = happy_tt.generate_text(text, args=settings)
        return result.text
    except Exception as e:
        print(e)


# @bp.route('/')
@bp.route('/check', methods=['POST', 'GET'])

def hello_world():
     if request.method == 'POST':
         try:
            data=request.get_json()
            text=data.get('text')
            print("hhhhhhhhh")
            print(text)
            print("iiiiiiii")
            res=Checker(text)
            print("jjjjjjjjj")
            print(res)
            return res
         except Exception as e:
             print(e)
        

