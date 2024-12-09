from flask import render_template, Response
import cv2
import time

from flask import Blueprint

bp = Blueprint('face', __name__)
camera = None

 
# Load pre-trained Haar cascades for face and eye detection
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

# Global variables to track engagement
total_time = 0
eye_contact_time = 0
tracking_started = False  # Flag to track when to start counting
start_time = None         # Start time for the session


def process_frame(frame):
    global total_time, eye_contact_time, tracking_started, start_time

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

    eye_contact = False

    for (x, y, w, h) in faces:
        cv2.rectangle(frame, (x, y), (x + w, y + h), (255, 0, 0), 2)
        roi_gray = gray[y:y + h, x:x + w]
        roi_color = frame[y:y + h, x:x + w]

        eyes = eye_cascade.detectMultiScale(roi_gray)
        for (ex, ey, ew, eh) in eyes:
            eye_contact = True
            cv2.rectangle(roi_color, (ex, ey), (ex + ew, ey + eh), (0, 255, 0), 2)

    # Start tracking when eye contact is first detected
    if not tracking_started and eye_contact:
        tracking_started = True
        start_time = time.time()  # Start the timer

    if tracking_started:
        current_time = time.time()
        frame_time = current_time - start_time  # Time elapsed since start
        start_time = current_time  # Reset start_time for next frame
        total_time += frame_time  # Add to total session time

        if eye_contact:
            eye_contact_time += frame_time  # Add to engagement time

    # Calculate engagement score
    engagement_score = int((eye_contact_time / total_time) * 100) if total_time > 0 else 0

    # Overlay feedback on the frame
    feedback_text = f"Engagement Score: {engagement_score}%"
    eye_contact_text = f"eye contact time: {eye_contact_time}%"
    status_color = (0, 255, 0) if eye_contact else (0, 0, 255)
    status_text = "Eye Contact: Maintained" if eye_contact else "Eye Contact: Lost"

    cv2.putText(frame, feedback_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    cv2.putText(frame, eye_contact_text, (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    cv2.putText(frame, status_text, (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, status_color, 2)

    return frame


def generate_frames():
    global camera
    camera = cv2.VideoCapture(0)

    try:
        while True:
            success, frame = camera.read()
            if not success:
                break
            else:
                processed_frame = process_frame(frame)
                _, buffer = cv2.imencode('.jpg', processed_frame)
                frame = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
    except GeneratorExit:
        # Cleanup when client disconnects
        camera.release()
        print("Client disconnected, camera released.")




@bp.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')


@bp.route('/stop_camera', methods=['POST'])
def stop_camera():
    global camera,total_time,eye_contact_time,tracking_started,start_time
    
    camera.release()  # Release the camera
    camera = cv2.VideoCapture(0)  # Reinitialize for the next start
    total_time = 0
    eye_contact_time = 0
    tracking_started = False  # Flag to track when to start counting
    start_time = None
    return "Camera stopped", 200

