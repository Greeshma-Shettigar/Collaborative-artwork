import React, { useRef, useState, useEffect } from "react";
import Tools from "./Tools";
import { drawBrushStroke, drawShape } from "./drawingUtils";
import socket from "./socket";
import { useParams, useLocation} from 'react-router-dom';
//import { useEffect } from "react";

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
    alert(message); // Or customize UI here
  });

  return () => socket.off("room-full");
}, []);


  useEffect(() => {
  pathsRef.current = paths;
}, [paths]);

  const setCanvasSize = () => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 60;

  redraw(pathsRef.current); // ✅ use the latest ref data
};

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
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
    console.log( `Joined room: ${roomId} as ${me}`);
  }, [roomId, me]);


  useEffect(() => {
  socket.on("remote-path", (item) => {
    if (item.roomId !== roomId) return;

    // Push to ref immediately
    const updatedPaths = [...pathsRef.current, item];
    pathsRef.current = updatedPaths;

    // Draw immediately
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
        floodFill(item.x, item.y, item.color, true);
      }
    }

    // Also store in React state (for undo/redo)
    setPaths(updatedPaths);
  });

  return () => socket.off("remote-path");
}, [roomId]);

useEffect(() => {
  socket.on("flood-fill", ({ x, y, fillColor }) => {
    floodFill(x, y, fillColor, true); // Only apply locally
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
  floodFill(item.x, item.y, item.color, true); // reapply fill safely
}

  }
};


  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
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
  floodFill(x, y, color); // your own canvas
  socket.emit("flood-fill", { x, y, fillColor: color, roomId }); // broadcast to others
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
      };
      setPaths((prev) => {
  const updated = [...prev, item];
  pathsRef.current = updated;
  return updated;
});
      console.log("Emitting path", item);
      socket.emit("remote-path",  { ...item, roomId });
    } else if (tool === "shape" && startPos && shapeEndPos) {
      const item = {
        type: "shape",
        shapeType: selectedShape,
        start: startPos,
        end: shapeEndPos,
        color,
        size: brushSize,
      };
      setPaths((prev) => {
  const updated = [...prev, item];
  pathsRef.current = updated;
  return updated;
});
      console.log("Emitting path", item);
      socket.emit("remote-path",  { ...item, roomId });
    }

    setCurrentPath([]);
    setStartPos(null);
    setShapeEndPos(null);
  };

  const floodFill = (x, y, fillColor, applyOnly = false) => {
  const ctx = ctxRef.current;
  const imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const data = imgData.data;
  const stack = [[x, y]];
 const targetColor = getPixel(data, Math.floor(x), Math.floor(y), ctx.canvas.width);
 console.log("Starting flood fill...");

  // 🚨 Important safety check
  if (!targetColor || colorsMatch(targetColor, hexToRGBA(fillColor))) return;
  const fill = hexToRGBA(fillColor);
  console.log("fillColor input:", fillColor, "RGBA converted:", fill);

  console.log("Target color:", targetColor, "Fill color:", fill);

  if (colorsMatch(targetColor, fill)) {
  console.log("Same color — skipping fill but emitting path.");
  const item = {
    type: "fill",
    x,
    y,
    color: fillColor,
  };
  setPaths((prev) => {
    const updated = [...prev, item];
    pathsRef.current = updated;
    return updated;
  });
  socket.emit("remote-path",  { ...item, roomId });
  return;
}


  while (stack.length) {
    const [cx, cy] = stack.pop();
    const currentColor = getPixel(data, cx, cy, ctx.canvas.width);
    if (!colorsMatch(currentColor, targetColor)) continue;

    setPixel(data, cx, cy, fill, ctx.canvas.width);
    if (cx + 1 < ctx.canvas.width) stack.push([cx + 1, cy]);
    if (cx - 1 >= 0) stack.push([cx - 1, cy]);
    if (cy + 1 < ctx.canvas.height) stack.push([cx, cy + 1]);
    if (cy - 1 >= 0) stack.push([cx, cy - 1]);
  }

  ctx.putImageData(imgData, 0, 0);

  if (!applyOnly) {
    const item = {
      type: "fill",
      x : Math.floor(x),
      y: Math.floor(y),
      color: fillColor,
       imageData: ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height),
    };
    setPaths((prev) => {
  const updated = [...prev, item];
  pathsRef.current = updated;
  return updated;
});

    socket.emit("remote-path",  { ...item, roomId });
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
  return [r, g, b, 255]; // fully opaque
};;

useEffect(() => {
  socket.on("color-updated", (newColor) => {
    setColor(newColor); // this updates your local color state
  });

  return () => {
    socket.off("color-updated");
  };
}, []);


  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (textPos && textInput.trim()) {
      const item = { type: "text", text: textInput, pos: textPos, color, size: brushSize };
      setPaths((prev) => {
  const updated = [...prev, item];
  pathsRef.current = updated;
  return updated;
});

      socket.emit("remote-path",  { ...item, roomId });
      setTextInput("");
      setTextPos(null);
      redraw();
    }
  };

  const undo = () => {
    if (paths.length === 0) return;
    const newPaths = [...paths];
    const last = newPaths.pop();
    setPaths(newPaths);
    setRedoStack([...redoStack, last]);
    redraw();
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const newRedo = [...redoStack];
    const last = newRedo.pop();
    setPaths([...paths, last]);
    setRedoStack(newRedo);
    redraw();
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
           roomId={roomId} // ✅ pass roomId
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
    backgroundColor: "#ffcccc", // pink
    padding: "5px 10px",
    zIndex: 99,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: "14px",
    fontFamily: "Arial, sans-serif",
    color: "rgb(0,0,0)",           // black text
    fontWeight: "bold",
    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)", // subtle shadow
  }}
>
  <div>Room ID: {roomId}</div>
  <div>You are: <strong>{me || "Anonymous"}</strong></div>
</div>

 {/* Scrollable container below toolbar and room info */}
<div
  style={{
    position: "absolute",
    top: "100px", // below top bar + room info
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "auto", // enables scrollbars
    backgroundColor: "#fff",
  }}
>
  <canvas
    ref={canvasRef}
    width={3000} // large fixed width
    height={2000} // large fixed height
    style={{
      backgroundColor: "white",
      display: "block",
      cursor: tool === "text" ? "text" : "crosshair",
    }}
    onMouseDown={handleMouseDown}
    onMouseMove={handleMouseMove}
    onMouseUp={handleMouseUp}
    onMouseLeave={() => setIsDrawing(false)}
  />
</div>

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
  );
};

export default Canvas;
