// Required packages: react, tailwindcss, react-speech-recognition, media-recorder
import React, { useState, useEffect, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Page, Text, View, Document, PDFDownloadLink, StyleSheet } from '@react-pdf/renderer';
import { jwtDecode } from "jwt-decode";
import { use } from 'react';
const styles = StyleSheet.create({
    page: {
        padding: 20,
        backgroundColor: '#f0f4f8', // Light background color
    },
    header: {
        fontSize: 20,
        marginBottom: 10,
        textAlign: 'center',
        color: '#0f4c81', // Dark blue color
        fontWeight: 'bold',
        borderBottomWidth: 2,
        borderBottomColor: '#0f4c81',
        borderBottomStyle: 'solid',
        paddingBottom: 5,
    },
    section: {
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        backgroundColor: '#fff',
    },
    keyText: {
        fontSize: 14,
        color: '#333',
        fontWeight: 'bold',
    },
    valueText: {
        fontSize: 14,
        color: '#555',
    },
    horizontalLine: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 5,
    },
    footer: {
        fontSize: 12,
        marginTop: 20,
        textAlign: 'center',
        color: '#0f4c81',
    },
});


export const FeedbackPDF = ({ scores }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            {/* Header Section */}
            <Text style={styles.header}>Assessment Feedback</Text>

            {/* Scores Section */}
            {Object.entries(scores).map(([key, value], index) => (
                <View key={key} style={styles.section}>
                    <Text style={styles.keyText}>{key}:</Text>
                    <Text style={styles.valueText}>{value}</Text>
                    {index < Object.entries(scores).length - 1 && (
                        <View style={styles.horizontalLine} />
                    )}
                </View>



            ))}

            {/* Footer Section */}
            <Text style={styles.footer}>Thank you for completing the assessment!</Text>
        </Page>
    </Document>
);


export const Assessment = () => {
    const [user, setuser] = useState(null)
    const [selectedQuestions, setSelectedQuestions] = useState([]); // To store selected questions and their order
    const [isRecording, setIsRecording] = useState(false); // To manage recording state
    const [audioBlob, setAudioBlob] = useState(null); // To store recorded audio blob
    const { transcript, resetTranscript } = useSpeechRecognition(); // Speech-to-text functionality
    const [audioRecorder, setAudioRecorder] = useState(null);
    const [speechrate, setSpeechrate] = useState(0)
    const myRef = useRef(null)
    const [count, setCount] = useState(0);
    const [isTimerRed, setIsTimerRed] = useState(false); // Flag to change timer text color
    const [showFace, setShowFace] = useState(false); // Show video feed
    const [loading, setLoading] = useState(false); // Loading indicator for video feed
    const [scores, setscores] = useState({})
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
    // Implementing the setInterval method for the timer
    useEffect(() => {
        let interval;
        if (isRecording) {
            interval = setInterval(() => {
                setCount((prevCount) => prevCount + 1);
            }, 1000);
        }

        // Clear the interval when recording stops or component is unmounted
        return () => clearInterval(interval);
    }, [isRecording]);
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

    const token = localStorage.getItem("token"); // Replace 'authToken' with the key used in your app
    const decodedToken = jwtDecode(token); // Decode the token
    const userid = decodedToken.userid;
    console.log(userid)


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
        setShowFace(true);

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
                const audioFile = new Blob(chunks, { type: "audio/webm" });
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
    // Extract user_id (adjust based on your token structure)
    // Stop recording: Stop speech recognition and audio recorder
    const stopAssessment = async () => {


        var dat = {}

        setIsRecording(false); // Stop recording
        SpeechRecognition.stopListening();
        if (audioRecorder) audioRecorder.stop();
        // Stop camera
        try {
            console.log("Transcript being sent:", transcript);
            const response = await fetch('http://127.0.0.1:5000/grammer/check', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",

                },
                body: JSON.stringify({ transcript }),
            });

            dat = await response.json();
            console.log("API Response:", dat);
            setscores(dat); // Update the state
            console.log(dat)
        } catch (err) {
            console.error("Error in grammar check:", err);
        }


        if (dat) {
            try {
                
                const response = await fetch("http://127.0.0.1:5000/face/stop_camera", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json", // Inform the server of JSON payload
                    },
                    body: JSON.stringify({ userid, dat }) // Correctly stringify the JSON object
                });
                console.log(response)
                if (response.ok) {
                    console.log("Camera stopped successfully.");
                } else {
                    console.log(response)
                    console.error("Failed to stop the camera.");
                }
            } catch (error) {
                console.error("Error in stopping the camera:", error);
            }
        }

        // Stop assessment and check grammar
        setShowFace(false);


        console.log("Stopping assessment...");


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
                formData.append('audio_data', audioBlob, 'recorded_audio.webm');
                formData.append('type', 'wav');

                const response = await fetch('http://127.0.0.1:5000/grammer/check_pauses', {
                    method: 'POST',
                    cache: 'no-cache',
                    body: formData,

                });
                console.log(await response.json())

            } catch (err) { console.log(err) }
            URL.revokeObjectURL(audioURL);


        }
        else {
            console.log("audioblob is empty")
        }





    };
    async function countSpeechRate() {
        try {
            const duration = count;
            const wordCount = transcript.trim().split(/\s+/).length;
            const rate = wordCount / count;
            console.log(duration);

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
            link.download = "recorded_audio.webm"; // Specify the filename
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
        <div className='flex flex-col p-2 bg-gray-100 min-h-screen'>
            {/* Section 1: Question List and Controls */}
            <div className="flex flex-col mb-6">
                {/* Center the Assessment Page Title */}
                <h1 className="text-2xl font-bold mb-4 text-center">Assessment Page</h1>

                {/* Question List */}
                <div className="mb-4">
                    {questions.map((question, index) => (
                        <div key={index} className="flex items-center mb-1">
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
                <div className="flex gap-4">
                    <button className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600" onClick={startAssessment} disabled={isRecording}>
                        Start
                    </button>
                    <button className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600" onClick={() => { stopAssessment(); saveAudio(); }} disabled={!isRecording}>
                        Stop
                    </button>
                    {/* Feedback Button */}
                    {Object.keys(scores).length > 0 && (
                        <PDFDownloadLink
                            document={<FeedbackPDF scores={scores} />}
                            fileName="feedback.pdf"
                            key={JSON.stringify(scores)} // Ensure PDFDownloadLink updates when scores change
                        >
                            {({ loading }) => (
                                <button
                                    className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
                                    disabled={loading}
                                >
                                    {loading ? 'Generating PDF...' : 'Download Feedback'}
                                </button>
                            )}
                        </PDFDownloadLink>
                    )}



                </div>

            </div>

            {/* Section 2: Transcription */}
            <div className="flex mb-6">
                <div className="bg-slate-800 p-4 rounded flex-1 shadow-md mr-6">
                    <h2 className="text-lg font-bold mb-2 text-white">Live Transcription:</h2>
                    <p className="text-white whitespace-pre-wrap">{transcript}</p>
                </div>

                {/* Section 3: Video */}
                <div className="flex-1 bg-gray-300 p-4 rounded shadow-md">
                    <h2 className="text-lg font-bold mb-2">Video Recording:</h2>
                    {showFace && (
                        <div className='video-container'>
                            <img id="video" src="http://127.0.0.1:5000/face/video_feed" alt='Video Stream' />
                        </div>
                    )}
                </div>
            </div>

            {/* Section 4: Timer and Speech Rate (Positioned Top Right) */}
            <div className="absolute top-0 right-0 p-4 text-lg">
                <div className="font-semibold">
                    <h2 className={`font-semibold ${isTimerRed ? 'text-red-500' : ''}`}>Timer: {count} seconds</h2>
                    <h3 className="font-semibold">Speech Rate: {speechrate.toFixed(2)} words/second</h3>
                </div>
                <button className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600" onClick={playAudio}>
                    Play Audio
                </button>
            </div>
        </div>
    );
};
