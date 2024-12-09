import 'regenerator-runtime/runtime'
import React, { useState } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
// import regeneratorRuntime from "regenerator-runtime";

function App() {
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const [dialogText, setDialogText] = useState(""); // State to store dialog content
  const [showDialog, setShowDialog] = useState(false); // State to control dialog visibility
  const [show_face,set_show_face]= useState( false); 
  const [loading,setloading]=useState(false);

  if (!browserSupportsSpeechRecognition) {
    return <span>Browser doesn't support speech recognition.</span>;
  }

  const startContinuousListening = () => {
    SpeechRecognition.startListening({ continuous: true });
    setloading(true);
    set_show_face(true);
    setTimeout(() => {
      setloading(false);
    }, 6000);
  };
  
  const stopContinuousListening =async () => {
    SpeechRecognition.stopListening({ continuous: true });
    const videoElement = document.getElementById("video");
    if (videoElement) {
      videoElement.src = ""; // Clear the src to stop the video stream
    }
    const resp=await  fetch("http://127.0.0.1:5000/face/stop_camera",{
      method:"POST"
    }).catch((err)=>{console.log("error in stoping camers",err)})
    set_show_face(false);
    console.log("response of camera stop function",resp)
  };


  const grammarChecker = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/grammer/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcript }),
      });
// 
      const resultText = await response.text();
      setDialogText(resultText); // Set the dialog text
      setShowDialog(true); // Show the dialog box
    } catch (err) {
      console.log(err);
    }
  };

  const closeDialog = () => {
    setShowDialog(false); // Hide the dialog box
  };

  return (
    
    <div className="p-4">
      <div>

      <h1>Real-Time Eye Contact Analysis</h1>
      {show_face &&
      <div> <img id="video" src="http://127.0.0.1:5000/face/video_feed" alt="Video Stream"/></div>
      }
      {
        loading && <div> <p className="mb-4 text-gray-700">LOADING...</p></div>
      }
      </div>

      <p className="mb-4 text-lg">Microphone: {listening ? "on" : "off"}</p>
      <div className="flex gap-2 mb-4">
        
        <button onClick={startContinuousListening} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Start (Continuous)
        </button>

        <button onClick={stopContinuousListening} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" >
          Stop
        </button>

        <button onClick={resetTranscript} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600" >
          Reset
        </button>
      </div>
      
      <p className="mb-4 text-gray-700">{transcript}</p>
      <button
        onClick={grammarChecker}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Check
      </button>

      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-md text-center w-3/4 sm:w-1/3">
            <p className="text-gray-800 mb-4">{dialogText}</p>
            <button
              onClick={closeDialog}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
