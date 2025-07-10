import React, { useState } from "react";
import { AIchatSession } from "./gemini/AiModel";

const Chatbot = ({ visible, onClose }) => {
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi there! How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  if (!visible) return null;

  const handleSend = async () => {
    if (input.trim() === "") return;
    setIsSending(true);
    try {
      const result = await AIchatSession.sendMessage(input);
      const finalResult =
        result.response?.candidates?.[0]?.content?.parts?.[0]?.text;
      setMessages((prev) => [
        ...prev,
        { from: "user", text: input },
        { from: "bot", text: finalResult },
      ]);
    } catch (error) {
      console.error("Error generating questions:", error);
    } finally {
      setIsSending(false);
      setInput("");
    }
  };

  return (
    <div
      style={{
        zIndex: 100,
        width: "500px",
        height: "600px",
        backgroundColor: "#f0f0f0",
        position: "absolute",
        top: 110,
        right: 20,
        display: "flex",
        flexDirection: "column",
        border: "1px solid #ccc",
        borderRadius: "10px",
        overflow: "hidden",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          padding: "10px",
          backgroundColor: "#007bff",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0 }}>🤖 AI Chatbot</h2>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "white",
            fontSize: "20px",
            cursor: "pointer",
          }}
        >
          ❌
        </button>
      </div>

      <div
        style={{
          flex: 1,
          padding: "10px",
          overflowY: "auto",
          backgroundColor: "#fff",
        }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              margin: "10px 0",
              textAlign: msg.from === "user" ? "right" : "left",
            }}
          >
            <span
              style={{
                display: "inline-block",
                backgroundColor: msg.from === "user" ? "#dcf8c6" : "#e0e0e0",
                padding: "8px 12px",
                borderRadius: "15px",
                maxWidth: "80%",
              }}
            >
              {msg.text}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: "10px",
          borderTop: "1px solid #ccc",
          backgroundColor: "#f9f9f9",
          display: "flex",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            marginRight: "8px",
          }}
        />
        <button
          onClick={handleSend}
          style={{
            padding: "8px 12px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
          disabled={isSending}
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
