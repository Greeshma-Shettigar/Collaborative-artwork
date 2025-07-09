// client/src/Canvas.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import Tools from "./Tools";
import { drawBrushStroke, drawShape } from "./drawingUtils";
import socket from "./socket";
import { useParams, useLocation } from 'react-router-dom';

import { applyStyle } from './utils/styleTransferAPI';

const Canvas = () => {
  const { roomId } = useParams();
  const location = useLocation();
  const me = location.state?.me || "Anonymous";
  const canvasRef = useRef(null);
  const pathsRef = useRef([]);
  const ctxRef = useRef(null);
  const [tool, setTool] = useState("pencil");
  const [brushType, setBrushType] = useState("normal brush");
  const [brushSize, setBrushSize] = useState(5);
  const [color, setColor] = useState("#000000");
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [startPos, setStartPos] = useState(null);
  const [shapeEndPos, setShapeEndPos] = useState(null);
  const [selectedShape, setSelectedShape] = useState("line");
  const [textInput, setTextInput] = useState("");
  const [textPos, setTextPos] = useState(null);

  // --- NEW STATES FOR STYLE TRANSFER UI VISIBILITY ---
  const [showAIStyleTransferUI, setShowAIStyleTransferUI] = useState(false); // Controls visibility
  const [styledImage, setStyledImage] = useState(null);
  const [stylePrompt, setStylePrompt] = useState("");
  const [isApplyingStyle, setIsApplyingStyle] = useState(false);
  const [styleError, setStyleError] = useState(null);
  // --- END NEW STATES ---


  useEffect(() => {
    socket.emit("join-room", { roomId, name: me });
    return () => {
      socket.emit("leave-room", { roomId, name: me });
    };
  }, [roomId, me]);

  useEffect(() => {
    socket.on("room-full", ({ message }) => {
      alert(message);
    });
    return () => socket.off("room-full");
  }, []);

  useEffect(() => {
    pathsRef.current = paths;
  }, [paths]);

  const setCanvasSize = () => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  //canvas.width = window.innerWidth;
  //canvas.height = window.innerHeight - 60;
   canvas.width = 3000;
    canvas.height = 2000;

  redraw(pathsRef.current); // ✅ use the latest ref data
};


  useEffect(() => {
    if (canvasRef.current) {
      const ctx =  canvasRef.current.getContext("2d");
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctxRef.current = ctx;
      setCanvasSize();
    }

    const handleResize = () => {
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(() => {
          setCanvasSize();
        }, 150);
    };
    window.addEventListener("resize", handleResize);
     return () => window.removeEventListener("resize", handleResize);
  }, []);
  useEffect(() => {
  const observer = new ResizeObserver(() => {
    setCanvasSize(); // Or use a debounced version if needed
  });

  if (canvasRef.current?.parentNode) {
    observer.observe(canvasRef.current.parentNode);
  }

  return () => {
    observer.disconnect();
  };
}, []);
 // ✅ Join room on mount
  useEffect(() => {
    if (!roomId || !me) return;
    socket.emit("join-room", { roomId, username: me });
    console.log(`Joined room: ${roomId} as ${me}` );
  }, [roomId, me]);

  useEffect(() => {
    socket.on("remote-path", (item) => {
      if (item.roomId !== roomId) return;

      const updatedPaths = [...pathsRef.current, item];
      pathsRef.current = updatedPaths;

      if (ctxRef.current) {
        const ctx = ctxRef.current;
        if (item.type === "freehand") {
          drawBrushStroke(ctx, item.points, item.brushType, item.size, item.color);
        } else if (item.type === "shape") {
          drawShape(ctx, item.shapeType, item.start, item.end, item.color, item.size);
        } else if (item.type === "text") {
          ctx.font = `${item.size * 4}px sans-serif`;
          ctx.fillStyle = item.color;
          ctx.fillText(item.text, item.pos.x, item.pos.y);
        } else if (item.type === "fill") {
            if (item.imageData) {
                const img = new ImageData(
                    new Uint8ClampedArray(Object.values(item.imageData.data)),
                    item.imageData.width,
                    item.imageData.height
                );
                ctx.putImageData(img, 0, 0);
            } else {
                floodFill(item.x, item.y, item.color, true);
            }
        }
      }
      setPaths(updatedPaths);
    });

    return () => socket.off("remote-path");
  }, [roomId]);

  useEffect(() => {
    socket.on("flood-fill", ({ x, y, fillColor }) => {
      floodFill(x, y, fillColor, true);
    });
    return () => {
      socket.off("flood-fill");
    };
  }, []);

  const redraw = (customPaths = pathsRef.current) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (const item of customPaths) {
      if (item.type === "freehand") {
        drawBrushStroke(ctx, item.points, item.brushType, item.size, item.color);
      } else if (item.type === "shape") {
        drawShape(ctx, item.shapeType, item.start, item.end, item.color, item.size);
      } else if (item.type === "text") {
        ctx.font = `${item.size * 4}px sans-serif`;
        ctx.fillStyle = item.color;
        ctx.fillText(item.text, item.pos.x, item.pos.y);
      } else if (item.type === "fill") {
          if (item.imageData) {
              const img = new ImageData(
                  new Uint8ClampedArray(Object.values(item.imageData.data)),
                  item.imageData.width,
                  item.imageData.height
              );
              ctx.putImageData(img, 0, 0);
          } else {
              floodFill(item.x, item.y, item.color, true);
          }
      }
    }
  };

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e) => {
    // --- NEW: Close AI Style Transfer UI if a drawing tool is selected ---
    if (showAIStyleTransferUI && ["pencil", "brush", "eraser", "shape", "fill", "text"].includes(tool)) {
        setShowAIStyleTransferUI(false);
    }
    // --- END NEW ---

    const pos = getMousePos(e);
    setStartPos(pos);
    setShapeEndPos(pos);
    setRedoStack([]);

    if (["pencil", "brush", "eraser", "shape"].includes(tool)) {
      setIsDrawing(true);
    }

    if (["pencil", "brush", "eraser"].includes(tool)) {
      setCurrentPath([pos]);
    } else if (tool === "fill") {
      const x = Math.floor(pos.x);
      const y = Math.floor(pos.y);
      floodFill(x, y, color);
    } else if (tool === "text") {
      setTextPos(pos);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const pos = getMousePos(e);
    const ctx = ctxRef.current;
    if (!ctx) return;

    if (["pencil", "brush", "eraser"].includes(tool)) {
      setCurrentPath((prevPath) => {
        const newPath = [...prevPath, pos];
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        redraw();
        drawBrushStroke(ctx, newPath, tool === "brush" ? brushType : "pencil", brushSize, tool === "eraser" ? "#ffffff" : color);
        return newPath;
      });
    } else if (tool === "shape" && startPos) {
      setShapeEndPos(pos);
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      redraw();
      drawShape(ctx, selectedShape, startPos, pos, color, brushSize);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (["pencil", "brush", "eraser"].includes(tool)) {
      const item = {
        type: "freehand",
        points: currentPath,
        color: tool === "eraser" ? "#ffffff" : color,
        size: brushSize,
        brushType: tool === "brush" ? brushType : "pencil",
        roomId: roomId
      };
      setPaths((prev) => {
        const updated = [...prev, item];
        pathsRef.current = updated;
        return updated;
      });
      socket.emit("remote-path", item);
    } else if (tool === "shape" && startPos && shapeEndPos) {
      const item = {
        type: "shape",
        shapeType: selectedShape,
        start: startPos,
        end: shapeEndPos,
        color,
        size: brushSize,
        roomId: roomId
      };
      setPaths((prev) => {
        const updated = [...prev, item];
        pathsRef.current = updated;
        return updated;
      });
      socket.emit("remote-path", item);
    }

    setCurrentPath([]);
    setStartPos(null);
    setShapeEndPos(null);
  };

  const floodFill = (x, y, fillColor, applyOnly = false) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imgData.data;
    const stack = [[x, y]];
    const targetColor = getPixel(data, Math.floor(x), Math.floor(y), ctx.canvas.width);

    const fill = hexToRGBA(fillColor);

    if (!targetColor || colorsMatch(targetColor, fill)) {
      if (!applyOnly) {
          const item = {
              type: "fill",
              x: Math.floor(x),
              y: Math.floor(y),
              color: fillColor,
              roomId: roomId,
          };
          setPaths((prev) => {
              const updated = [...prev, item];
              pathsRef.current = updated;
              return updated;
          });
          socket.emit("remote-path", item);
      }
      return;
    }

    while (stack.length) {
      const [cx, cy] = stack.pop();
      if (cx < 0 || cx >= ctx.canvas.width || cy < 0 || cy >= ctx.canvas.height) continue;

      const currentColor = getPixel(data, cx, cy, ctx.canvas.width);
      if (!colorsMatch(currentColor, targetColor)) continue;

      setPixel(data, cx, cy, fill, ctx.canvas.width);
      stack.push([cx + 1, cy]);
      stack.push([cx - 1, cy]);
      stack.push([cx, cy + 1]);
      stack.push([cx, cy - 1]);
    }

    ctx.putImageData(imgData, 0, 0);

    if (!applyOnly) {
      const item = {
        type: "fill",
        x: Math.floor(x),
        y: Math.floor(y),
        color: fillColor,
        roomId: roomId,
        imageData: {
            data: Array.from(imgData.data),
            width: imgData.width,
            height: imgData.height
        }
      };
      setPaths((prev) => {
        const updated = [...prev, item];
        pathsRef.current = updated;
        return updated;
      });
      socket.emit("remote-path", item);
    }
  };

  const getPixel = (data, x, y, width) => {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };

  const setPixel = (data, x, y, color, width) => {
    const i = (y * width + x) * 4;
    data[i] = color[0];
    data[i + 1] = color[1];
    data[i + 2] = color[2];
    data[i + 3] = color[3];
  };

  const colorsMatch = (a, b) => a.every((v, i) => v === b[i]);
  const hexToRGBA = (hex) => {
    const bigint = parseInt(hex.replace("#", ""), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b, 255];
  };

  useEffect(() => {
    socket.on("color-updated", (newColor) => {
      setColor(newColor);
    });
    return () => {
      socket.off("color-updated");
    };
  }, []);

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (textPos && textInput.trim()) {
      const item = { type: "text", text: textInput, pos: textPos, color, size: brushSize, roomId: roomId };
      setPaths((prev) => {
        const updated = [...prev, item];
        pathsRef.current = updated;
        return updated;
      });
      socket.emit("remote-path", item);
      setTextInput("");
      setTextPos(null);
    }
  };

  const undo = () => {
    if (paths.length === 0) return;
    const newPaths = [...paths];
    const last = newPaths.pop();
    setPaths(newPaths);
    setRedoStack([...redoStack, last]);
    redraw(newPaths);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const newRedo = [...redoStack];
    const last = newRedo.pop();
    const updatedPaths = [...paths, last];
    setPaths(updatedPaths);
    setRedoStack(newRedo);
    redraw(updatedPaths);
  };

  const downloadImage = () => {
    const link = document.createElement("a");
    link.download = "drawing.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  // --- NEW: Toggle AI Style Transfer UI visibility ---
  const toggleAIStyleTransferUI = useCallback((forceClose = null) => {
   console.log("Inside toggleAIStyleTransferUI")
    setShowAIStyleTransferUI(prev => typeof forceClose === 'boolean' ? forceClose : !prev);
    // When opening/closing AI UI, we might want to clear existing styled image
    if (!showAIStyleTransferUI || forceClose) { // If it was hidden, or we're forcing close
        setStyledImage(null);
        setStylePrompt("");
        setStyleError(null);
    }
  }, [showAIStyleTransferUI]);

useEffect(()=>console.log("showAIStyleTransferUI", showAIStyleTransferUI), [showAIStyleTransferUI])
  const handleStyleApply = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsApplyingStyle(true);
    setStyleError(null);
    setStyledImage(null);

    try {
      const base64 = canvas.toDataURL("image/png");
      const resultURL = await applyStyle(base64, stylePrompt);
      setStyledImage(resultURL);
    } catch (error) {
      console.error("Failed to apply style:", error);
      setStyleError(error.message || "An unexpected error occurred during style transfer.");
    } finally {
      setIsApplyingStyle(false);
    }
  }, [stylePrompt]);
  // --- END NEW ---


  return (
    <div style={{ margin: 0, padding: 0 }}>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "60px",
          backgroundColor: "#f0f0f0",
          zIndex: 100,
        }}
      >
        <Tools
          selectedTool={tool}
          onSelectTool={setTool}
          brushType={brushType}
          onBrushTypeChange={setBrushType}
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          onUndo={undo}
          onRedo={redo}
          onDownload={downloadImage}
          onColorChange={setColor}
          color={color}
          onShapeSelect={(shape) => {
            setTool("shape");
            setSelectedShape(shape);
          }}
          selectedShape={tool === "shape" ? selectedShape : null}
          roomId={roomId}
          // --- NEW PROP PASSED TO TOOLS ---
          onToggleAIStyleTransferUI={toggleAIStyleTransferUI}
          // --- END NEW PROP ---
        />
      </div>

      {/* Room Info Banner */}
      <div
        style={{
          position: "fixed",
          top: "60px",
          left: 0,
          right: 0,
          height: "40px",
          backgroundColor: "#ffcccc",
          padding: "5px 10px",
          zIndex: 99,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "14px",
          fontFamily: "Arial, sans-serif",
          color: "rgb(0,0,0)",
          fontWeight: "bold",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div>Room ID: {roomId}</div>
        <div>You are: <strong>{me || "Anonymous"}</strong></div>
      </div>

      {/* Main Content Area (Canvas + AI UI if visible) */}
      <div
        style={{
          position: "absolute",
          top: "100px",
          left: 0,
          right: 0,
          bottom: 0,
          overflow: "auto",
          backgroundColor: "#fff",
          display: "flex", // Use flexbox to arrange canvas and AI UI
          flexDirection: "column", // Stack them vertically
          alignItems: "center", // Center horizontally if needed
          paddingBottom: '50px' // Add some padding to the bottom for spacing with AI UI
        }}
      >
        <canvas
          ref={canvasRef}
          width={3000}
          height={2000}
          style={{
            backgroundColor: "white",
            display: "block",
            cursor: tool === "text" ? "text" : "crosshair",
            flexShrink: 0, // Prevent canvas from shrinking if AI UI is large
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setIsDrawing(false)}
        />

        {tool === "text" && textPos && (
          <form
            onSubmit={handleTextSubmit}
            style={{
              position: "absolute",
              top: textPos.y + 100,
              left: textPos.x,
              zIndex: 200,
            }}
          >
            <input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              autoFocus
              style={{ fontSize: brushSize * 4, border: "1px solid #ccc" }}
            />
          </form>
        )}

        {/* --- AI Style Transfer UI (Conditionally Rendered) --- */}
        {showAIStyleTransferUI && (
          <div
            style={{
              marginTop: 20,
              padding: '15px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              background: '#f9f9f9',
              position: 'relative',
              maxWidth: '800px',
              width: '90%', // Make it responsive
              margin: '20px auto',
              textAlign: 'center'
            }}
          >
            <h3>AI Style Transfer</h3>
            <input
              type="text"
              value={stylePrompt}
              onChange={(e) => setStylePrompt(e.target.value)}
              placeholder="e.g., 'turn into Disney style', 'convert to anime art', 'make it look like a Pixar movie'"
              style={{ padding: '10px', width: 'calc(100% - 120px)', marginRight: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
              disabled={isApplyingStyle}
            />
            <button
              onClick={handleStyleApply}
              style={{ padding: '10px 15px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              disabled={isApplyingStyle}
            >
              {isApplyingStyle ? 'Applying Style...' : '✨ Apply Style'}
            </button>
            {styleError && <p style={{ color: 'red', marginTop: 10, fontSize: '0.9em' }}>Error: {styleError}</p>}

            {styledImage && (
              <div
                style={{
                  marginTop: 20,
                  paddingTop: 15,
                  borderTop: '1px solid #eee',
                  textAlign: 'center'
                }}
              >
                <h4>Transformed Artwork</h4>
                <img src={styledImage} alt="Styled" style={{ maxWidth: "100%", height: "auto", border: "1px solid #eee", borderRadius: "4px" }} />
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px', justifyContent: 'center' }}>
                  <a href={styledImage} download="styled_artwork.png" style={{ textDecoration: 'none' }}>
                    <button style={{ padding: '10px 15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      Download Styled Image
                    </button>
                  </a>
                  <button
                    onClick={() => {
                      URL.revokeObjectURL(styledImage);
                      setStyledImage(null);
                      setStylePrompt("");
                    }}
                    style={{ padding: '10px 15px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Clear Transformed Image
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {/* --- END AI Style Transfer UI --- */}

      </div>
    </div>
  );
};

export default Canvas;