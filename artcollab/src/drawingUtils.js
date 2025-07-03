export function drawBrushStroke(ctx, points, brushType, thickness, color) {
  if (
    !Array.isArray(points) ||
    points.length < 2 ||
    !points.every(p => p && typeof p.x === "number" && typeof p.y === "number")
  ) return;

  ctx.save();

  switch (brushType) {
    case "pencil":
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.lineWidth = thickness;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const mid = {
          x: (points[i - 1].x + points[i].x) / 2,
          y: (points[i - 1].y + points[i].y) / 2,
        };
        ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, mid.x, mid.y);
      }
      ctx.stroke();
      break;

    case "calligraphy":
      ctx.lineJoin = "bevel";
      ctx.lineCap = "square";
      ctx.strokeStyle = color;
      ctx.beginPath();
      for (let i = 1; i < points.length; i++) {
        const angle = Math.PI / 6;
        const dx = Math.cos(angle) * thickness;
        const dy = Math.sin(angle) * thickness;
        ctx.moveTo(points[i - 1].x - dx, points[i - 1].y - dy);
        ctx.lineTo(points[i].x + dx, points[i].y + dy);
      }
      ctx.stroke();
      break;

    case "airbrush":
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.2;
      points.forEach((p) => {
        for (let i = 0; i < 50 * (thickness / 5); i++) {
          const offsetX = (Math.random() - 0.5) * thickness * 4;
          const offsetY = (Math.random() - 0.5) * thickness * 4;
          const radius = Math.random() * 1.5;
          ctx.beginPath();
          ctx.arc(p.x + offsetX, p.y + offsetY, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      break;

    case "oil":
      ctx.fillStyle = color;
      points.forEach((p) => {
        for (let i = 0; i < 20 * (thickness / 5); i++) {
          const offsetX = (Math.random() - 0.5) * thickness * 2;
          const offsetY = (Math.random() - 0.5) * thickness * 2;
          const radius = Math.random() * (thickness / 2);
          ctx.globalAlpha = 0.7 + Math.random() * 0.3;
          ctx.beginPath();
          ctx.arc(p.x + offsetX, p.y + offsetY, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      break;

    case "marker":
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.lineWidth = thickness;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
      break;

    case "watercolor":
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.globalAlpha = 0.2;
      ctx.filter = "blur(1.5px)";
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const mid = {
          x: (points[i - 1].x + points[i].x) / 2,
          y: (points[i - 1].y + points[i].y) / 2,
        };
        ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, mid.x, mid.y);
      }
      ctx.stroke();
      break;

    case "texture":
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.lineWidth = thickness;
      const pattern = createColorPattern(color);
      const pat = ctx.createPattern(pattern, "repeat");
      if (pat) {
        ctx.strokeStyle = pat;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
      }
      break;

    default:
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.lineWidth = thickness;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
      break;
  }

  ctx.restore();
}

export function drawShape(ctx, shapeType, start, end, color, size) {
   ctx.save(); 
  const { x: x1, y: y1 } = start;
  const { x: x2, y: y2 } = end;
  const width = x2 - x1;
  const height = y2 - y1;

  ctx.strokeStyle = color;
  ctx.lineWidth = size;
   ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.globalAlpha = 1;
  ctx.filter = "none";
  ctx.beginPath();

  switch (shapeType) {
    case "line":
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      break;

    case "rectangle":
      ctx.strokeRect(x1, y1, width, height);
      return;

    case "circle": {
      const radius = Math.sqrt(width * width + height * height) / 2;
      ctx.arc((x1 + x2) / 2, (y1 + y2) / 2, radius, 0, 2 * Math.PI);
      break;
    }

    case "triangle":
      ctx.moveTo((x1 + x2) / 2, y1);
      ctx.lineTo(x1, y2);
      ctx.lineTo(x2, y2);
      ctx.closePath();
      break;

    case "diamond":
      ctx.moveTo((x1 + x2) / 2, y1); // top
      ctx.lineTo(x2, (y1 + y2) / 2); // right
      ctx.lineTo((x1 + x2) / 2, y2); // bottom
      ctx.lineTo(x1, (y1 + y2) / 2); // left
      ctx.closePath();
      break;

    case "pentagon":
    case "hexagon": {
      const sides = shapeType === "pentagon" ? 5 : 6;
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const radius = Math.min(Math.abs(width), Math.abs(height)) / 2;

      for (let i = 0; i <= sides; i++) {
        const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
        const px = cx + radius * Math.cos(angle);
        const py = cy + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }

    case "polygon": {
      const sides = 8; // default polygon with 8 sides
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const radius = Math.min(Math.abs(width), Math.abs(height)) / 2;

      for (let i = 0; i <= sides; i++) {
        const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
        const px = cx + radius * Math.cos(angle);
        const py = cy + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }

    case "star": {
      const spikes = 5;
      const outerRadius = Math.min(Math.abs(width), Math.abs(height)) / 2;
      const innerRadius = outerRadius / 2;
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      let angle = -Math.PI / 2;

      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
        angle += Math.PI / spikes;
      }
      ctx.closePath();
      break;
    }

    case "arrow-right":
      ctx.moveTo(x1, (y1 + y2) / 2);
      ctx.lineTo(x2 - 10, y1);
      ctx.lineTo(x2 - 10, y1 + (y2 - y1) / 3);
      ctx.lineTo(x2, (y1 + y2) / 2);
      ctx.lineTo(x2 - 10, y1 + (2 * (y2 - y1)) / 3);
      ctx.lineTo(x2 - 10, y2);
      ctx.closePath();
      break;

    case "arrow-left":
      ctx.moveTo(x2, (y1 + y2) / 2);
      ctx.lineTo(x1 + 10, y1);
      ctx.lineTo(x1 + 10, y1 + (y2 - y1) / 3);
      ctx.lineTo(x1, (y1 + y2) / 2);
      ctx.lineTo(x1 + 10, y1 + (2 * (y2 - y1)) / 3);
      ctx.lineTo(x1 + 10, y2);
      ctx.closePath();
      break;

    case "arrow-up":
      ctx.moveTo((x1 + x2) / 2, y2);
      ctx.lineTo(x1, y1 + 10);
      ctx.lineTo(x1 + (x2 - x1) / 3, y1 + 10);
      ctx.lineTo((x1 + x2) / 2, y1);
      ctx.lineTo(x1 + (2 * (x2 - x1)) / 3, y1 + 10);
      ctx.lineTo(x2, y1 + 10);
      ctx.closePath();
      break;

    case "arrow-down":
      ctx.moveTo((x1 + x2) / 2, y1);
      ctx.lineTo(x1, y2 - 10);
      ctx.lineTo(x1 + (x2 - x1) / 3, y2 - 10);
      ctx.lineTo((x1 + x2) / 2, y2);
      ctx.lineTo(x1 + (2 * (x2 - x1)) / 3, y2 - 10);
      ctx.lineTo(x2, y2 - 10);
      ctx.closePath();
      break;

    default:
      console.warn(`Unknown shape type: ${shapeType}`);
      return;
  }

  ctx.stroke();
  ctx.restore();
}
