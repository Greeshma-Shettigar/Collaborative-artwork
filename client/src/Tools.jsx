import React, { useState } from "react";
import { getColorPalette } from './utils/colorAPI';
import socket from "./socket"; // default export


import {
  FaPencilAlt,
  FaFillDrip,
  FaEraser,
  FaFont,
  FaDownload,
  FaUndo,
  FaRedo,
  FaPaintBrush,
  FaArrowRight,
  FaArrowLeft,
  FaArrowUp,
  FaArrowDown,
  FaStar,
} from "react-icons/fa";
import {
  TbCircle,
  TbRectangle,
  TbHexagon,
  TbTriangle,
  TbDiamond,
  TbPentagon,
  TbPolygon,
  TbLine,
} from "react-icons/tb";
import { IoShapesOutline } from "react-icons/io5";
import { FaImage } from "react-icons/gi";

const brushTypes = [
  { name: "Normal Brush", icon: "🖌" },
  { name: "Calligraphy", icon: "✒" },
  { name: "Airbrush", icon: "💨" },
  { name: "Marker", icon: "🖍" },
  { name: "Oil", icon: "🛢" },
  { name: "Watercolor", icon: "💧" },
  { name: "Texture", icon: "🎨" },
];

const shapeTypes = [
  { name: "line", icon: <TbLine color="#007acc" /> },
  { name: "circle", icon: <TbCircle color="#e67e22" /> },
  { name: "rectangle", icon: <TbRectangle color="#3498db" /> },
  { name: "triangle", icon: <TbTriangle color="#9b59b6" /> },
  { name: "diamond", icon: <TbDiamond color="#e74c3c" /> },
  { name: "pentagon", icon: <TbPentagon color="#1abc9c" /> },
  { name: "hexagon", icon: <TbHexagon color="#f39c12" /> },
  { name: "polygon", icon: <TbPolygon color="#2ecc71" /> },
  { name: "arrow-right", icon: <FaArrowRight color="#34495e" /> },
  { name: "arrow-left", icon: <FaArrowLeft color="#34495e" /> },
  { name: "arrow-up", icon: <FaArrowUp color="#34495e" /> },
  { name: "arrow-down", icon: <FaArrowDown color="#34495e" /> },
  { name: "star", icon: <FaStar color="#f1c40f" /> },
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
  roomId, // ✅ now accessible
   onToggleAIStyleTransferUI, // Function passed from Canvas.jsx to toggle UI visibility
}) => {
  const [showBrushDropdown, setShowBrushDropdown] = useState(false);
  const [showShapePanel, setShowShapePanel] = useState(false);
  const [suggestedColors, setSuggestedColors] = useState([]);

const fetchSuggestedColors = async () => {
  console.log("Fetching AI colors..."); // test log
  const palette = await getColorPalette();
  console.log("AI palette:", palette);
  setSuggestedColors(palette);
};

  const toggleBrushDropdown = () => {
    onSelectTool("brush");
    setShowBrushDropdown((prev) => !prev);
    setShowShapePanel(false);
   // Close AI Style Transfer UI when opening brush dropdown ---
    if (onToggleAIStyleTransferUI) onToggleAIStyleTransferUI(false);
  };

  const toggleShapePanel = () => {
    onSelectTool("shape");
    setShowShapePanel((prev) => !prev);
    setShowBrushDropdown(false);
    // --- Close AI Style Transfer UI when opening shape panel ---
    if (onToggleAIStyleTransferUI) onToggleAIStyleTransferUI(false);
  };
  // ---  Handler for AI Style Transfer button ---
  const handleAIStyleTransferClick = () => {
    // This button will toggle the AI Style Transfer UI visibility in Canvas.jsx
    if (onToggleAIStyleTransferUI) {
        onToggleAIStyleTransferUI(); // Call the function passed from Canvas
    }
    // Optionally close other dropdowns when AI button is clicked
    setShowBrushDropdown(false);
    setShowShapePanel(false);
    // We don't set a tool here, as it's not a drawing tool for the canvas itself
  };

 return (
  <>
    {/* 🎯 Top Toolbar with AI Button */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: 10,
        gap: 8,
        background: "#ffe6e6",
        flexWrap: "wrap",
        borderBottom: "1px solid #ccc",
        zIndex: 9999,
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
      }}
    >
      {/* Regular Tool Buttons */}
      <button onClick={() => onSelectTool("pencil")} title="Pencil">
        <FaPencilAlt color="#555" />
      </button>

      {/* Brush dropdown */}
      <div style={{ position: "relative" }}>
        <button onClick={toggleBrushDropdown} title="Brush">
          <FaPaintBrush color="#007acc" />
        </button>
        {showBrushDropdown && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              background: "white",
              border: "1px solid #ccc",
              zIndex: 10000,
              padding: 4,
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              minWidth: 160,
            }}
          >
            {brushTypes.map((type) => (
              <div
                key={type.name}
                onClick={() => {
                  onBrushTypeChange(type.name.toLowerCase());
                  setShowBrushDropdown(false);
                }}
                style={{
                  padding: "4px 10px",
                  cursor: "pointer",
                  color: "black",
                  whiteSpace: "nowrap",
                }}
              >
                {type.icon} {type.name}
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={() => onSelectTool("eraser")} title="Eraser">
        <FaEraser color="#d9534f" />
      </button>

      <button onClick={() => onSelectTool("text")} title="Text">
        <FaFont color="#5cb85c" />
      </button>

      <button onClick={() => onSelectTool("fill")} title="Paint Fill">
        <FaFillDrip color="#f0ad4e" />
      </button>

      <div style={{ position: "relative" }}>
        <button onClick={toggleShapePanel} title="Shapes">
          <IoShapesOutline />
        </button>
        {showShapePanel && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              background: "white",
              border: "1px solid #ccc",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              zIndex: 10000,
              padding: 4,
              maxHeight: 180,
              overflowY: "auto",
              display: "grid",
              gridTemplateColumns: "repeat(5, 36px)",
              gap: 6,
            }}
          >
            {shapeTypes.map((shape) => (
              <div
                key={shape.name}
                title={shape.name}
                onClick={() => {
                  onShapeSelect(shape.name);
                  onSelectTool("shape");
                  setShowShapePanel(false);
                }}
                style={{
                  fontSize: "20px",
                  cursor: "pointer",
                  textAlign: "center",
                  padding: 4,
                  border:
                    selectedShape === shape.name
                      ? "2px solid #007acc"
                      : "1px solid #ccc",
                  borderRadius: 4,
                  background: "#fff",
                }}
              >
                {shape.icon}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Brush size */}
      <label style={{ display: "flex", alignItems: "center" }}>
        <input
          type="range"
          min="1"
          max="30"
          value={brushSize}
          onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
        />
      </label>

      {/* Color Picker */}
      <input
        type="color"
        value={color}
        onChange={(e) => onColorChange(e.target.value)}
        title="Color Picker"
        style={{
          width: "32px",
          height: "32px",
          border: "none",
          background: "none",
          cursor: "pointer",
        }}
      />

      <button onClick={onUndo} title="Undo (Ctrl+Z)">
        <FaUndo />
      </button>
      <button onClick={onRedo} title="Redo (Ctrl+Y)">
        <FaRedo />
      </button>
      <button onClick={onDownload} title="Download">
        <FaDownload />
      </button>

      {/* ✅ AI Suggest Colors button in toolbar */}
      <button
        onClick={fetchSuggestedColors}
        style={{
          padding: "6px 12px",
          borderRadius: "6px",
          border: "1px solid #ccc",
          background: "#fff",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        🎨 AI Suggest Colors
      </button>
      {/* ---  AI Style Transfer Button --- */}
        <button
          onClick={handleAIStyleTransferClick}
          title="AI Style Transfer"
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            border: "1px solid #4CAF50", // Green border
            background: "#4CAF50", // Green background
            color: "white", // White text
            cursor: "pointer",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <FaImage/> AI Style Transfer
        </button>

      {/* ✅ Display AI color swatches if present */}
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
                  cursor: "pointer",
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  </>
);
};
export default Tools;
