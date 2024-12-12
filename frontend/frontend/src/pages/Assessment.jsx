// Required packages: react, tailwindcss, react-speech-recognition, media-recorder
import React, { useState, useEffect, useRef } from 'react';

import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

export const Assessment = () => {
    const [selectedQuestions, setSelectedQuestions] = useState([]); // To store selected questions and their order
    const [isRecording, setIsRecording] = useState(false); // To manage recording state
    const [audioBlob, setAudioBlob] = useState(null); // To store recorded audio blob
    const { transcript, resetTranscript } = useSpeechRecognition(); // Speech-to-text functionality
    const [audioRecorder, setAudioRecorder] = useState(null);
    const [speechrate, setSpeechrate] = useState(0)
    const myRef = useRef(null)
    const [count, setCount] = useState(0);

    // List of predefined questions
    const questions = [
        "Tell us about yourself?",
        "What’s your view on remote work culture?",
        "How do you stay updated with industry trends?",
        "What inspired you to choose your career path?",
    ];

    // Ensure browser compatibility for Speech Recognition
    useEffect(() => {
        if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
            alert("Browser does not support speech recognition.");
        }
    }, []);
    useEffect(() => {
        //Implementing the setInterval method
        const interval = setInterval(() => {
            setCount(count + 1);
        }, 1000);

        //Clearing the interval
        return () => clearInterval(interval);
    }, [count]);
    // Handle checkbox selection and ordering
    const handleQuestionSelection = (question) => {
        setSelectedQuestions((prev) => {
            if (prev.includes(question)) {
                return prev.filter((q) => q !== question); // Deselect if already selected
            } else {
                return [...prev, question]; // Add new question
            }
        });
    };

    // Start recording: Initialize speech recognition and audio recorder
    const startAssessment = async () => {
        setIsRecording(true);
        resetTranscript();
        setCount(0)
        SpeechRecognition.startListening({ continuous: true });


        // playing start audio
        const playStartSound = () => {
            const utterance = new SpeechSynthesisUtterance("Your assessment has been started.");
            utterance.lang = "en-US"; // You can adjust the language and accent
            utterance.rate = 1; // Adjust the speaking rate (default is 1)
            speechSynthesis.speak(utterance);
        };

        // Call the function
        playStartSound();
        // Show "Answer the question" text
        alert("Answer the question.");

        // Initialize MediaRecorder for audio recording
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks = [];
        const stopRecording = new Promise((resolve) => {
            recorder.ondataavailable = (e) => chunks.push(e.data);

            recorder.onstop = () => {
                const audioFile = new Blob(chunks, { type: "audio/wav" });
                console.log("Audio file created");
                resolve(audioFile); // Resolve with the audio file once it's created
            };
        });

        // Start the recording
        recorder.start();
        setAudioRecorder(recorder);

        // Wait for the stop event to be triggered and get the audio file
        const audioBlob = await stopRecording;
        if (audioBlob) {
            setAudioBlob(audioBlob); // Set the audio blob once recording has stopped
        } else {
            console.log("No audio blob created.");
        }
    };

    // Stop recording: Stop speech recognition and audio recorder
    const stopAssessment = async () => {
        setIsRecording(false);
        SpeechRecognition.stopListening();
        if (audioRecorder) audioRecorder.stop();
        try {
            const response = await fetch('http://127.0.0.1:5000/grammer/check', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json", // Specify JSON content type
                },
                body: JSON.stringify({ // Convert JavaScript object to JSON string
                    transcript: transcript
                }),
            });
            const resp = await response.json();
            console.log(resp)
        } catch (err) { console.log(err) }



    };

    // Save the audio file (connect with backend for actual upload)
    const saveAudio = async () => {
        countSpeechRate();

        if (audioBlob) {
            const audioURL = URL.createObjectURL(audioBlob);
            console.log("Audio saved. File URL:", audioURL);




            // Implement backend upload logic here
            try {
                const formData = new FormData();
                formData.append('audio_data', audioBlob, 'recorded_audio.wav');
                formData.append('type', 'wav');

                const response = await fetch('http://127.0.0.1:5000/grammer/check_pauses', {
                    method: 'POST',
                    cache: 'no-cache',
                    body: formData,

                });
                console.log(response.status)

            } catch (err) { console.log(err) }
            URL.revokeObjectURL(audioURL);


        }
        else {
            console.log("audioblob is empty")
        }





    };


    async function countSpeechRate() {
        try {
            const duration = count
            const wordCount = transcript.trim().split(/\s+/).length;
            const rate = wordCount / count;
            console.log(duration)

            setSpeechrate(rate);
            setCount(0);
        } catch (error) {
            console.error("Error calculating speech rate:", error);
            throw error; // Re-throw the error for further handling
        }
    }
    const playAudio = () => {
        if (audioBlob) {
            const audioURL = URL.createObjectURL(audioBlob);
            const link = document.createElement("a");
            link.href = audioURL;
            link.download = "recorded_audio.wav"; // Specify the filename
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            const audio = new Audio(audioURL);
            audio.play();
        } else {
            console.error("No audio blob available to play.");
        }
    };
    return (
        <div className='flex'>

            <div className="p-6 bg-gray-100 min-h-screen">
                <h1 className="text-2xl font-bold mb-4">Assessment Page</h1>

                {/* Question List */}
                <div className="mb-6">
                    {questions.map((question, index) => (
                        <div key={index} className="flex items-center mb-2">
                            <input
                                type="checkbox"
                                id={`question-${index}`}
                                className="mr-2"
                                onChange={() => handleQuestionSelection(question)}
                                disabled={isRecording} // Disable selection during recording
                            />
                            <label htmlFor={`question-${index}`} className="text-lg">
                                {selectedQuestions.includes(question) ? `${selectedQuestions.indexOf(question) + 1}. ` : ""}
                                {question}
                            </label>
                        </div>
                    ))}
                </div>

                {/* Start and Stop Buttons */}
                <div className="flex gap-4 mb-6">

                    <button className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
                        onClick={startAssessment} disabled={isRecording} >
                        Start
                    </button>

                    <button className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
                        onClick={() => { stopAssessment(); saveAudio(); }} disabled={!isRecording} >
                        Stop
                    </button>
                </div>
            </div>

            {/* Transcription Output */}
            <div className=' flex'>

                <div className="bg-slate-800 p-4 rounded h-1/4  shadow-md">
                    <h2 className="text-lg font-bold mb-2">Live Transcription:</h2>
                    <p className="text-gray-700 whitespace-pre-wrap">{transcript}</p>
                </div>

                <div>
                    <video className='p-6 bg-gray-300 h-1/4 min-h-screen' src="" alt="" />
                </div>
            </div>
            <div>
                <button onClick={playAudio}>
                    <span>Play Audio</span>
                </button>
                <audio ref={myRef} id="audio-element" src="" type="audio/wav" />
                <h1>Timer :{count}</h1>
                <h2>Speech rate: {speechrate.toFixed(2)}</h2>
            </div>

        </div>
    );
};

