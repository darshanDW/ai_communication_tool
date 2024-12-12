from flask import request, current_app, flash, redirect,jsonify
from flask import Blueprint
from werkzeug.utils import secure_filename
import os
import librosa
import numpy as np
from dotenv import load_dotenv
import google.generativeai as genai

from collections import Counter
bp = Blueprint('grammer', __name__)
import regex as re


load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

UPLOAD_FOLDER = 'C:/Users/asus/OneDrive/Documents/Communication-Assessment-Tool[1]/Communication-Assessment-Tool/backend'
ALLOWED_EXTENSIONS = {'wav', 'mp3'}

# Function to check if the file extension is allowed
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


"""
def Checker(row_text):
    try:
        # Initialize the model
        settings = TTSettings(do_sample=False,  # Disable random sampling
    top_k=1,          # Use the top-most likely prediction
    temperature=0.3,   # Lower temperature for less randomness
    min_length=len(row_text.split())-20,  # Set the minimum length to match the original text's word count
    max_length=len(row_text.split()) + 65 )
        happy_tt = HappyTextToText("T5", "prithivida/grammar_error_correcter_v1")
        
        # Process the text
        text = "gec: " + row_text
        result = happy_tt.generate_text(text, args=settings)
        corrected_text = result.text

        # Highlight corrections
        original_words = row_text.split()
        corrected_words = corrected_text.split()
        total_words = len(original_words)
        corrected_count = 0
        highlighted_text = []

        # Compare words and highlight differences
        for original, corrected in zip(original_words, corrected_words):
            print(original, corrected)
            if original != corrected:
                highlighted_text.append(f"[{corrected}]")
                corrected_count += 1  # Increment correction count
            else:
                highlighted_text.append(corrected)

        # Handle cases where lengths differ
      

        # Join back into a sentence
        highlighted_sentence = " ".join(highlighted_text)

        # Ensure total_words is non-zero before calculating the score
        if total_words > 0:
            score = (corrected_count / total_words) * 100
        else:
            score = 0  # Handle edge case when there are no words

        print("Score:", score)

        # Display results
        print("Original Text:", row_text)
        print("Corrected Text:", corrected_text)
        print("Highlighted Text:", highlighted_sentence)

        return highlighted_sentence, score

    except Exception as e:
        print("Error:", e)
        return None, 0

# Example usage


defaults = {
 
    'temperature': 0.1,
    'candidate_count': 1,
    'top_k': 40,
    'top_p': 0.95,
    'max_output_tokens': 9000,
}
"""
def grammar_checker(text):

    model = genai.GenerativeModel("gemini-pro")

    # Define the prompt for the grammar correction task
    prompt_correction = (
     f"""You are a highly skilled language analyst with extensive experience in grammar and spelling correction. Your task is to review and correct the following text.

### STRICT INSTRUCTIONS:
1. **All corrections must be enclosed in square brackets** (e.g., replacing "tninking" with "[thinking]").
2. **Avoid adding any new words** that are not in the original text. Only correct existing words or structures.
3. If a word, phrase, or punctuation mark is already correct, leave it unchanged.
4. At the end of your response, provide a **grammar score** between 0 and 100 based on the number and severity of grammar and spelling mistakes.

Here is the text to correct:
Text: {text}

Your output must strictly adhere to the following JSON format:

  "response_text": "<Corrected text with all corrections in square brackets>","example : [thinking]",
  "grammar_score: <Score between 0 and 100>"


### NOTES:
- Do not use triple backticks (` ``` `) in your response.
- Do not include any additional commentary or words outside the required format.
- Ensure the corrected text retains its original meaning and avoids stylistic changes.

Now, proceed to correct the text.

    """

    )

    try:
        # Send the prompt to the AI API
        response = model.generate_content(
    [text, prompt_correction],
    generation_config={
        'temperature': 0.25,
        'candidate_count': 1,
        'top_k': 40,
        'top_p': 0.95,
        'max_output_tokens': 9000
    }
)



       
        corrected_text = eval(response.text.strip())  # Assuming response.text is a JSON string

        # Extract values
        response_text = corrected_text["response_text"]
        grammar_score = corrected_text["grammar_score"]

        print("Response Text:", response_text)
        print("Grammar Score:", grammar_score)

        return response_text, grammar_score

    except Exception as e:
        # Handle API errors
        print(f"Error during grammar checking: {e}")
        return None, None  # Return None values on error

# Test the function
text = "Okay, so, lika, I was tninking, you kmow, that we shold, uh, really start, like, geting to the point. Honestly, I mean, it’s very impotant to, like, get everything in order. You know, I was just, kind of, think we could, uh, maybe work on this next, right? But, like, for now, let’s just focus on, you know, this task. Anyway, it’s rally, like, not that difficlt, but we should still, uh, probably be careful, you know?"
#response_text, grammar_score = grammar_checker(text)


# Test the function




# List of common filler words

def count_filler_word_frequency(text):
    
    filler_words = ["like", "you know", "actually", "basically", "seriously", "okay", "so", 
    "I mean", "obviously", "right", "honestly", "kind of", "sort of", "basically", 
    "literally", "look", "see", "well", "anyway", "hmm", "uh", "um", "eh", "and", 
    "but", "also", "really", "just", "okay", "I guess", "you see", "for example",
    "I suppose", "very", "just", "for what it’s worth", "I mean", "really", "you know", 
    "highly", "like I said", "totally", "or something like that", "simply", "kind of", 
    "sort of", "most", "and etc.", "somehow", "due to", "slightly", "empty out", 
    "absolutely", "for all intents and purposes", "literally", "in terms of", "certainly", 
    "I think", "I believe", "honestly", "of course", "personally", "in order to", 
    "quite", "in fact", "perhaps", "in conclusion", "so", "not to mention", "completely", 
    "while that's true", "while it's true", "somewhat", "on the other hand", "however", 
    "ok, so", "utterly", "well", "at the end of the day", "now", "believe me", "all of", 
    "you know what I mean?", "still"
       ]

    text = text.lower()  # Normalize text to lowercase
    word_count = Counter()

    # Count occurrences of each filler word
    for word in filler_words:
        word_count[word] = len(re.findall(r'\b' + re.escape(word) + r'\b', text))

    return word_count

def top_filler_words(text):
  
    word_frequency = count_filler_word_frequency(text)
    
    # Sort the word frequencies in descending order and get the top N
    top_words = word_frequency.most_common(5)
    
    return top_words

# Example Text (can replace with speech-to-text result)

# Get the top 5 filler words















# Path to the audio file (update this path in your script)
"""# Analyze pauses in the audio file
pauses = analyze_pauses(audio_file_path)

# Print pauses in the audio
if pauses:
    for i, pause in enumerate(pauses):
        print(f"Pause {i+1}: {pause['start']}ms to {pause['end']}ms")
else:
    print("No pauses detected.")


"""










def detect_pauses(audio_file_path ):
    """
    Detects pauses (silences) in the given audio file and returns their start times and durations.

    Parameters:
    - audio_file_path (str): Path to the audio file (.wav).
    - threshold (float): Energy threshold for silence detection. Lower values will detect softer silences.

    Returns:
    - pause_start_times (list): List of start times of pauses in seconds.
    - pause_durations (list): List of durations of pauses in seconds.
    """
    threshold=0.007
    # Load the audio file
    y, sr = librosa.load(audio_file_path, sr=None)

    # Calculate short-time energy (for detecting silences)
    energy = librosa.feature.rms(y=y)

    # Detect silent frames
    silent_frames = np.where(energy < threshold)[1]

    # Initialize variables for detecting pauses
    pause_durations = []
    pause_start_times = []
    pause_ends=[]
    current_pause_start = None

    # Iterate over the silent frames to detect pause starts and durations
    for idx, frame in enumerate(silent_frames):
        # If it's the first frame of the pause or a continuation of a pause
        if current_pause_start is None:
            current_pause_start = librosa.frames_to_time(frame, sr=sr)
        # If it's the end of the pause
        if idx == len(silent_frames) - 1 or silent_frames[idx + 1] != frame + 1:
            pause_end = librosa.frames_to_time(frame + 1, sr=sr)  # End of the pause
            pause_ends.append(pause_end)
            pause_duration = pause_end - current_pause_start
            pause_durations.append(pause_duration)
            pause_start_times.append(current_pause_start)
            current_pause_start = None  # Reset for the next pause

    return pause_start_times, pause_durations,pause_ends


# Example usage
audio_file_path = "C:/Users/asus/OneDrive/Documents/Communication-Assessment-Tool[1]/Communication-Assessment-Tool/backend/Recording (3).wav"

#start_times, durations,pause_ends = detect_pauses(audio_file_path)

# Display results
"""
for idx, (start, duration,end) in enumerate(zip(start_times, durations,pause_ends)):
    if(duration>1):
     print(f"Pause {idx+1}: Start = {start:.2f} seconds, Duration = {duration:.2f} seconds, ends={end:.2f}" )"""



















# @bp.route('/')
@bp.route('/check', methods=['POST', 'GET'])

def text_analysis():
     if request.method == 'POST':
         try:

            data=request.get_json()
            print(data)
            text=data.get('transcript')
          
            response_text,grammar_score=grammar_checker(text)
            top_words=top_filler_words(text)

            return jsonify({
                "highlighted_sentence": response_text,
                "score": grammar_score,
                "top_words": top_words
            })  
           
         except Exception as e:
           print(e)


@bp.route('/check_pauses', methods=['POST', 'GET'])

@bp.route('/check_pauses', methods=['POST', 'GET'])
def audio_analysis():
    try:
      if request.method == 'POST':
        # Check if 'audio_data' exists in the request
         if 'audio_data' not in request.files:
            return jsonify({"error": "No audio_data key in request"}), 400
        
         audio_file = request.files['audio_data']

        # Save the file to the specified path
         file_path = os.path.join(UPLOAD_FOLDER, "recorded_audio.wav")
         audio_file.save(file_path)
        

            # Process the audio file (e.g., detect pauses)
            # pause_start_times, pause_durations, pause_ends = detect_pauses(target_path)
            # Add your processing logic here

            # Further processing like pause detection
         pause_start_times, pause_durations, pause_ends = detect_pauses(file_path)
         print("Pause Durations:", pause_durations)
         return jsonify({"message": "Success", "pause_durations": pause_durations}),200

    except Exception as e:
            print(f"Error: {e}")
            return jsonify({"error": str(e)}), 500
