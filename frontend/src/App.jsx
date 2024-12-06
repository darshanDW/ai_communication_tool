import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import React from 'react';
import regeneratorRuntime from "regenerator-runtime";


import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'
function App() {
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();
  if (!browserSupportsSpeechRecognition) {
    return <span>Browser doesn't support speech recognition.</span>;
  }
  const startContinuousListening = () => {
    SpeechRecognition.startListening({ continuous: true });
  };
  console.log(transcript)
  const grammer_checker = async () => {
    try {

      const response = await fetch('http://127.0.0.1:5000/', {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcript })
      });

      console.log(await response.text());


    } catch (err) { console.log(err) }
  }


  return (
    <div>
      <p>Microphone: {listening ? 'on' : 'off'}</p>
      <button onClick={startContinuousListening}>Start (Continuous)</button>
      <button onClick={SpeechRecognition.stopListening}>Stop</button>
      <button onClick={resetTranscript}>Reset</button>
      <p>{transcript}</p>
      <button onClick={grammer_checker}  >check</button>

    </div>
  );
}

export default App
