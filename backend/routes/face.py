from flask import Blueprint, Response, request, jsonify, send_file
import cv2
import time
import os
import io
import gridfs
from datetime import datetime
from pymongo import MongoClient
from flask_cors import CORS
import ffmpeg
from bson import ObjectId


bp = Blueprint('face', __name__)

camera = None
CORS(bp)
# MongoDB setup
client = MongoClient("mongodb+srv://pranavhore1455:Pranav%402003@cluster0.8ucsl.mongodb.net/")  # Update this with your MongoDB URI
db = client["video_storage"]
fs = gridfs.GridFS(db)
# Path to temporarily store the recorded video before uploading
TEMP_VIDEO_PATH = "recorded_video.avi"
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
    eye_contact_text = f"Eye Contact Time: {eye_contact_time:.2f}s"
    status_color = (0, 255, 0) if eye_contact else (0, 0, 255)
    status_text = "Eye Contact: Maintained" if eye_contact else "Eye Contact: Lost"
    cv2.putText(frame, feedback_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    cv2.putText(frame, eye_contact_text, (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    cv2.putText(frame, status_text, (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, status_color, 2)
    return frame

def generate_frames():
    global camera
    camera = cv2.VideoCapture(0)
    # Setup video writer to save video locally
    fourcc = cv2.VideoWriter_fourcc(*'XVID')
    out = cv2.VideoWriter(TEMP_VIDEO_PATH, fourcc, 20.0, (640, 480))
    try:
        while True:
            success, frame = camera.read()
            if not success:
                break
            else:
                processed_frame = process_frame(frame)
                out.write(frame)  # Save each frame to the video file
                _, buffer = cv2.imencode('.jpg', processed_frame)
                frame = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
    except GeneratorExit:
        # Cleanup when client disconnects
        camera.release()
        out.release()  # Release the video writer
        print("Client disconnected, camera released.")

@bp.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')
# @bp.route('/stop_camera', methods=['POST'])
# def stop_camera():
#     global camera, total_time, eye_contact_time, tracking_started, start_time
#     camera.release()  # Release the camera
#     total_time = 0
#     eye_contact_time = 0
#     tracking_started = False
#     start_time = None
#     # Determine content type of the video
#     content_type = "video/avi"  # Change if you are saving videos in a different format
#     # Upload the video to MongoDB with contentType
#     with open(TEMP_VIDEO_PATH, "rb") as video_file:
#         file_id = fs.put(
#             video_file,
#             filename="session_video.avi",
#             upload_date=datetime.utcnow(),
#             contentType=content_type  # Adding content type metadata
#         )
#     # Remove the temporary file
#     if os.path.exists(TEMP_VIDEO_PATH):
#         os.remove(TEMP_VIDEO_PATH)
#     return jsonify({"success": True, "message": "Camera stopped and video uploaded", "file_id": str(file_id)}), 200
  
@bp.route('/stop_camera', methods=['POST'])
def stop_camera():
    global camera, total_time, eye_contact_time, tracking_started, start_time
    try:
        print(camera)
        camera.release()  # Release the camera
        total_time = 0
        eye_contact_time = 0
        tracking_started = False
        start_time = None

        # Determine content type of the video (now mp4)
        content_type = "video/mp4"  # Change to MP4 content type

        # Parse request data
        data = request.get_json()
        print("data",data)
        user_id = ObjectId(data["userid"])  # Convert user ID to ObjectId
        print(user_id)

        speech_analysis = data["dat"]  # Default to an empty string if not provided
        print("speech",speech_analysis)

        # Upload the video to MongoDB with contentType
        with open(TEMP_VIDEO_PATH, "rb") as video_file:
            file_id = fs.put(
                video_file,
                filename="session_video.mp4",  # Save the video as .mp4
                upload_date=datetime.utcnow(),
                contentType=content_type,
                metadata={
                    "userid": user_id,  # Include the user ID as metadata
                    "SpeechAnalysis": speech_analysis  # Include speech analysis as metadata
                }
            )
        print(1)

        # Remove the temporary file
        if os.path.exists(TEMP_VIDEO_PATH):
            os.remove(TEMP_VIDEO_PATH)

        return jsonify({"success": True, "message": "Camera stopped and video uploaded", "file_id": str(file_id)}), 200

    except Exception as e:
        print(f"Error occurred: {str(e)}")
        return jsonify({"success": False, "message": "An error occurred", "error": str(e)}), 500


@bp.route('/get_user_videos', methods=['POST'])
def get_user_videos():
    try:
        # Get the user ID from the request body
        data = request.get_json()
        print("Data:", data)
        user_id = data.get("userid")
        user_id = ObjectId(user_id)

        if not user_id:
            return jsonify({"error": "User ID is required"}), 400

        # Fetch files from GridFS based on user ID in metadata
        files = fs.find({"metadata.userid": user_id})
        video_files = []
        
        for file in files:
            video_files.append({
                "file_id": str(file._id),
                "filename": file.filename,
                "upload_date": file.upload_date,
                "SpeechAnalysis": file.metadata.get("SpeechAnalysis")
            })

        return jsonify({"videos": video_files}), 200
    
    except Exception as e:
        print("Error:", e)
        return jsonify({"error": "An error occurred while fetching videos", "details": str(e)}), 500


@bp.route('/video/<file_id>', methods=['GET'])
def serve_video(file_id):
    try:
        # Fetch the video file from MongoDB
        file_id = ObjectId(file_id)
        video_file = fs.get(file_id)

        # Check if the content type is already 'video/mp4' (or any other valid type)
        content_type = video_file.content_type or 'video/mp4'

        def generate():
            chunk_size = 1024 * 1024  # 1MB per chunk (you can adjust the chunk size)
            while True:
                chunk = video_file.read(chunk_size)
                if not chunk:
                    break
                yield chunk  # Yield each chunk to the response

        # Return the video file as a stream
        return Response(
            generate(),
            mimetype=content_type,
            content_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename={video_file.filename}"  # Trigger download with file name
            }
        )



    except Exception as e:
        print(f"Error serving video: {e}")
        return {"error": "Error processing video."}, 500