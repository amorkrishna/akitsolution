import { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import { useCameraPlannerStore, type CameraPlacement } from "@/stores/cameraPlannerStore";

export interface Blueprint2DHandle {
  exportPNG: (title?: string) => void;
}

const BLUEPRINT_BG   = "#0a1628";
const GRID_MINOR     = "rgba(99,162,255,0.08)";
const GRID_MAJOR     = "rgba(99,162,255,0.22)";
const WALL_COLOR     = "#4f9eff";
const WALL_WIDTH     = 3;
const FLOOR_FILL     = "rgba(20,40,80,0.6)";
const SCALE_TEXT     = "#7eb8ff";
const TITLE_BG       = "#071120";
const BORDER_COLOR   = "#1e4080";

// Draw a camera icon at (cx, cy) with direction rotY
function drawCameraIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rotY: number,
  color: string,
  label: string,
  fovH: number,
  range: number,
  scale: number,
  showCoverage: boolean,
  showLabels: boolean,
  isSelected: boolean
) {
  // Coverage arc
  if (showCoverage) {
    const arcRadius = range * scale;
    const halfFov = (fovH * Math.PI) / 180 / 2;
    // In 2D top-down: rotationY=0 means camera faces "up" (-Z in 3D → up in 2D)
    const dir = -rotY - Math.PI / 2;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, arcRadius, dir - halfFov, dir + halfFov);
    ctx.closePath();
    ctx.fillStyle = color + "22";
    ctx.fill();
    ctx.strokeStyle = color + "66";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // Selection glow
  if (isSelected) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fillStyle = color + "44";
    ctx.fill();
    ctx.restore();
  }

  // Camera body circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = isSelected ? 2 : 1;
  ctx.stroke();

  // Direction arrow
  const dir2 = -rotY - Math.PI / 2;
  const arrowLen = 14;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(
    cx + Math.cos(dir2) * arrowLen,
    cy + Math.sin(dir2) * arrowLen
  );
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Camera lens dot
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();

  // Label
  if (showLabels) {
    ctx.save();
    ctx.font = "bold 9px Inter, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const textY = cy + 12;
    const textW = ctx.measureText(label).width + 8;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(cx - textW / 2, textY - 1, textW, 13);
    ctx.fillStyle = color;
    ctx.fillText(label, cx, textY);
    ctx.restore();
  }
}

function drawBlueprintScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  room: { width: number; length: number; height: number },
  cameras: CameraPlacement[],
  selectedId: string | null,
  showCoverage: boolean,
  showGrid: boolean,
  showLabels: boolean,
  sceneName: string,
  forExport = false
) {
  const TITLE_H = forExport ? 60 : 0;
  const PADDING = 48;
  const drawH = height - TITLE_H;

  // Background
  ctx.fillStyle = BLUEPRINT_BG;
  ctx.fillRect(0, TITLE_H, width, drawH);

  // Scale
  const scaleX = (width - PADDING * 2) / room.width;
  const scaleZ = (drawH - PADDING * 2) / room.length;
  const scale = Math.min(scaleX, scaleZ);

  const originX = (width - room.width * scale) / 2;
  const originZ = TITLE_H + (drawH - room.length * scale) / 2;

  const toCanvasX = (x: number) => originX + (x + room.width / 2) * scale;
  const toCanvasZ = (z: number) => originZ + (z + room.length / 2) * scale;

  // Grid
  if (showGrid) {
    // Minor grid (1m)
    ctx.strokeStyle = GRID_MINOR;
    ctx.lineWidth = 0.5;
    for (let x = -room.width / 2; x <= room.width / 2; x += 1) {
      ctx.beginPath();
      ctx.moveTo(toCanvasX(x), originZ);
      ctx.lineTo(toCanvasX(x), originZ + room.length * scale);
      ctx.stroke();
    }
    for (let z = -room.length / 2; z <= room.length / 2; z += 1) {
      ctx.beginPath();
      ctx.moveTo(originX, toCanvasZ(z));
      ctx.lineTo(originX + room.width * scale, toCanvasZ(z));
      ctx.stroke();
    }
    // Major grid (5m)
    ctx.strokeStyle = GRID_MAJOR;
    ctx.lineWidth = 1;
    for (let x = -room.width / 2; x <= room.width / 2; x += 5) {
      ctx.beginPath();
      ctx.moveTo(toCanvasX(x), originZ);
      ctx.lineTo(toCanvasX(x), originZ + room.length * scale);
      ctx.stroke();
    }
    for (let z = -room.length / 2; z <= room.length / 2; z += 5) {
      ctx.beginPath();
      ctx.moveTo(originX, toCanvasZ(z));
      ctx.lineTo(originX + room.width * scale, toCanvasZ(z));
      ctx.stroke();
    }
  }

  // Floor fill
  ctx.fillStyle = FLOOR_FILL;
  ctx.fillRect(originX, originZ, room.width * scale, room.length * scale);

  // Dimension labels along walls
  ctx.font = "11px 'Courier New', monospace";
  ctx.fillStyle = SCALE_TEXT;
  ctx.textAlign = "center";
  ctx.fillText(`${room.width}m`, originX + (room.width * scale) / 2, originZ - 8);
  ctx.textAlign = "right";
  ctx.fillText(`${room.length}m`, originX - 6, originZ + (room.length * scale) / 2 + 4);

  // Room walls
  ctx.strokeStyle = WALL_COLOR;
  ctx.lineWidth = WALL_WIDTH;
  ctx.lineJoin = "miter";
  ctx.strokeRect(originX, originZ, room.width * scale, room.length * scale);

  // Corner markers
  const corners = [
    [originX, originZ],
    [originX + room.width * scale, originZ],
    [originX, originZ + room.length * scale],
    [originX + room.width * scale, originZ + room.length * scale],
  ];
  ctx.fillStyle = WALL_COLOR;
  corners.forEach(([cx, cz]) => {
    ctx.beginPath();
    ctx.arc(cx, cz, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Camera icons
  cameras.forEach((cam) => {
    const cx = toCanvasX(cam.position[0]);
    const cz = toCanvasZ(cam.position[2]);
    drawCameraIcon(
      ctx, cx, cz,
      cam.rotationY,
      cam.color,
      cam.name,
      cam.fovH,
      cam.range,
      scale,
      showCoverage,
      showLabels,
      cam.id === selectedId
    );
  });

  // North arrow
  const nX = originX + room.width * scale - 16;
  const nZ = originZ + 24;
  ctx.save();
  ctx.strokeStyle = "#7eb8ff";
  ctx.fillStyle = "#7eb8ff";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(nX, nZ + 14);
  ctx.lineTo(nX, nZ - 14);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(nX, nZ - 14);
  ctx.lineTo(nX - 5, nZ);
  ctx.lineTo(nX + 5, nZ);
  ctx.closePath();
  ctx.fill();
  ctx.font = "bold 10px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("N", nX, nZ - 20);
  ctx.restore();

  // Scale bar (5m)
  const barW = 5 * scale;
  const barX = originX + 8;
  const barZ = originZ + room.length * scale + 18;
  ctx.save();
  ctx.strokeStyle = "#4f9eff";
  ctx.lineWidth = 2;
  ctx.fillStyle = "#7eb8ff";
  ctx.beginPath();
  ctx.moveTo(barX, barZ);
  ctx.lineTo(barX + barW, barZ);
  ctx.stroke();
  // ticks
  [barX, barX + barW].forEach((tx) => {
    ctx.beginPath();
    ctx.moveTo(tx, barZ - 3);
    ctx.lineTo(tx, barZ + 3);
    ctx.stroke();
  });
  ctx.font = "10px monospace";
  ctx.textAlign = "center";
  ctx.fillText("5m", barX + barW / 2, barZ + 13);
  ctx.restore();

  // Title block for export
  if (forExport) {
    // Top title bar
    ctx.fillStyle = TITLE_BG;
    ctx.fillRect(0, 0, width, TITLE_H);
    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, TITLE_H);

    ctx.fillStyle = "#4f9eff";
    ctx.font = "bold 18px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`📋 ${sceneName} — 2D Security Blueprint`, 20, 24);

    ctx.fillStyle = "#7eb8ff";
    ctx.font = "12px Inter, sans-serif";
    ctx.fillText(
      `Room: ${room.width}m × ${room.length}m × ${room.height}m  |  ${cameras.length} cameras  |  Generated: ${new Date().toLocaleDateString()}`,
      20, 46
    );

    // Camera schedule table (right side)
    const tableX = width - 300;
    const rowH = 18;
    const tableY = TITLE_H + 10;
    ctx.fillStyle = "#4f9eff";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "left";
    ctx.fillText("ID  TYPE       FOV    RANGE  MOUNT", tableX, tableY);
    ctx.strokeStyle = "#1e4080";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tableX, tableY + 4);
    ctx.lineTo(tableX + 290, tableY + 4);
    ctx.stroke();

    cameras.slice(0, 12).forEach((cam, i) => {
      const rowY = tableY + rowH * (i + 1);
      if (i % 2 === 0) {
        ctx.fillStyle = "rgba(20,50,100,0.3)";
        ctx.fillRect(tableX - 4, rowY - 12, 298, rowH);
      }
      ctx.fillStyle = cam.color;
      ctx.font = "9px monospace";
      const id = String(i + 1).padStart(2, "0");
      ctx.fillText(
        `${id}  ${cam.type.padEnd(8)}   ${cam.fovH}°   ${cam.range}m    ${cam.mountPosition}`,
        tableX, rowY
      );
    });
    if (cameras.length > 12) {
      ctx.fillStyle = "#7eb8ff";
      ctx.font = "9px monospace";
      ctx.fillText(`  + ${cameras.length - 12} more cameras...`, tableX, tableY + rowH * 13);
    }
  }

  // Legend
  const legX = originX;
  const legY = originZ + room.length * scale + 30;
  const types: [string, string, string][] = [
    ["#3b82f6", "●", "Dome"],
    ["#10b981", "◆", "Bullet"],
    ["#f59e0b", "▲", "PTZ"],
    ["#8b5cf6", "○", "Fisheye"],
  ];
  ctx.font = "10px Inter, sans-serif";
  let legOffset = 0;
  types.forEach(([color, symbol, label]) => {
    ctx.fillStyle = color;
    ctx.fillText(`${symbol} ${label}`, legX + legOffset, legY);
    legOffset += ctx.measureText(`${symbol} ${label}`).width + 16;
  });
}

export const Blueprint2D = forwardRef<Blueprint2DHandle, { className?: string }>(
  function Blueprint2D({ className }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { room, cameras, selectedId, showCoverage, showGrid, showLabels, sceneName } =
      useCameraPlannerStore();

    const draw = useCallback(
      (forExport = false, w?: number, h?: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const width = w ?? canvas.offsetWidth;
        const height = h ?? canvas.offsetHeight;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        drawBlueprintScene(
          ctx, width, height, room, cameras, selectedId,
          showCoverage, showGrid, showLabels, sceneName, forExport
        );
      },
      [room, cameras, selectedId, showCoverage, showGrid, showLabels, sceneName]
    );

    useEffect(() => {
      draw();
    }, [draw]);

    // Redraw on resize
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ro = new ResizeObserver(() => draw());
      ro.observe(canvas);
      return () => ro.disconnect();
    }, [draw]);

    useImperativeHandle(ref, () => ({
      exportPNG: (title?: string) => {
        const EXPORT_W = 1920;
        const EXPORT_H = 1080;
        const offscreen = document.createElement("canvas");
        offscreen.width = EXPORT_W;
        offscreen.height = EXPORT_H;
        const ctx = offscreen.getContext("2d");
        if (!ctx) return;
        drawBlueprintScene(
          ctx, EXPORT_W, EXPORT_H, room, cameras, null,
          true, true, true, title ?? sceneName, true
        );
        const link = document.createElement("a");
        link.href = offscreen.toDataURL("image/png");
        link.download = `blueprint-${(title ?? sceneName).toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.png`;
        link.click();
      },
    }));

    return (
      <canvas
        ref={canvasRef}
        className={className}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    );
  }
);
