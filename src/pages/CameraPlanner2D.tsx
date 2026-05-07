import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  Camera, Move, Trash2, Download, Printer, RotateCcw, Plus, ZoomIn, ZoomOut,
  Square, Circle, Type, Undo2, Grid3X3, Eye, Layers, MousePointer,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// ─── Types ──────────────────────────────────────────────────
type Tool = "select" | "camera" | "wall" | "door" | "text" | "rect" | "circle";

interface CameraItem {
  id: string;
  x: number;
  y: number;
  rotation: number;
  fov: number;
  range: number;
  label: string;
  type: "dome" | "bullet" | "ptz" | "fisheye";
  color: string;
}

interface WallItem {
  id: string;
  x1: number; y1: number;
  x2: number; y2: number;
}

interface ShapeItem {
  id: string;
  type: "rect" | "circle" | "door" | "text";
  x: number; y: number;
  width: number; height: number;
  label?: string;
  color: string;
}

interface HistoryState {
  cameras: CameraItem[];
  walls: WallItem[];
  shapes: ShapeItem[];
}

// ─── Constants ──────────────────────────────────────────────
const CAMERA_TYPES = [
  { value: "dome", label: "Dome", fov: 90, range: 120, color: "#3b82f6" },
  { value: "bullet", label: "Bullet", fov: 60, range: 180, color: "#ef4444" },
  { value: "ptz", label: "PTZ", fov: 120, range: 200, color: "#8b5cf6" },
  { value: "fisheye", label: "Fisheye 360°", fov: 360, range: 100, color: "#f59e0b" },
];

const GRID_SIZE = 20;

// ─── Room Templates ────────────────────────────────────────
interface RoomTemplate {
  name: string;
  icon: string;
  description: string;
  roomName: string;
  walls: Omit<WallItem, "id">[];
  shapes: Omit<ShapeItem, "id">[];
  cameras: Omit<CameraItem, "id">[];
}

const ROOM_TEMPLATES: RoomTemplate[] = [
  {
    name: "Office",
    icon: "🏢",
    description: "Standard office with reception, meeting room & workstations",
    roomName: "Office Floor Plan",
    walls: [
      // Outer walls
      { x1: 60, y1: 60, x2: 840, y2: 60 },
      { x1: 840, y1: 60, x2: 840, y2: 540 },
      { x1: 840, y1: 540, x2: 60, y2: 540 },
      { x1: 60, y1: 540, x2: 60, y2: 60 },
      // Inner walls
      { x1: 60, y1: 200, x2: 300, y2: 200 },    // Reception divider
      { x1: 300, y1: 60, x2: 300, y2: 340 },     // Meeting room
      { x1: 300, y1: 340, x2: 540, y2: 340 },    // Corridor
      { x1: 540, y1: 60, x2: 540, y2: 340 },     // Server room wall
    ],
    shapes: [
      { type: "text", x: 140, y: 140, width: 100, height: 30, label: "Reception", color: "#3b82f6" },
      { type: "text", x: 370, y: 180, width: 100, height: 30, label: "Meeting Room", color: "#8b5cf6" },
      { type: "text", x: 640, y: 180, width: 100, height: 30, label: "Server Room", color: "#ef4444" },
      { type: "text", x: 140, y: 380, width: 100, height: 30, label: "Workstations", color: "#64748b" },
      { type: "text", x: 450, y: 440, width: 100, height: 30, label: "Open Area", color: "#64748b" },
      { type: "door", x: 200, y: 190, width: 60, height: 20, label: "Door", color: "#22c55e" },
      { type: "door", x: 290, y: 340, width: 60, height: 20, label: "Door", color: "#22c55e" },
      { type: "rect", x: 100, y: 280, width: 140, height: 60, label: "Desk Area", color: "#94a3b8" },
      { type: "rect", x: 100, y: 420, width: 140, height: 60, label: "Desk Area", color: "#94a3b8" },
    ],
    cameras: [
      { x: 80, y: 80, rotation: 135, fov: 90, range: 140, label: "CAM-1", type: "dome", color: "#3b82f6" },
      { x: 820, y: 80, rotation: 225, fov: 90, range: 140, label: "CAM-2", type: "dome", color: "#3b82f6" },
      { x: 420, y: 200, rotation: 270, fov: 120, range: 120, label: "CAM-3", type: "ptz", color: "#8b5cf6" },
      { x: 80, y: 520, rotation: 45, fov: 90, range: 140, label: "CAM-4", type: "dome", color: "#3b82f6" },
      { x: 660, y: 120, rotation: 180, fov: 60, range: 160, label: "CAM-5", type: "bullet", color: "#ef4444" },
    ],
  },
  {
    name: "Warehouse",
    icon: "🏭",
    description: "Large warehouse with loading dock, storage zones & aisles",
    roomName: "Warehouse Layout",
    walls: [
      // Outer walls
      { x1: 40, y1: 40, x2: 860, y2: 40 },
      { x1: 860, y1: 40, x2: 860, y2: 560 },
      { x1: 860, y1: 560, x2: 40, y2: 560 },
      { x1: 40, y1: 560, x2: 40, y2: 40 },
      // Loading dock
      { x1: 40, y1: 160, x2: 160, y2: 160 },
      { x1: 160, y1: 40, x2: 160, y2: 160 },
    ],
    shapes: [
      { type: "text", x: 70, y: 100, width: 80, height: 30, label: "Loading Dock", color: "#f59e0b" },
      { type: "rect", x: 220, y: 80, width: 180, height: 180, label: "Zone A", color: "#3b82f6" },
      { type: "rect", x: 460, y: 80, width: 180, height: 180, label: "Zone B", color: "#8b5cf6" },
      { type: "rect", x: 220, y: 340, width: 180, height: 180, label: "Zone C", color: "#22c55e" },
      { type: "rect", x: 460, y: 340, width: 180, height: 180, label: "Zone D", color: "#ef4444" },
      { type: "rect", x: 700, y: 80, width: 120, height: 460, label: "Racks", color: "#94a3b8" },
      { type: "text", x: 300, y: 300, width: 100, height: 30, label: "Main Aisle", color: "#64748b" },
      { type: "door", x: 40, y: 400, width: 20, height: 80, label: "Exit", color: "#22c55e" },
    ],
    cameras: [
      { x: 60, y: 60, rotation: 135, fov: 90, range: 180, label: "CAM-1", type: "bullet", color: "#ef4444" },
      { x: 840, y: 60, rotation: 225, fov: 90, range: 180, label: "CAM-2", type: "bullet", color: "#ef4444" },
      { x: 450, y: 300, rotation: 0, fov: 360, range: 140, label: "CAM-3", type: "fisheye", color: "#f59e0b" },
      { x: 60, y: 540, rotation: 45, fov: 90, range: 180, label: "CAM-4", type: "bullet", color: "#ef4444" },
      { x: 840, y: 540, rotation: 315, fov: 90, range: 180, label: "CAM-5", type: "bullet", color: "#ef4444" },
      { x: 760, y: 300, rotation: 180, fov: 60, range: 200, label: "CAM-6", type: "ptz", color: "#8b5cf6" },
    ],
  },
  {
    name: "Shop Floor",
    icon: "🏪",
    description: "Retail shop with entrance, display area, counter & storage",
    roomName: "Shop Floor Plan",
    walls: [
      // Outer walls
      { x1: 80, y1: 60, x2: 820, y2: 60 },
      { x1: 820, y1: 60, x2: 820, y2: 540 },
      { x1: 820, y1: 540, x2: 80, y2: 540 },
      { x1: 80, y1: 540, x2: 80, y2: 60 },
      // Counter wall
      { x1: 560, y1: 60, x2: 560, y2: 200 },
      // Storage room
      { x1: 560, y1: 380, x2: 820, y2: 380 },
      { x1: 560, y1: 200, x2: 560, y2: 380 },
    ],
    shapes: [
      { type: "text", x: 400, y: 46, width: 80, height: 20, label: "🚪 Entrance", color: "#22c55e" },
      { type: "rect", x: 120, y: 100, width: 160, height: 120, label: "Display 1", color: "#3b82f6" },
      { type: "rect", x: 320, y: 100, width: 160, height: 120, label: "Display 2", color: "#8b5cf6" },
      { type: "rect", x: 120, y: 300, width: 160, height: 120, label: "Display 3", color: "#f59e0b" },
      { type: "rect", x: 320, y: 300, width: 160, height: 120, label: "Display 4", color: "#22c55e" },
      { type: "rect", x: 600, y: 80, width: 180, height: 100, label: "Cash Counter", color: "#ef4444" },
      { type: "text", x: 650, y: 440, width: 100, height: 30, label: "Storage Room", color: "#64748b" },
      { type: "text", x: 250, y: 480, width: 100, height: 30, label: "Main Floor", color: "#64748b" },
      { type: "door", x: 550, y: 260, width: 20, height: 60, label: "Door", color: "#22c55e" },
    ],
    cameras: [
      { x: 100, y: 80, rotation: 135, fov: 90, range: 160, label: "CAM-1", type: "dome", color: "#3b82f6" },
      { x: 800, y: 80, rotation: 225, fov: 60, range: 180, label: "CAM-2", type: "bullet", color: "#ef4444" },
      { x: 450, y: 300, rotation: 0, fov: 360, range: 120, label: "CAM-3", type: "fisheye", color: "#f59e0b" },
      { x: 100, y: 520, rotation: 45, fov: 90, range: 160, label: "CAM-4", type: "dome", color: "#3b82f6" },
      { x: 800, y: 520, rotation: 315, fov: 90, range: 120, label: "CAM-5", type: "dome", color: "#3b82f6" },
    ],
  },
  {
    name: "Apartment",
    icon: "🏠",
    description: "Residential apartment with rooms, kitchen & balcony",
    roomName: "Apartment Security Plan",
    walls: [
      // Outer
      { x1: 60, y1: 60, x2: 840, y2: 60 },
      { x1: 840, y1: 60, x2: 840, y2: 540 },
      { x1: 840, y1: 540, x2: 60, y2: 540 },
      { x1: 60, y1: 540, x2: 60, y2: 60 },
      // Bedroom 1
      { x1: 60, y1: 280, x2: 320, y2: 280 },
      { x1: 320, y1: 60, x2: 320, y2: 280 },
      // Bedroom 2
      { x1: 560, y1: 60, x2: 560, y2: 280 },
      { x1: 560, y1: 280, x2: 840, y2: 280 },
      // Kitchen
      { x1: 560, y1: 400, x2: 840, y2: 400 },
      { x1: 560, y1: 280, x2: 560, y2: 540 },
    ],
    shapes: [
      { type: "text", x: 150, y: 160, width: 100, height: 30, label: "Bedroom 1", color: "#3b82f6" },
      { type: "text", x: 660, y: 160, width: 100, height: 30, label: "Bedroom 2", color: "#8b5cf6" },
      { type: "text", x: 200, y: 400, width: 100, height: 30, label: "Living Room", color: "#22c55e" },
      { type: "text", x: 670, y: 330, width: 100, height: 30, label: "Kitchen", color: "#f59e0b" },
      { type: "text", x: 670, y: 470, width: 100, height: 30, label: "Bathroom", color: "#64748b" },
      { type: "door", x: 200, y: 270, width: 60, height: 20, label: "Door", color: "#22c55e" },
      { type: "door", x: 600, y: 270, width: 60, height: 20, label: "Door", color: "#22c55e" },
      { type: "door", x: 60, y: 420, width: 20, height: 60, label: "Main Door", color: "#22c55e" },
    ],
    cameras: [
      { x: 80, y: 460, rotation: 45, fov: 90, range: 140, label: "CAM-1", type: "dome", color: "#3b82f6" },
      { x: 440, y: 300, rotation: 0, fov: 360, range: 100, label: "CAM-2", type: "fisheye", color: "#f59e0b" },
      { x: 80, y: 80, rotation: 135, fov: 60, range: 160, label: "CAM-3", type: "bullet", color: "#ef4444" },
    ],
  },
  {
    name: "Parking Lot",
    icon: "🅿️",
    description: "Open parking area with entry/exit gates & parking bays",
    roomName: "Parking Lot Security",
    walls: [
      // Boundary
      { x1: 40, y1: 40, x2: 860, y2: 40 },
      { x1: 860, y1: 40, x2: 860, y2: 560 },
      { x1: 860, y1: 560, x2: 40, y2: 560 },
      { x1: 40, y1: 560, x2: 40, y2: 40 },
    ],
    shapes: [
      { type: "rect", x: 80, y: 80, width: 300, height: 60, label: "Parking Bay A (5 slots)", color: "#3b82f6" },
      { type: "rect", x: 80, y: 180, width: 300, height: 60, label: "Parking Bay B (5 slots)", color: "#3b82f6" },
      { type: "rect", x: 80, y: 380, width: 300, height: 60, label: "Parking Bay C (5 slots)", color: "#3b82f6" },
      { type: "rect", x: 80, y: 480, width: 300, height: 60, label: "Parking Bay D (5 slots)", color: "#3b82f6" },
      { type: "rect", x: 520, y: 80, width: 300, height: 60, label: "Parking Bay E (5 slots)", color: "#8b5cf6" },
      { type: "rect", x: 520, y: 180, width: 300, height: 60, label: "Parking Bay F (5 slots)", color: "#8b5cf6" },
      { type: "rect", x: 520, y: 380, width: 300, height: 60, label: "Parking Bay G (5 slots)", color: "#8b5cf6" },
      { type: "rect", x: 520, y: 480, width: 300, height: 60, label: "Parking Bay H (5 slots)", color: "#8b5cf6" },
      { type: "text", x: 400, y: 310, width: 100, height: 30, label: "Driving Lane", color: "#64748b" },
      { type: "text", x: 60, y: 560, width: 80, height: 20, label: "🚗 Entry", color: "#22c55e" },
      { type: "text", x: 780, y: 560, width: 80, height: 20, label: "🚗 Exit", color: "#ef4444" },
    ],
    cameras: [
      { x: 60, y: 60, rotation: 135, fov: 90, range: 200, label: "CAM-1", type: "bullet", color: "#ef4444" },
      { x: 840, y: 60, rotation: 225, fov: 90, range: 200, label: "CAM-2", type: "bullet", color: "#ef4444" },
      { x: 450, y: 300, rotation: 0, fov: 360, range: 160, label: "CAM-3", type: "fisheye", color: "#f59e0b" },
      { x: 60, y: 540, rotation: 45, fov: 60, range: 180, label: "CAM-4", type: "ptz", color: "#8b5cf6" },
      { x: 840, y: 540, rotation: 315, fov: 60, range: 180, label: "CAM-5", type: "ptz", color: "#8b5cf6" },
    ],
  },
];

// ─── Helpers ────────────────────────────────────────────────
const uid = () => crypto.randomUUID();

function drawCameraFOV(
  ctx: CanvasRenderingContext2D,
  cam: CameraItem,
  isSelected: boolean,
) {
  const { x, y, rotation, fov, range, color } = cam;
  const startAngle = ((rotation - fov / 2) * Math.PI) / 180;
  const endAngle = ((rotation + fov / 2) * Math.PI) / 180;

  // FOV cone
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, startAngle, endAngle);
  ctx.closePath();
  const grad = ctx.createRadialGradient(x, y, 0, x, y, range);
  grad.addColorStop(0, color + "40");
  grad.addColorStop(0.7, color + "18");
  grad.addColorStop(1, color + "05");
  ctx.fillStyle = grad;
  ctx.fill();

  // FOV edge lines
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + range * Math.cos(startAngle), y + range * Math.sin(startAngle));
  ctx.moveTo(x, y);
  ctx.lineTo(x + range * Math.cos(endAngle), y + range * Math.sin(endAngle));
  ctx.strokeStyle = color + "80";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Camera body
  ctx.beginPath();
  ctx.arc(x, y, isSelected ? 12 : 10, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = isSelected ? "#ffffff" : "#00000040";
  ctx.lineWidth = isSelected ? 3 : 1.5;
  ctx.stroke();

  // Camera icon
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 10px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("📷", x, y);

  // Label
  ctx.fillStyle = "#1e293b";
  ctx.font = "600 10px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(cam.label, x, y + 22);
}

// ─── Component ──────────────────────────────────────────────
export default function CameraPlanner2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<Tool>("select");
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [walls, setWalls] = useState<WallItem[]>([]);
  const [shapes, setShapes] = useState<ShapeItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cameraType, setCameraType] = useState("dome");
  const [showGrid, setShowGrid] = useState(true);
  const [showFOV, setShowFOV] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 900, height: 600 });
  const [roomName, setRoomName] = useState("Floor Plan");

  // Save to history
  const pushHistory = useCallback(() => {
    setHistory((h) => [...h.slice(-49), { cameras: [...cameras], walls: [...walls], shapes: [...shapes] }]);
  }, [cameras, walls, shapes]);

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setCameras(prev.cameras);
    setWalls(prev.walls);
    setShapes(prev.shapes);
    setHistory((h) => h.slice(0, -1));
    setSelectedId(null);
  };

  // Selected camera
  const selectedCamera = cameras.find((c) => c.id === selectedId);
  const selectedShape = shapes.find((s) => s.id === selectedId);

  // Get canvas coordinates from mouse event
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    };
  };

  // Snap to grid
  const snap = (v: number) => (showGrid ? Math.round(v / GRID_SIZE) * GRID_SIZE : v);

  // ─── Mouse Handlers ──────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);

    if (tool === "select") {
      // Check cameras
      for (const cam of [...cameras].reverse()) {
        if (Math.hypot(cam.x - x, cam.y - y) < 14) {
          setSelectedId(cam.id);
          setIsDragging(true);
          setDragOffset({ x: x - cam.x, y: y - cam.y });
          pushHistory();
          return;
        }
      }
      // Check shapes
      for (const sh of [...shapes].reverse()) {
        if (x >= sh.x && x <= sh.x + sh.width && y >= sh.y && y <= sh.y + sh.height) {
          setSelectedId(sh.id);
          setIsDragging(true);
          setDragOffset({ x: x - sh.x, y: y - sh.y });
          pushHistory();
          return;
        }
      }
      setSelectedId(null);
      return;
    }

    if (tool === "camera") {
      pushHistory();
      const ct = CAMERA_TYPES.find((t) => t.value === cameraType) || CAMERA_TYPES[0];
      const newCam: CameraItem = {
        id: uid(),
        x: snap(x), y: snap(y),
        rotation: 0, fov: ct.fov, range: ct.range,
        label: `CAM-${cameras.length + 1}`,
        type: cameraType as any,
        color: ct.color,
      };
      setCameras((c) => [...c, newCam]);
      setSelectedId(newCam.id);
      setTool("select");
      toast.success(`${ct.label} camera placed!`);
      return;
    }

    if (tool === "wall" || tool === "rect" || tool === "circle" || tool === "door") {
      setDrawStart({ x: snap(x), y: snap(y) });
      return;
    }

    if (tool === "text") {
      pushHistory();
      const label = prompt("Enter text label:", "Room") || "Room";
      setShapes((s) => [...s, {
        id: uid(), type: "text",
        x: snap(x), y: snap(y),
        width: 100, height: 30,
        label, color: "#64748b",
      }]);
      setTool("select");
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);

    if (isDragging && selectedId) {
      const cam = cameras.find((c) => c.id === selectedId);
      if (cam) {
        setCameras((cs) =>
          cs.map((c) => c.id === selectedId ? { ...c, x: snap(x - dragOffset.x), y: snap(y - dragOffset.y) } : c)
        );
        return;
      }
      const sh = shapes.find((s) => s.id === selectedId);
      if (sh) {
        setShapes((ss) =>
          ss.map((s) => s.id === selectedId ? { ...s, x: snap(x - dragOffset.x), y: snap(y - dragOffset.y) } : s)
        );
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);

    if (drawStart && (tool === "wall")) {
      pushHistory();
      setWalls((w) => [...w, { id: uid(), x1: drawStart.x, y1: drawStart.y, x2: snap(x), y2: snap(y) }]);
      setDrawStart(null);
      return;
    }

    if (drawStart && (tool === "rect" || tool === "door")) {
      pushHistory();
      const w = Math.abs(snap(x) - drawStart.x);
      const h = Math.abs(snap(y) - drawStart.y);
      if (w > 5 && h > 5) {
        setShapes((s) => [...s, {
          id: uid(), type: tool === "door" ? "door" : "rect",
          x: Math.min(drawStart.x, snap(x)),
          y: Math.min(drawStart.y, snap(y)),
          width: w, height: h,
          label: tool === "door" ? "Door" : "",
          color: tool === "door" ? "#22c55e" : "#94a3b8",
        }]);
      }
      setDrawStart(null);
      return;
    }

    if (drawStart && tool === "circle") {
      pushHistory();
      const radius = Math.hypot(snap(x) - drawStart.x, snap(y) - drawStart.y);
      if (radius > 5) {
        setShapes((s) => [...s, {
          id: uid(), type: "circle",
          x: drawStart.x, y: drawStart.y,
          width: radius * 2, height: radius * 2,
          color: "#94a3b8",
        }]);
      }
      setDrawStart(null);
      return;
    }

    setIsDragging(false);
  };

  // ─── Canvas Rendering ─────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.scale(zoom, zoom);

    // Grid
    if (showGrid) {
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 0.5;
      for (let gx = 0; gx < canvasSize.width; gx += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, canvasSize.height);
        ctx.stroke();
      }
      for (let gy = 0; gy < canvasSize.height; gy += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(canvasSize.width, gy);
        ctx.stroke();
      }
    }

    // Walls
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 4;
    walls.forEach((w) => {
      ctx.beginPath();
      ctx.moveTo(w.x1, w.y1);
      ctx.lineTo(w.x2, w.y2);
      ctx.stroke();
    });

    // Shapes
    shapes.forEach((s) => {
      const isSel = s.id === selectedId;
      ctx.strokeStyle = isSel ? "#3b82f6" : s.color;
      ctx.lineWidth = isSel ? 2.5 : 1.5;

      if (s.type === "rect" || s.type === "door") {
        ctx.fillStyle = s.type === "door" ? "#22c55e20" : "#94a3b810";
        ctx.fillRect(s.x, s.y, s.width, s.height);
        ctx.strokeRect(s.x, s.y, s.width, s.height);
        if (s.type === "door") {
          // Door arc
          ctx.beginPath();
          ctx.arc(s.x, s.y + s.height, s.width, -Math.PI / 2, 0);
          ctx.strokeStyle = "#22c55e80";
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        if (s.label) {
          ctx.fillStyle = "#475569";
          ctx.font = "500 11px system-ui";
          ctx.textAlign = "center";
          ctx.fillText(s.label, s.x + s.width / 2, s.y + s.height / 2 + 4);
        }
      } else if (s.type === "circle") {
        const r = s.width / 2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fillStyle = "#94a3b810";
        ctx.fill();
        ctx.stroke();
      } else if (s.type === "text") {
        ctx.fillStyle = s.color;
        ctx.font = "600 14px system-ui";
        ctx.textAlign = "left";
        ctx.fillText(s.label || "", s.x, s.y);
      }
    });

    // Cameras
    cameras.forEach((cam) => {
      if (showFOV) drawCameraFOV(ctx, cam, cam.id === selectedId);
      else {
        // Just the dot
        ctx.beginPath();
        ctx.arc(cam.x, cam.y, cam.id === selectedId ? 12 : 10, 0, Math.PI * 2);
        ctx.fillStyle = cam.color;
        ctx.fill();
        ctx.strokeStyle = cam.id === selectedId ? "#fff" : "#00000040";
        ctx.lineWidth = cam.id === selectedId ? 3 : 1.5;
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("📷", cam.x, cam.y);
        ctx.fillStyle = "#1e293b";
        ctx.font = "600 10px system-ui";
        ctx.fillText(cam.label, cam.x, cam.y + 22);
      }
    });

    // Room name header
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 16px system-ui";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(roomName, 16, 12);

    ctx.restore();
  }, [cameras, walls, shapes, selectedId, showGrid, showFOV, zoom, canvasSize, roomName]);

  // ─── Export ───────────────────────────────────────────────
  const exportPNG = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${roomName.replace(/\s+/g, "_")}_camera_plan.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("PNG downloaded!");
  };

  const exportPDF = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width, canvas.height] });
    pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save(`${roomName.replace(/\s+/g, "_")}_camera_plan.pdf`);
    toast.success("PDF downloaded!");
  };

  const printPlan = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>${roomName} - Camera Plan</title>
      <style>@media print{body{margin:0}img{width:100%;height:auto}}</style>
      </head><body><img src="${canvas.toDataURL("image/png")}" /><script>setTimeout(()=>window.print(),300)</script></body></html>
    `);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    pushHistory();
    setCameras((c) => c.filter((i) => i.id !== selectedId));
    setWalls((w) => w.filter((i) => i.id !== selectedId));
    setShapes((s) => s.filter((i) => i.id !== selectedId));
    setSelectedId(null);
  };

  const clearAll = () => {
    pushHistory();
    setCameras([]);
    setWalls([]);
    setShapes([]);
    setSelectedId(null);
    toast.info("Canvas cleared");
  };

  const loadTemplate = (tpl: RoomTemplate) => {
    pushHistory();
    setCameras(tpl.cameras.map((c) => ({ ...c, id: uid() })));
    setWalls(tpl.walls.map((w) => ({ ...w, id: uid() })));
    setShapes(tpl.shapes.map((s) => ({ ...s, id: uid() })));
    setRoomName(tpl.roomName);
    setSelectedId(null);
    setTool("select");
    toast.success(`${tpl.name} template loaded!`);
  };

  // ─── Tool buttons ─────────────────────────────────────────
  const tools: { id: Tool; icon: any; label: string }[] = [
    { id: "select", icon: MousePointer, label: "Select / Move" },
    { id: "camera", icon: Camera, label: "Place Camera" },
    { id: "wall", icon: Square, label: "Draw Wall" },
    { id: "door", icon: Square, label: "Add Door" },
    { id: "rect", icon: Square, label: "Rectangle" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "text", icon: Type, label: "Text Label" },
  ];

  return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Camera className="h-6 w-6 text-primary" />
              2D Camera Planner
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              ক্যামেরা প্লেসমেন্ট ডিজাইন করুন, প্রিন্ট বা ডাউনলোড করুন
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportPNG}>
              <Download className="h-4 w-4 mr-1" /> PNG
            </Button>
            <Button variant="outline" size="sm" onClick={exportPDF}>
              <Download className="h-4 w-4 mr-1" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={printPlan}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </div>
        </div>

        <div className="flex gap-4 flex-col lg:flex-row">
          {/* ─── Left Panel: Tools ────────────────────────── */}
          <div className="w-full lg:w-64 space-y-3 flex-shrink-0">
            {/* Room Templates */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Layers className="h-4 w-4" /> Templates
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-0">
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
                  {ROOM_TEMPLATES.map((tpl) => (
                    <Button
                      key={tpl.name}
                      variant="outline"
                      size="sm"
                      className="h-auto py-2 px-2.5 text-left justify-start flex-col items-start gap-0.5"
                      onClick={() => loadTemplate(tpl)}
                    >
                      <span className="text-xs font-medium flex items-center gap-1.5">
                        <span>{tpl.icon}</span> {tpl.name}
                      </span>
                      <span className="text-[9px] text-muted-foreground leading-tight">{tpl.description}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tools */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Layers className="h-4 w-4" /> Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-0">
                <div className="grid grid-cols-4 lg:grid-cols-2 gap-1.5">
                  {tools.map((t) => (
                    <Button
                      key={t.id}
                      variant={tool === t.id ? "default" : "outline"}
                      size="sm"
                      className="h-9 text-xs flex-col gap-0.5 px-1"
                      onClick={() => setTool(t.id)}
                    >
                      <t.icon className="h-3.5 w-3.5" />
                      {t.label.split(" ")[0]}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Camera Type */}
            {tool === "camera" && (
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm">Camera Type</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0 space-y-2">
                  <Select value={cameraType} onValueChange={setCameraType}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMERA_TYPES.map((ct) => (
                        <SelectItem key={ct.value} value={ct.value}>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: ct.color }} />
                            {ct.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">Click on the canvas to place</p>
                </CardContent>
              </Card>
            )}

            {/* Selected Camera Properties */}
            {selectedCamera && (
              <Card className="border-primary/30">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Camera className="h-4 w-4" />
                    {selectedCamera.label}
                    <Badge variant="outline" className="ml-auto text-[9px]">{selectedCamera.type}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0 space-y-3">
                  <div>
                    <Label className="text-xs">Label</Label>
                    <Input
                      className="h-7 text-xs mt-1"
                      value={selectedCamera.label}
                      onChange={(e) =>
                        setCameras((cs) =>
                          cs.map((c) => c.id === selectedId ? { ...c, label: e.target.value } : c)
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Rotation: {selectedCamera.rotation}°</Label>
                    <Slider
                      min={0} max={360} step={5}
                      value={[selectedCamera.rotation]}
                      onValueChange={([v]) => {
                        setCameras((cs) =>
                          cs.map((c) => c.id === selectedId ? { ...c, rotation: v } : c)
                        );
                      }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">FOV: {selectedCamera.fov}°</Label>
                    <Slider
                      min={10} max={360} step={5}
                      value={[selectedCamera.fov]}
                      onValueChange={([v]) => {
                        setCameras((cs) =>
                          cs.map((c) => c.id === selectedId ? { ...c, fov: v } : c)
                        );
                      }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Range: {selectedCamera.range}px</Label>
                    <Slider
                      min={30} max={300} step={10}
                      value={[selectedCamera.range]}
                      onValueChange={([v]) => {
                        setCameras((cs) =>
                          cs.map((c) => c.id === selectedId ? { ...c, range: v } : c)
                        );
                      }}
                      className="mt-1"
                    />
                  </div>
                  <Button variant="destructive" size="sm" className="w-full h-7 text-xs" onClick={deleteSelected}>
                    <Trash2 className="h-3 w-3 mr-1" /> Delete Camera
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* View Options */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Eye className="h-4 w-4" /> View
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-0 space-y-2">
                <div>
                  <Label className="text-xs">Room Name</Label>
                  <Input
                    className="h-7 text-xs mt-1"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                  />
                </div>
                <div className="flex gap-1.5">
                  <Button
                    variant={showGrid ? "default" : "outline"}
                    size="sm" className="h-7 text-xs flex-1"
                    onClick={() => setShowGrid(!showGrid)}
                  >
                    <Grid3X3 className="h-3 w-3 mr-1" /> Grid
                  </Button>
                  <Button
                    variant={showFOV ? "default" : "outline"}
                    size="sm" className="h-7 text-xs flex-1"
                    onClick={() => setShowFOV(!showFOV)}
                  >
                    <Eye className="h-3 w-3 mr-1" /> FOV
                  </Button>
                </div>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => setZoom((z) => Math.min(z + 0.1, 2))}>
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => setZoom((z) => Math.max(z - 0.1, 0.5))}>
                    <ZoomOut className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={undo} disabled={history.length === 0}>
                    <Undo2 className="h-3 w-3 mr-1" /> Undo
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs flex-1 text-destructive" onClick={clearAll}>
                    <Trash2 className="h-3 w-3 mr-1" /> Clear
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardContent className="p-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Cameras</span>
                  <Badge variant="secondary" className="text-[10px]">{cameras.length}</Badge>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Walls</span>
                  <Badge variant="secondary" className="text-[10px]">{walls.length}</Badge>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Objects</span>
                  <Badge variant="secondary" className="text-[10px]">{shapes.length}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── Canvas ──────────────────────────────────── */}
          <Card className="flex-1 overflow-hidden">
            <CardContent className="p-0" ref={containerRef}>
              <div className="overflow-auto bg-muted/30 border rounded-lg" style={{ maxHeight: "calc(100vh - 200px)" }}>
                <canvas
                  ref={canvasRef}
                  width={canvasSize.width * zoom}
                  height={canvasSize.height * zoom}
                  className="cursor-crosshair"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={() => setIsDragging(false)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
);
}
