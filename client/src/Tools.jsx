import React, { useState } from "react";
import { getColorPalette } from './utils/colorAPI';
import socket from "./socket";
import ChatBot from "../public/ChatBot Widget/ChatBot";

import {
  FaPencilAlt, FaFillDrip, FaEraser, FaFont,
  FaUndo, FaRedo, FaPaintBrush, FaArrowRight, FaArrowLeft,
  FaArrowUp, FaArrowDown, FaStar
} from "react-icons/fa";

import {
  TbCircle, TbRectangle, TbHexagon, TbTriangle, TbDiamond,
  TbPentagon, TbPolygon, TbLine
} from "react-icons/tb";

import { IoShapesOutline } from "react-icons/io5";

const brushTypes = [
  { name: "Normal Brush", icon: "🖌" },
  { name: "Calligraphy", icon: "✒" },
  { name: "Airbrush", icon: "💨" },
  { name: "Marker", icon: "🖍" },
  { name: "Oil", icon: "🛢" },
  { name: "Watercolor", icon: "💧" },
];

const shapeTypes = [
  { name: "line", icon: <TbLine color="#007acc" size={20} /> },
  { name: "circle", icon: <TbCircle color="#e67e22" size={20} /> },
  { name: "rectangle", icon: <TbRectangle color="#3498db" size={20} /> },
  { name: "triangle", icon: <TbTriangle color="#9b59b6" size={20} /> },
  { name: "diamond", icon: <TbDiamond color="#e74c3c" size={20} /> },
  { name: "pentagon", icon: <TbPentagon color="#1abc9c" size={20} /> },
  { name: "hexagon", icon: <TbHexagon color="#f39c12" size={20} /> },
  { name: "polygon", icon: <TbPolygon color="#2ecc71" size={20} /> },
  { name: "arrow-right", icon: <FaArrowRight color="#34495e" size={20} /> },
  { name: "arrow-left", icon: <FaArrowLeft color="#34495e" size={20} /> },
  { name: "arrow-up", icon: <FaArrowUp color="#34495e" size={20} /> },
  { name: "arrow-down", icon: <FaArrowDown color="#34495e" size={20} /> },
  { name: "star", icon: <FaStar color="#f1c40f" size={20} /> },
];

const Tools = ({
  selectedTool,
  onSelectTool,
  brushType,
  onBrushTypeChange,
  brushSize,
  onBrushSizeChange,
  onUndo,
  onRedo,
  onDownload,
  color,
  onColorChange,
  onShapeSelect,
  selectedShape,
  roomId,
  onToggleAIStyleTransferUI,
}) => {
  const [showBrushDropdown, setShowBrushDropdown] = useState(false);
  const [showShapePanel, setShowShapePanel] = useState(false);
  const [suggestedColors, setSuggestedColors] = useState([]);
  const [showChatbot, setShowChatbot] = useState(false);

  const fetchSuggestedColors = async () => {
    const palette = await getColorPalette();
    setSuggestedColors(palette);
  };

  const toggleBrushDropdown = () => {
    onSelectTool("brush");
    setShowBrushDropdown(prev => !prev);
    setShowShapePanel(false);
    onToggleAIStyleTransferUI?.(false);
  };

  const toggleShapePanel = () => {
    onSelectTool("shape");
    setShowShapePanel(prev => !prev);
    setShowBrushDropdown(false);
    onToggleAIStyleTransferUI?.(false);
  };

  return (
    <>
      <div style={{
        display: "flex", position: "absolute", alignItems: "center",
        padding: 10, gap: 10, background: "#ffe6e6", flexWrap: "wrap",
        borderBottom: "1px solid #ccc", zIndex: 10, top: 0, left: 0, right: 0,
      }}>
        <button onClick={() => onSelectTool("pencil")} title="Pencil" style={toolButtonStyle}>
          <FaPencilAlt size={20} color="#555" />
        </button>

        {/* Brush Dropdown */}
        <div style={{ position: "relative" }}>
          <button onClick={toggleBrushDropdown} title="Brush" style={toolButtonStyle}>
            <FaPaintBrush size={20} color="#007acc" />
          </button>
          {showBrushDropdown && (
            <div style={{
              position: "absolute", top: "100%", left: 0, background: "white",
              border: "1px solid #ccc", zIndex: 10000, padding: 4,
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)", minWidth: 160
            }}>
              {brushTypes.map(type => (
                <div key={type.name} onClick={() => {
                  onBrushTypeChange(type.name.toLowerCase());
                  setShowBrushDropdown(false);
                }} style={{
                  padding: "4px 10px", cursor: "pointer", color: "black", whiteSpace: "nowrap"
                }}>
                  {type.icon} {type.name}
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => onSelectTool("eraser")} title="Eraser" style={toolButtonStyle}>
          <FaEraser size={20} color="#d9534f" />
        </button>

        {/* Shapes Panel */}
        <div style={{ position: "relative" }}>
          <button onClick={toggleShapePanel} title="Shapes" style={toolButtonStyle}>
            <IoShapesOutline size={20} />
          </button>
          {showShapePanel && (
            <div style={{
              position: "absolute", top: "100%", left: 0, background: "white",
              border: "1px solid #ccc", boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              zIndex: 10000, padding: 4, maxHeight: 180, overflowY: "auto",
              display: "grid", gridTemplateColumns: "repeat(5, 36px)", gap: 6
            }}>
              {shapeTypes.map(shape => (
                <div key={shape.name} title={shape.name} onClick={() => {
                  onShapeSelect(shape.name);
                  onSelectTool("shape");
                  setShowShapePanel(false);
                }} style={{
                  fontSize: "20px", cursor: "pointer", textAlign: "center", padding: 4,
                  border: selectedShape === shape.name ? "2px solid #007acc" : "1px solid #ccc",
                  borderRadius: 4, background: "#fff"
                }}>
                  {shape.icon}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Brush Size */}
        <input
          type="range"
          min="1"
          max="30"
          value={brushSize}
          onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
        />

        {/* Color Picker */}
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          title="Color Picker"
          style={{
            width: "36px",
            height: "36px",
            border: "1px solid #ccc",
            borderRadius: "6px",
            cursor: "pointer"
          }}
        />

        <button onClick={onUndo} title="Undo" style={toolButtonStyle}><FaUndo size={20} /></button>
        <button onClick={onRedo} title="Redo" style={toolButtonStyle}><FaRedo size={20} /></button>

        {/* AI Suggest Colors */}
        <button onClick={fetchSuggestedColors} style={buttonStyle}>🎨 AI Suggest Colors</button>

        {/* Display Suggested Colors */}
        {suggestedColors.length > 0 && (
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {suggestedColors.map((color, index) => {
              const rgb = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
              return (
                <div
                  key={index}
                  title={rgb}
                  onClick={() => {
                    onColorChange(rgb);
                    socket.emit("color-change", { color: rgb, roomId });
                  }}
                  style={{
                    backgroundColor: rgb,
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    border: "2px solid #555",
                    cursor: "pointer"
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Chatbot Render */}
      {showChatbot && <ChatBot visible={showChatbot} onClose={() => setShowChatbot(false)} />}
      <ChatBot />
    </>
  );
};

// 👇 Custom Styles
const toolButtonStyle = {
  width: "44px",
  height: "44px",
  background: "#f8f9fa",
  border: "2px solid #ddd",
  borderRadius: "10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: "20px",
  transition: "all 0.2s ease-in-out",
  boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
};

const buttonStyle = {
 padding: "8px 14px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  background: "#ffffff",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "14px",
  transition: "background 0.2s, transform 0.2s",
};

export default Tools;
