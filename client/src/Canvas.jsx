// client/src/Canvas.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import Tools from "./Tools";
import { drawBrushStroke, drawShape } from "./drawingUtils";
import socket from "./socket";
import { useParams, useLocation } from 'react-router-dom';



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
    console.log("[RECV] Remote path item:", item);
    if (item.roomId !== roomId) return;
    const updatedPaths = [...pathsRef.current, item];
    pathsRef.current = updatedPaths;

    if (item.type === "fill") {
      const canvas = canvasRef.current;
      const absX = Math.floor(item.x * canvas.width);
      const absY = Math.floor(item.y * canvas.height);
      // Only apply once
      const already = pathsRef.current.some(p =>
        p.type === "fill" &&
        Math.abs(p.x - item.x) < 1e-3 &&
        Math.abs(p.y - item.y) < 1e-3 &&
        p.color === item.color
      );
      if (!already) {
        console.log("[RECV] Applying fill:", item);
        floodFill(absX, absY, item.color, true);
      }
    } else {
      // handle freehand / shape / text as before
      if (item.type === "freehand") {
        drawBrushStroke(ctxRef.current, item.points, item.brushType, item.size, item.color);
      } else if (item.type === "shape") {
        drawShape(ctxRef.current, item.shapeType, item.start, item.end, item.color, item.size);
      } else if (item.type === "text") {
        const ctx = ctxRef.current;
        ctx.font = `${item.size * 4}px sans-serif`;
        ctx.fillStyle = item.color;
        ctx.fillText(item.text, item.pos.x, item.pos.y);
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
      }  else if (item.type === "fill") {
  if (item.imageData) {
    const image = new ImageData(
      new Uint8ClampedArray(item.imageData.data),
      item.imageData.width,
      item.imageData.height
    );
    ctx.putImageData(image, 0, 0);
  }
}

    }
  };

    useEffect(() => {
        socket.on("canvas-state-update", ({ roomId: remoteRoomId, paths: newRemotePaths }) => {
            if (remoteRoomId !== roomId) {
                console.log(`[CLIENT] Received state update for different room: ${remoteRoomId}, current: ${roomId}`);
                return; // Ignore if not for the current room
            }

            console.log("[CLIENT] Received canvas state update for room:", roomId, "New paths count:", newRemotePaths.length);
            setPaths(newRemotePaths);
              pathsRef.current = newRemotePaths;
             setRedoStack([]);
             redraw(newRemotePaths);
        });
         return () => socket.off("canvas-state-update");
    }, [roomId, setPaths, redraw]); 

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e) => {
    

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
  const canvas = canvasRef.current;
  if (!ctx || !canvas) return;

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const w = canvas.width;
  const target = getPixel(data, x, y, w);
  const fill = hexToRGBA(fillColor);
  if (colorsMatch(target, fill)) return;

  const p32 = new Uint32Array(data.buffer);
  const newColor32 = (fill[3] << 24) | (fill[2] << 16) | (fill[1] << 8) | fill[0];
  const startIdx = y * w + x;
  const targetColor32 = p32[startIdx];
  if (targetColor32 === newColor32) return;

  const stack = [startIdx];

  while (stack.length) {
    const idx = stack.pop();
    let yy = Math.floor(idx / w);
    let xx = idx % w;

    let temp = idx;
    while (yy > 0 && p32[temp - w] === targetColor32) {
      temp -= w;
      yy--;
    }

    let reachLeft = false, reachRight = false;
    while (yy < canvas.height && p32[temp] === targetColor32) {
      p32[temp] = newColor32;

      if (xx > 0 && p32[temp - 1] === targetColor32) {
        if (!reachLeft) {
          stack.push(temp - 1);
          reachLeft = true;
        }
      } else {
        reachLeft = false;
      }

      if (xx < w - 1 && p32[temp + 1] === targetColor32) {
        if (!reachRight) {
          stack.push(temp + 1);
          reachRight = true;
        }
      } else {
        reachRight = false;
      }

      temp += w;
      yy++;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  if (!applyOnly) {
    const item = {
      type: "fill",
      color: fillColor,
      roomId,
      imageData: {
        width: imgData.width,
        height: imgData.height,
        data: Array.from(imgData.data), // Flatten to store in socket
      },
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
    socket.emit("canvas-state-update", {
        roomId: roomId,
        paths: newPaths // Send the current authoritative paths AFTER undo
    });
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const newRedo = [...redoStack];
    const last = newRedo.pop();
    const updatedPaths = [...paths, last];
    setPaths(updatedPaths);
    setRedoStack(newRedo);
    redraw(updatedPaths);
    socket.emit("canvas-state-update", {
        roomId: roomId,
        paths: updatedPaths // Send the current authoritative paths AFTER redo
    });
  };

  const downloadImage = () => {
    const link = document.createElement("a");
    link.download = "drawing.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

 


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

        

      </div>
    </div>
  );
};

export default Canvas;