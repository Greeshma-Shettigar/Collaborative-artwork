import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import LandingPage from "./LandingPage";
import Canvas from "./Canvas"; // <-- your rich canvas
import { AIchatSession } from "./gemini/AiModel";

export default function App() {
  const [me, setMe] = useState("");
  const navigate = useNavigate();

  const joinRoom = (name, roomId) => {
    setMe(name);
    alert("Joined Room");
    setTimeout(() => navigate(`/canvas/${roomId}`), 1000);
  };
  const createRoom = (name, roomId) => {
    setMe(name);
    navigate(`/canvas/${roomId}`);
  };
  useEffect(() => {
    const GenerateQuestions = async () => {
      try {
        const result = await AIchatSession.sendMessage(
          "Hello how are you?"
        );
        const finalResult =
          result.response?.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log("Response: ", finalResult);
      } catch (error) {
        console.error("Error generating questions:", error);
      }
    };
    GenerateQuestions();
  }, []);

  return (
    <Routes>
      <Route
        path="/"
        element={<LandingPage onJoin={joinRoom} onCreate={createRoom} />}
      />
      <Route path="/canvas/:roomId" element={<Canvas me={me} />} />
    </Routes>
  );
}
