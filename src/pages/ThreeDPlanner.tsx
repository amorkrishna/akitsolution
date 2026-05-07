import { useState, useRef, useCallback, Suspense, useEffect } from "react";
import { Canvas, useThree, useFrame, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Grid, Text, Html, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Printer, Camera, Server, Move, Ruler, RotateCcw, Plus, Minus, 
  Eye, Trash2, ArrowLeft, Box, MonitorSpeaker, Lightbulb, FileDown, Loader2,
  Save, FolderOpen, X, Cable, Unplug, Zap, Wifi, Network, Share2, Link, Check,
  Building2, Layers, DoorOpen, PlusCircle, ChevronRight, ChevronDown, Palette,
  Lock, Router, HardDrive, Monitor, Cpu, Fan, Shield, Pencil, Copy, Map, Flame
} from "lucide-react";
import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PlacedObject {
  id: string;
  type: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  label: string;
  customSize?: [number, number, number];
  zoneId?: string;
}

interface CableConnection {
  id: string;
  fromId: string;
  toId: string;
  cableType: string;
  color: string;
  label: string;
}

interface Zone {
  id: string;
  name: string;
  type: "room" | "hallway" | "server-room" | "office" | "reception" | "storage" | "outdoor";
  floorId: string;
  width: number;
  depth: number;
  height: number;
  offsetX: number;
  offsetZ: number;
  color: string;
}

interface Floor {
  id: string;
  name: string;
  level: number;
  buildingId: string;
}

interface BuildingConfig {
  id: string;
  name: string;
  floors: Floor[];
  zones: Zone[];
}

interface CustomEquipment {
  type: string;
  label: string;
  color: string;
  size: [number, number, number];
  icon: string;
}

const CABLE_TYPES = [
  { type: "ethernet", label: "Ethernet (Cat6)", color: "#3b82f6", icon: Network },
  { type: "power", label: "Power Cable", color: "#ef4444", icon: Zap },
  { type: "hdmi", label: "HDMI / Video", color: "#10b981", icon: Cable },
  { type: "fiber", label: "Fiber Optic", color: "#f59e0b", icon: Wifi },
];

const ICON_OPTIONS = [
  { key: "box", label: "Box", Icon: Box },
  { key: "server", label: "Server", Icon: Server },
  { key: "camera", label: "Camera", Icon: Camera },
  { key: "monitor", label: "Monitor", Icon: Monitor },
  { key: "router", label: "Router", Icon: Router },
  { key: "harddrive", label: "Hard Drive", Icon: HardDrive },
  { key: "cpu", label: "CPU/PC", Icon: Cpu },
  { key: "printer", label: "Printer", Icon: Printer },
  { key: "light", label: "Light", Icon: Lightbulb },
  { key: "lock", label: "Lock", Icon: Lock },
  { key: "fan", label: "Fan/AC", Icon: Fan },
  { key: "shield", label: "Shield/UPS", Icon: Shield },
];

const getIconComponent = (key: string) => {
  return ICON_OPTIONS.find(i => i.key === key)?.Icon || Box;
};

const OBJECT_CATALOG = [
  { type: "3d-printer", label: "3D Printer", icon: "printer", color: "#8b5cf6", size: [1.2, 1.0, 1.0] as [number,number,number] },
  { type: "camera", label: "CCTV Camera", icon: "camera", color: "#06b6d4", size: [0.3, 0.3, 0.5] as [number,number,number] },
  { type: "server-rack", label: "Server Rack", icon: "server", color: "#6366f1", size: [0.6, 2.0, 0.8] as [number,number,number] },
  { type: "workstation", label: "Workstation", icon: "monitor", color: "#a855f7", size: [1.5, 0.75, 0.7] as [number,number,number] },
  { type: "table", label: "Table/Desk", icon: "box", color: "#78716c", size: [2.0, 0.75, 1.0] as [number,number,number] },
  { type: "light", label: "Ceiling Light", icon: "light", color: "#fbbf24", size: [0.4, 0.1, 0.4] as [number,number,number] },
  { type: "router", label: "Router/Switch", icon: "router", color: "#14b8a6", size: [0.4, 0.1, 0.3] as [number,number,number] },
  { type: "ups", label: "UPS/Battery", icon: "shield", color: "#f97316", size: [0.4, 0.6, 0.3] as [number,number,number] },
  { type: "ac-unit", label: "AC Unit", icon: "fan", color: "#0ea5e9", size: [0.8, 0.3, 0.3] as [number,number,number] },
  { type: "door-lock", label: "Door Lock", icon: "lock", color: "#eab308", size: [0.15, 0.1, 0.08] as [number,number,number] },
  { type: "attendance", label: "Attendance Device", icon: "cpu", color: "#ec4899", size: [0.25, 0.2, 0.05] as [number,number,number] },
  { type: "nas", label: "NAS/Storage", icon: "harddrive", color: "#8b5cf6", size: [0.3, 0.2, 0.4] as [number,number,number] },
];

const ZONE_COLORS: Record<string, string> = {
  "room": "#1e1b4b",
  "hallway": "#172554",
  "server-room": "#1a0a2e",
  "office": "#1c1917",
  "reception": "#052e16",
  "storage": "#292524",
  "outdoor": "#0c4a6e",
};

const ZONE_TYPE_LABELS: Record<string, string> = {
  "room": "General Room",
  "hallway": "Hallway/Corridor",
  "server-room": "Server Room",
  "office": "Office",
  "reception": "Reception/Lobby",
  "storage": "Storage Room",
  "outdoor": "Outdoor/Parking",
};

// Room walls component
function Room({ width, depth, height, color }: { width: number; depth: number; height: number; color?: string }) {
  const wallColor = color || "#1a1625";
  const edgeColor = "#7c3aed";

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={wallColor} opacity={0.9} transparent />
      </mesh>
      <mesh position={[0, height / 2, -depth / 2]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={wallColor} opacity={0.3} transparent side={THREE.DoubleSide} />
      </mesh>
      <lineSegments position={[0, height / 2, -depth / 2]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(width, height)]} />
        <lineBasicMaterial color={edgeColor} opacity={0.5} transparent />
      </lineSegments>
      <mesh position={[-width / 2, height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial color={wallColor} opacity={0.2} transparent side={THREE.DoubleSide} />
      </mesh>
      <lineSegments position={[-width / 2, height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(depth, height)]} />
        <lineBasicMaterial color={edgeColor} opacity={0.5} transparent />
      </lineSegments>
      <mesh position={[width / 2, height / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial color={wallColor} opacity={0.2} transparent side={THREE.DoubleSide} />
      </mesh>
      <Text position={[0, -0.05, depth / 2 + 0.5]} fontSize={0.3} color={edgeColor} anchorX="center">
        {width.toFixed(1)}m
      </Text>
      <Text position={[-width / 2 - 0.5, -0.05, 0]} fontSize={0.3} color={edgeColor} rotation={[0, Math.PI / 2, 0]} anchorX="center">
        {depth.toFixed(1)}m
      </Text>
      <Text position={[-width / 2 - 0.5, height / 2, -depth / 2]} fontSize={0.3} color={edgeColor} rotation={[0, Math.PI / 2, 0]} anchorX="center">
        {height.toFixed(1)}m
      </Text>
    </group>
  );
}

function DragPlane({ onDrag, onDragEnd, active }: { 
  onDrag: (point: THREE.Vector3) => void; 
  onDragEnd: () => void;
  active: boolean;
}) {
  if (!active) return null;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} visible={false}
      onPointerMove={(e) => { e.stopPropagation(); if (e.point) onDrag(e.point); }}
      onPointerUp={(e) => { e.stopPropagation(); onDragEnd(); }}
    >
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

function DraggableObject({ obj, isSelected, onSelect, onDragStart, isDragging, allCatalog }: {
  obj: PlacedObject;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragStart: (id: string, heightY: number) => void;
  isDragging: boolean;
  allCatalog: { type: string; size: [number,number,number] }[];
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const catalogItem = allCatalog.find(c => c.type === obj.type);
  const size = obj.customSize || catalogItem?.size || [1, 1, 1];
  const [hovered, setHovered] = useState(false);

  const { gl } = useThree();
  useEffect(() => {
    gl.domElement.style.cursor = hovered ? "grab" : "auto";
    return () => { gl.domElement.style.cursor = "auto"; };
  }, [hovered, gl]);

  return (
    <group position={obj.position} rotation={obj.rotation}>
      <mesh ref={meshRef} castShadow
        onPointerDown={(e) => { e.stopPropagation(); onSelect(obj.id); onDragStart(obj.id, size[1] / 2); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={size as [number, number, number]} />
        <meshStandardMaterial 
          color={obj.color} 
          opacity={isDragging ? 0.5 : isSelected ? 0.9 : hovered ? 0.8 : 0.7} 
          transparent 
          emissive={isSelected || isDragging ? obj.color : hovered ? obj.color : "#000000"}
          emissiveIntensity={isDragging ? 0.5 : isSelected ? 0.3 : hovered ? 0.15 : 0}
        />
      </mesh>
      {(isSelected || isDragging) && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(...(size as [number, number, number]))]} />
          <lineBasicMaterial color="#ffffff" linewidth={2} />
        </lineSegments>
      )}
      <Html position={[0, (size[1] / 2) + 0.3, 0]} center distanceFactor={8}>
        <div className="bg-background/90 backdrop-blur-sm border border-primary/30 rounded px-2 py-0.5 text-xs whitespace-nowrap text-foreground font-medium">
          {obj.label}
          {isDragging && <span className="ml-1 text-primary">✦</span>}
        </div>
      </Html>
      {obj.type === "camera" && (
        <mesh position={[0, 0, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.4, 0.8, 8]} />
          <meshStandardMaterial color="#06b6d4" opacity={0.2} transparent wireframe />
        </mesh>
      )}
    </group>
  );
}

function MeasurementLine({ start, end }: { start: THREE.Vector3; end: THREE.Vector3 }) {
  const distance = start.distanceTo(end);
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const points = [start, end];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const lineMaterial = new THREE.LineBasicMaterial({ color: "#fbbf24", linewidth: 2 });
  const lineObj = new THREE.Line(geometry, lineMaterial);
  return (
    <group>
      <primitive object={lineObj} />
      <Html position={[mid.x, mid.y + 0.3, mid.z]} center distanceFactor={8}>
        <div className="bg-yellow-500/90 text-black rounded px-2 py-0.5 text-xs font-bold whitespace-nowrap">
          {distance.toFixed(2)}m
        </div>
      </Html>
    </group>
  );
}

function CableRouteLine({ fromPos, toPos, color, label }: { 
  fromPos: [number,number,number]; toPos: [number,number,number]; color: string; label: string;
}) {
  const start = new THREE.Vector3(...fromPos);
  const end = new THREE.Vector3(...toPos);
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  mid.y = 0.05; start.y = 0.05; end.y = 0.05;
  const curve = new THREE.QuadraticBezierCurve3(start, new THREE.Vector3(mid.x, 0.05, mid.z), end);
  const curvePoints = curve.getPoints(20);
  const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
  const lineMaterial = new THREE.LineBasicMaterial({ color, linewidth: 2 });
  const lineObj = new THREE.Line(geometry, lineMaterial);
  const dashMat = new THREE.LineDashedMaterial({ color, dashSize: 0.15, gapSize: 0.08, linewidth: 1 });
  const dashLine = new THREE.Line(geometry.clone(), dashMat);
  dashLine.computeLineDistances();
  const dist = start.distanceTo(end);
  return (
    <group>
      <primitive object={lineObj} />
      <primitive object={dashLine} />
      <mesh position={[start.x, 0.06, start.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.06, 0.1, 12]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[end.x, 0.06, end.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.06, 0.1, 12]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
      <Html position={[mid.x, 0.25, mid.z]} center distanceFactor={8}>
        <div className="rounded px-1.5 py-0.5 text-[9px] font-semibold whitespace-nowrap border" 
          style={{ background: `${color}dd`, color: "#fff", borderColor: color }}>
          {label} ({dist.toFixed(1)}m)
        </div>
      </Html>
    </group>
  );
}

// Zone outline for building view
function ZoneOutline({ zone, isActive, onClick }: { zone: Zone; isActive: boolean; onClick: () => void }) {
  const edgeColor = isActive ? "#22d3ee" : "#7c3aed";
  return (
    <group position={[zone.offsetX, 0, zone.offsetZ]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <planeGeometry args={[zone.width, zone.depth]} />
        <meshStandardMaterial color={ZONE_COLORS[zone.type] || "#1a1625"} opacity={isActive ? 0.7 : 0.4} transparent />
      </mesh>
      <lineSegments rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(zone.width, zone.depth)]} />
        <lineBasicMaterial color={edgeColor} opacity={isActive ? 1 : 0.4} transparent />
      </lineSegments>
      <Text position={[0, 0.02, 0]} fontSize={0.4} color={edgeColor} rotation={[-Math.PI / 2, 0, 0]} anchorX="center" anchorY="middle">
        {zone.name}
      </Text>
      <Text position={[0, 0.02, zone.depth / 2 - 0.3]} fontSize={0.2} color="#a78bfa" rotation={[-Math.PI / 2, 0, 0]} anchorX="center">
        {zone.width}m × {zone.depth}m
      </Text>
    </group>
  );
}

// 2D Floor Map with Equipment Heatmap
function FloorMap2D({ zones, objects, allCatalog, floorName, onZoneClick }: {
  zones: Zone[];
  objects: PlacedObject[];
  allCatalog: { type: string; size: [number, number, number]; label?: string; color?: string }[];
  floorName: string;
  onZoneClick: (id: string) => void;
}) {
  const [showHeatmap, setShowHeatmap] = useState(true);
  const allX = zones.flatMap(z => [z.offsetX - z.width / 2, z.offsetX + z.width / 2]);
  const allZ = zones.flatMap(z => [z.offsetZ - z.depth / 2, z.offsetZ + z.depth / 2]);
  const minX = zones.length ? Math.min(...allX) - 2 : -10;
  const maxX = zones.length ? Math.max(...allX) + 2 : 10;
  const minZ = zones.length ? Math.min(...allZ) - 2 : -10;
  const maxZ = zones.length ? Math.max(...allZ) + 2 : 10;
  const rangeX = maxX - minX || 20;
  const rangeZ = maxZ - minZ || 20;
  const zoneEquipCount: Record<string, number> = {};
  zones.forEach(z => { zoneEquipCount[z.id] = 0; });
  objects.forEach(obj => { if (obj.zoneId && zoneEquipCount[obj.zoneId] !== undefined) zoneEquipCount[obj.zoneId]++; });
  const maxCount = Math.max(1, ...Object.values(zoneEquipCount));
  const getHeatColor = (count: number) => {
    const ratio = count / maxCount;
    if (ratio === 0) return "rgba(30,40,80,0.4)";
    if (ratio < 0.25) return "rgba(59,130,246,0.5)";
    if (ratio < 0.5) return "rgba(16,185,129,0.5)";
    if (ratio < 0.75) return "rgba(245,158,11,0.5)";
    return "rgba(239,68,68,0.55)";
  };
  const toSvgX = (x: number) => ((x - minX) / rangeX) * 100;
  const toSvgY = (z: number) => ((z - minZ) / rangeZ) * 100;
  const toSvgW = (w: number) => (w / rangeX) * 100;
  const toSvgH = (d: number) => (d / rangeZ) * 100;

  return (
    <div className="w-full h-full bg-[#080510] flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-card/30">
        <div className="flex items-center gap-2">
          <Map className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">{floorName} — 2D Floor Map</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] border transition-all ${showHeatmap ? "border-orange-500/50 bg-orange-500/10 text-orange-400" : "border-border/40 text-muted-foreground hover:bg-muted/30"}`}>
            <Flame className="h-3 w-3" /> Heatmap
          </button>
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
            <span>Density:</span>
            {[["rgba(59,130,246,0.7)","Low"],["rgba(16,185,129,0.7)","Med"],["rgba(245,158,11,0.7)","High"],["rgba(239,68,68,0.7)","Max"]].map(([c,l]) => (
              <div key={l} className="flex items-center gap-0.5"><div className="w-2.5 h-2.5 rounded-sm" style={{background:c}}/><span>{l}</span></div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-hidden">
        {zones.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            <div className="text-center">
              <Map className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No zones on this floor yet.</p>
              <p className="text-[10px] mt-1">Add zones from the Building tab to see the floor map.</p>
            </div>
          </div>
        ) : (
          <svg viewBox="-2 -2 104 104" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            <defs>
              <pattern id="floorGrid" width={toSvgW(1)} height={toSvgH(1)} patternUnits="userSpaceOnUse">
                <rect width="100%" height="100%" fill="none" />
                <path d={`M ${toSvgW(1)} 0 L 0 0 0 ${toSvgH(1)}`} fill="none" stroke="#2d2640" strokeWidth="0.15" />
              </pattern>
            </defs>
            <rect x="0" y="0" width="100" height="100" fill="url(#floorGrid)" />
            {zones.map(zone => {
              const x = toSvgX(zone.offsetX) - toSvgW(zone.width) / 2;
              const y = toSvgY(zone.offsetZ) - toSvgH(zone.depth) / 2;
              const w = toSvgW(zone.width); const h = toSvgH(zone.depth);
              const count = zoneEquipCount[zone.id] || 0;
              return (
                <g key={zone.id} className="cursor-pointer" onClick={() => onZoneClick(zone.id)}>
                  <rect x={x} y={y} width={w} height={h}
                    fill={showHeatmap ? getHeatColor(count) : (ZONE_COLORS[zone.type] || "#1a1625")}
                    stroke="#7c3aed" strokeWidth="0.4" rx="0.5" className="transition-all hover:stroke-[#22d3ee] hover:stroke-[0.6]" />
                  <text x={x+w/2} y={y+h/2-1.5} textAnchor="middle" dominantBaseline="middle"
                    fill="#e0e0ff" fontSize="2.2" fontWeight="bold" className="pointer-events-none select-none">{zone.name}</text>
                  <text x={x+w/2} y={y+h/2+2} textAnchor="middle" dominantBaseline="middle"
                    fill="#a78bfa" fontSize="1.5" className="pointer-events-none select-none">{zone.width}m × {zone.depth}m</text>
                  {count > 0 && (<>
                    <circle cx={x+w-2} cy={y+2} r="2" fill="rgba(0,0,0,0.5)" />
                    <text x={x+w-2} y={y+2.5} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="1.6" fontWeight="bold" className="pointer-events-none">{count}</text>
                  </>)}
                  <text x={x+1} y={y+2} fill="#a78bfa" fontSize="1.2" className="pointer-events-none select-none opacity-70">
                    {ZONE_TYPE_LABELS[zone.type]?.split(" ")[0]}
                  </text>
                  {objects.filter(o => o.zoneId === zone.id).map((obj, oi) => {
                    const dotX = Math.min(x + w * 0.15 + (oi % 5) * (w * 0.15), x + w - 1);
                    const dotY = Math.min(y + h * 0.65 + Math.floor(oi / 5) * 2.5, y + h - 1);
                    return (<g key={obj.id}><circle cx={dotX} cy={dotY} r="0.8" fill={obj.color} opacity={0.9} /><title>{obj.label}</title></g>);
                  })}
                </g>
              );
            })}
            <line x1="2" y1="98" x2={2+toSvgW(5)} y2="98" stroke="#7c3aed" strokeWidth="0.3" />
            <line x1="2" y1="97" x2="2" y2="99" stroke="#7c3aed" strokeWidth="0.2" />
            <line x1={2+toSvgW(5)} y1="97" x2={2+toSvgW(5)} y2="99" stroke="#7c3aed" strokeWidth="0.2" />
            <text x={2+toSvgW(5)/2} y="97" textAnchor="middle" fill="#a78bfa" fontSize="1.4">5m</text>
          </svg>
        )}
      </div>
    </div>
  );
}

function Scene({
  objects, selectedId, onSelect, onMove, roomSize, measurements, cables, allCatalog,
  zones, activeZoneId, onZoneClick, viewMode
}: {
  objects: PlacedObject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, pos: [number, number, number]) => void;
  roomSize: { w: number; d: number; h: number };
  measurements: { start: THREE.Vector3; end: THREE.Vector3 }[];
  cables: CableConnection[];
  allCatalog: { type: string; size: [number,number,number] }[];
  zones: Zone[];
  activeZoneId: string | null;
  onZoneClick: (id: string) => void;
  viewMode: "room" | "building" | "floormap";
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragHeight, setDragHeight] = useState(0.5);
  const controlsRef = useRef<any>(null);

  const handleDragStart = useCallback((id: string, heightY: number) => {
    setDraggingId(id);
    setDragHeight(heightY);
    if (controlsRef.current) controlsRef.current.enabled = false;
  }, []);

  const handleDrag = useCallback((point: THREE.Vector3) => {
    if (!draggingId) return;
    const snappedX = Math.round(point.x * 4) / 4;
    const snappedZ = Math.round(point.z * 4) / 4;
    const halfW = roomSize.w / 2 - 0.5;
    const halfD = roomSize.d / 2 - 0.5;
    const x = Math.max(-halfW, Math.min(halfW, snappedX));
    const z = Math.max(-halfD, Math.min(halfD, snappedZ));
    onMove(draggingId, [x, dragHeight, z]);
  }, [draggingId, dragHeight, onMove, roomSize]);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    if (controlsRef.current) controlsRef.current.enabled = true;
  }, []);

  const gridSize = viewMode === "building" ? 50 : roomSize.w;
  const gridDepth = viewMode === "building" ? 50 : roomSize.d;

  return (
    <>
      <PerspectiveCamera makeDefault position={viewMode === "building" ? [20, 15, 20] : [8, 6, 8]} fov={50} />
      <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.05} minDistance={3} maxDistance={50} maxPolarAngle={Math.PI / 2 - 0.05} />
      
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />
      <pointLight position={[0, roomSize.h - 0.5, 0]} intensity={0.5} color="#a78bfa" />

      <DragPlane onDrag={handleDrag} onDragEnd={handleDragEnd} active={draggingId !== null} />

      <Grid args={[gridSize, gridDepth]} cellSize={0.5} cellThickness={0.5} cellColor="#2d2640"
        sectionSize={1} sectionThickness={1} sectionColor="#7c3aed" fadeDistance={30} position={[0, 0.01, 0]} />

      {viewMode === "room" && <Room width={roomSize.w} depth={roomSize.d} height={roomSize.h} />}

      {viewMode === "building" && zones.map(zone => (
        <ZoneOutline key={zone.id} zone={zone} isActive={activeZoneId === zone.id} onClick={() => onZoneClick(zone.id)} />
      ))}

      {objects.map((obj) => (
        <DraggableObject key={obj.id} obj={obj} isSelected={selectedId === obj.id} onSelect={onSelect}
          onDragStart={handleDragStart} isDragging={draggingId === obj.id} allCatalog={allCatalog} />
      ))}

      {measurements.map((m, i) => (
        <MeasurementLine key={i} start={m.start} end={m.end} />
      ))}

      {cables.map((cable) => {
        const fromObj = objects.find(o => o.id === cable.fromId);
        const toObj = objects.find(o => o.id === cable.toId);
        if (!fromObj || !toObj) return null;
        return <CableRouteLine key={cable.id} fromPos={fromObj.position} toPos={toObj.position} color={cable.color} label={cable.label} />;
      })}
    </>
  );
}

export default function ThreeDPlanner() {
  const navigate = useNavigate();
  const [objects, setObjects] = useState<PlacedObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [roomSize, setRoomSize] = useState({ w: 10, d: 8, h: 3 });
  const [measurements, setMeasurements] = useState<{ start: THREE.Vector3; end: THREE.Vector3 }[]>([]);
  const [measureMode, setMeasureMode] = useState(false);
  const [measureStart, setMeasureStart] = useState<string | null>(null);
  const [cables, setCables] = useState<CableConnection[]>([]);
  const [cableMode, setCableMode] = useState(false);
  const [cableStart, setCableStart] = useState<string | null>(null);
  const [selectedCableType, setSelectedCableType] = useState("ethernet");
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [layoutName, setLayoutName] = useState("Untitled Layout");
  const [savedLayouts, setSavedLayouts] = useState<any[]>([]);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [currentLayoutId, setCurrentLayoutId] = useState<string | null>(null);
  const [loadingLayouts, setLoadingLayouts] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  // Custom equipment state
  const [customEquipments, setCustomEquipments] = useState<CustomEquipment[]>([]);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [newCustom, setNewCustom] = useState<CustomEquipment>({
    type: "", label: "", color: "#3b82f6", size: [0.5, 0.5, 0.5], icon: "box"
  });

  // Building / Zone state
  const [viewMode, setViewMode] = useState<"room" | "building" | "floormap">("room");
  const [building, setBuilding] = useState<BuildingConfig>({
    id: "bld-1",
    name: "Main Building",
    floors: [{ id: "floor-1", name: "Ground Floor", level: 0, buildingId: "bld-1" }],
    zones: [],
  });
  const [activeFloorId, setActiveFloorId] = useState("floor-1");
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [newZone, setNewZone] = useState<Partial<Zone>>({
    name: "", type: "office", width: 6, depth: 5, height: 3, offsetX: 0, offsetZ: 0
  });
  const [floorDialogOpen, setFloorDialogOpen] = useState(false);
  const [newFloorName, setNewFloorName] = useState("");
  const [leftTab, setLeftTab] = useState("equipment");

  // Combined catalog for lookups
  const allCatalog = [
    ...OBJECT_CATALOG,
    ...customEquipments.map(ce => ({ type: ce.type, size: ce.size, label: ce.label, color: ce.color, icon: ce.icon })),
  ];

  const addCustomEquipment = () => {
    if (!newCustom.label.trim()) { toast.error("Name is required"); return; }
    const typeKey = `custom-${newCustom.label.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const eq: CustomEquipment = { ...newCustom, type: typeKey };
    setCustomEquipments(prev => [...prev, eq]);
    setCustomDialogOpen(false);
    setNewCustom({ type: "", label: "", color: "#3b82f6", size: [0.5, 0.5, 0.5], icon: "box" });
    toast.success(`"${eq.label}" equipment created!`);
  };

  const addObject = (type: string) => {
    const catalog = allCatalog.find(c => c.type === type);
    if (!catalog) return;
    const size = catalog.size;
    const newObj: PlacedObject = {
      id: `${type}-${Date.now()}`,
      type,
      position: [Math.random() * 4 - 2, size[1] / 2, Math.random() * 4 - 2],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: catalog.color,
      label: catalog.label,
      customSize: customEquipments.find(c => c.type === type) ? size : undefined,
      zoneId: activeZoneId || undefined,
    };
    setObjects(prev => [...prev, newObj]);
    setSelectedId(newObj.id);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setCables(prev => prev.filter(c => c.fromId !== selectedId && c.toId !== selectedId));
    setObjects(prev => prev.filter(o => o.id !== selectedId));
    setSelectedId(null);
  };

  const moveSelected = (axis: "x" | "y" | "z", delta: number) => {
    if (!selectedId) return;
    setObjects(prev => prev.map(o => {
      if (o.id !== selectedId) return o;
      const pos = [...o.position] as [number, number, number];
      const idx = axis === "x" ? 0 : axis === "y" ? 1 : 2;
      pos[idx] += delta;
      return { ...o, position: pos };
    }));
  };

  const rotateSelected = () => {
    if (!selectedId) return;
    setObjects(prev => prev.map(o => {
      if (o.id !== selectedId) return o;
      const rot = [...o.rotation] as [number, number, number];
      rot[1] += Math.PI / 4;
      return { ...o, rotation: rot };
    }));
  };

  const handleMeasure = () => {
    if (!measureMode) { setMeasureMode(true); setMeasureStart(null); return; }
    if (measureStart && selectedId && measureStart !== selectedId) {
      const startObj = objects.find(o => o.id === measureStart);
      const endObj = objects.find(o => o.id === selectedId);
      if (startObj && endObj) {
        setMeasurements(prev => [...prev, { start: new THREE.Vector3(...startObj.position), end: new THREE.Vector3(...endObj.position) }]);
      }
      setMeasureMode(false); setMeasureStart(null);
    } else if (selectedId) { setMeasureStart(selectedId); }
  };

  // Building management
  const addFloor = () => {
    if (!newFloorName.trim()) return;
    const maxLevel = Math.max(0, ...building.floors.map(f => f.level));
    const floor: Floor = { id: `floor-${Date.now()}`, name: newFloorName, level: maxLevel + 1, buildingId: building.id };
    setBuilding(prev => ({ ...prev, floors: [...prev.floors, floor] }));
    setFloorDialogOpen(false);
    setNewFloorName("");
    toast.success(`Floor "${floor.name}" added`);
  };

  const addZone = () => {
    if (!newZone.name?.trim()) { toast.error("Zone name required"); return; }
    const zone: Zone = {
      id: `zone-${Date.now()}`,
      name: newZone.name!,
      type: (newZone.type as Zone["type"]) || "office",
      floorId: activeFloorId,
      width: newZone.width || 6,
      depth: newZone.depth || 5,
      height: newZone.height || 3,
      offsetX: newZone.offsetX || 0,
      offsetZ: newZone.offsetZ || 0,
      color: ZONE_COLORS[newZone.type || "office"] || "#1a1625",
    };
    setBuilding(prev => ({ ...prev, zones: [...prev.zones, zone] }));
    setZoneDialogOpen(false);
    setNewZone({ name: "", type: "office", width: 6, depth: 5, height: 3, offsetX: 0, offsetZ: 0 });
    toast.success(`Zone "${zone.name}" added`);
  };

  const enterZone = (zoneId: string) => {
    const zone = building.zones.find(z => z.id === zoneId);
    if (!zone) return;
    setActiveZoneId(zoneId);
    setRoomSize({ w: zone.width, d: zone.depth, h: zone.height });
    setViewMode("room");
    toast.info(`Entered: ${zone.name}`);
  };

  const exitToBuilding = () => {
    setActiveZoneId(null);
    setViewMode("building");
  };

  // Filtered objects for current zone
  const visibleObjects = viewMode === "building" 
    ? objects.filter(o => !o.zoneId || building.zones.some(z => z.floorId === activeFloorId && z.id === o.zoneId))
    : activeZoneId 
      ? objects.filter(o => o.zoneId === activeZoneId || !o.zoneId)
      : objects;

  const currentFloorZones = building.zones.filter(z => z.floorId === activeFloorId);

  // Save / Load
  const saveLayout = useCallback(async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please login to save layouts"); return; }
      const layoutData = {
        user_id: user.id, name: layoutName,
        room_width: roomSize.w, room_depth: roomSize.d, room_height: roomSize.h,
        objects: { items: objects, cables, customEquipments, building } as any,
        measurements: measurements.map(m => ({ start: { x: m.start.x, y: m.start.y, z: m.start.z }, end: { x: m.end.x, y: m.end.y, z: m.end.z } })) as any,
      };
      if (currentLayoutId) {
        const { error } = await supabase.from("planner_layouts").update(layoutData).eq("id", currentLayoutId);
        if (error) throw error;
        toast.success("Layout updated!");
      } else {
        const { data, error } = await supabase.from("planner_layouts").insert(layoutData).select().single();
        if (error) throw error;
        setCurrentLayoutId(data.id);
        toast.success("Layout saved!");
      }
    } catch (err: any) { toast.error(err.message || "Failed to save"); }
    finally { setSaving(false); }
  }, [layoutName, roomSize, objects, measurements, cables, currentLayoutId, customEquipments, building]);

  const shareLayout = useCallback(async () => {
    if (!currentLayoutId) { toast.error("Please save the layout first"); return; }
    setSharing(true);
    try {
      const token = `share-${currentLayoutId.slice(0, 8)}-${Date.now().toString(36)}`;
      const { error } = await supabase.from("planner_layouts").update({ is_shared: true, share_token: token } as any).eq("id", currentLayoutId);
      if (error) throw error;
      const url = `${window.location.origin}/shared-layout?token=${token}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied to clipboard!");
    } catch (err: any) { toast.error(err.message || "Failed to share"); }
    finally { setSharing(false); }
  }, [currentLayoutId]);

  const fetchLayouts = useCallback(async () => {
    setLoadingLayouts(true);
    try {
      const { data, error } = await supabase.from("planner_layouts").select("id, name, created_at, updated_at").order("updated_at", { ascending: false });
      if (error) throw error;
      setSavedLayouts(data || []);
    } catch { toast.error("Failed to load layouts"); }
    finally { setLoadingLayouts(false); }
  }, []);

  const loadLayout = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase.from("planner_layouts").select("*").eq("id", id).single();
      if (error) throw error;
      setLayoutName(data.name);
      setRoomSize({ w: Number(data.room_width), d: Number(data.room_depth), h: Number(data.room_height) });
      const objData = data.objects as any;
      if (objData && objData.items) {
        setObjects(objData.items as PlacedObject[]);
        setCables(objData.cables || []);
        if (objData.customEquipments) setCustomEquipments(objData.customEquipments);
        if (objData.building) setBuilding(objData.building);
      } else {
        setObjects(objData as unknown as PlacedObject[]);
        setCables([]);
      }
      const meas = (data.measurements as any[]).map((m: any) => ({
        start: new THREE.Vector3(m.start.x, m.start.y, m.start.z),
        end: new THREE.Vector3(m.end.x, m.end.y, m.end.z),
      }));
      setMeasurements(meas);
      setCurrentLayoutId(data.id);
      setSelectedId(null);
      setLoadDialogOpen(false);
      toast.success(`Loaded: ${data.name}`);
    } catch { toast.error("Failed to load layout"); }
  }, []);

  const deleteLayout = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from("planner_layouts").delete().eq("id", id);
      if (error) throw error;
      setSavedLayouts(prev => prev.filter(l => l.id !== id));
      if (currentLayoutId === id) setCurrentLayoutId(null);
      toast.success("Layout deleted");
    } catch { toast.error("Failed to delete"); }
  }, [currentLayoutId]);

  const exportPDF = useCallback(async () => {
    setExporting(true);
    try {
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pw = 297; const ph = 210; const margin = 15;
      const drawW = pw - margin * 2;
      const drawH = ph - margin * 2 - 50;

      pdf.setFillColor(15, 11, 26); pdf.rect(0, 0, pw, 30, "F");
      pdf.setFillColor(124, 58, 237); pdf.rect(0, 28, pw, 2, "F");
      pdf.setTextColor(167, 139, 250); pdf.setFontSize(16); pdf.setFont("helvetica", "bold");
      pdf.text("3D Room Planner — Floor Plan", margin, 18);
      pdf.setTextColor(180, 180, 200); pdf.setFontSize(8);
      const subtitle = activeZoneId 
        ? `Zone: ${building.zones.find(z => z.id === activeZoneId)?.name || "Unknown"} | Room: ${roomSize.w}m × ${roomSize.d}m × ${roomSize.h}m`
        : `Room: ${roomSize.w}m × ${roomSize.d}m × ${roomSize.h}m`;
      pdf.text(`${subtitle}  |  Objects: ${visibleObjects.length}  |  Generated: ${new Date().toLocaleString()}`, margin, 25);

      const fpX = margin; const fpY = 38;
      const scaleX = drawW / roomSize.w; const scaleY = drawH / roomSize.d;
      const scale = Math.min(scaleX, scaleY);
      const floorW = roomSize.w * scale; const floorH = roomSize.d * scale;
      const offsetX = fpX + (drawW - floorW) / 2; const offsetY = fpY + (drawH - floorH) / 2;

      pdf.setFillColor(20, 16, 36); pdf.rect(offsetX, offsetY, floorW, floorH, "F");
      pdf.setDrawColor(45, 38, 64); pdf.setLineWidth(0.15);
      for (let x = 0; x <= roomSize.w; x++) { pdf.line(offsetX + x * scale, offsetY, offsetX + x * scale, offsetY + floorH); }
      for (let z = 0; z <= roomSize.d; z++) { pdf.line(offsetX, offsetY + z * scale, offsetX + floorW, offsetY + z * scale); }
      pdf.setDrawColor(124, 58, 237); pdf.setLineWidth(0.8); pdf.rect(offsetX, offsetY, floorW, floorH, "S");
      pdf.setTextColor(124, 58, 237); pdf.setFontSize(9); pdf.setFont("helvetica", "bold");
      pdf.text(`${roomSize.w}m`, offsetX + floorW / 2, offsetY + floorH + 6, { align: "center" });
      pdf.text(`${roomSize.d}m`, offsetX - 5, offsetY + floorH / 2, { angle: 90, align: "center" });

      const toFloorX = (x: number) => offsetX + (x + roomSize.w / 2) * scale;
      const toFloorY = (z: number) => offsetY + (z + roomSize.d / 2) * scale;

      visibleObjects.forEach((obj, idx) => {
        const catalog = allCatalog.find(c => c.type === obj.type);
        const size = obj.customSize || catalog?.size || [1, 1, 1];
        const sx = size[0] * scale; const sz = size[2] * scale;
        const cx = toFloorX(obj.position[0]); const cy = toFloorY(obj.position[2]);
        const hex = obj.color.replace("#", "");
        pdf.setFillColor(parseInt(hex.substring(0, 2), 16), parseInt(hex.substring(2, 4), 16), parseInt(hex.substring(4, 6), 16));
        pdf.setDrawColor(255, 255, 255); pdf.setLineWidth(0.3);
        pdf.rect(cx - sx / 2, cy - sz / 2, sx, sz, "FD");
        pdf.setTextColor(255, 255, 255); pdf.setFontSize(7); pdf.setFont("helvetica", "bold");
        pdf.text(`${idx + 1}`, cx, cy + 2, { align: "center" });
      });

      measurements.forEach((m) => {
        const x1 = toFloorX(m.start.x); const y1 = toFloorY(m.start.z);
        const x2 = toFloorX(m.end.x); const y2 = toFloorY(m.end.z);
        pdf.setDrawColor(251, 191, 36); pdf.setLineWidth(0.5); pdf.setLineDashPattern([2, 1], 0);
        pdf.line(x1, y1, x2, y2); pdf.setLineDashPattern([], 0);
        const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2;
        pdf.setFillColor(251, 191, 36); pdf.roundedRect(mx - 8, my - 3, 16, 6, 1, 1, "F");
        pdf.setTextColor(0, 0, 0); pdf.setFontSize(6); pdf.text(`${m.start.distanceTo(m.end).toFixed(2)}m`, mx, my + 1.5, { align: "center" });
      });

      cables.forEach((cable) => {
        const fromObj = visibleObjects.find(o => o.id === cable.fromId);
        const toObj = visibleObjects.find(o => o.id === cable.toId);
        if (!fromObj || !toObj) return;
        const x1 = toFloorX(fromObj.position[0]); const y1 = toFloorY(fromObj.position[2]);
        const x2 = toFloorX(toObj.position[0]); const y2 = toFloorY(toObj.position[2]);
        const hex = cable.color.replace("#", "");
        pdf.setDrawColor(parseInt(hex.substring(0, 2), 16), parseInt(hex.substring(2, 4), 16), parseInt(hex.substring(4, 6), 16));
        pdf.setLineWidth(0.6); pdf.setLineDashPattern([1.5, 0.8], 0);
        pdf.line(x1, y1, x2, y2); pdf.setLineDashPattern([], 0);
        const cmx = (x1 + x2) / 2; const cmy = (y1 + y2) / 2;
        pdf.setFillColor(parseInt(hex.substring(0, 2), 16), parseInt(hex.substring(2, 4), 16), parseInt(hex.substring(4, 6), 16));
        pdf.roundedRect(cmx - 10, cmy - 2.5, 20, 5, 1, 1, "F");
        pdf.setTextColor(255, 255, 255); pdf.setFontSize(5); pdf.setFont("helvetica", "bold");
        pdf.text(cable.label, cmx, cmy + 1, { align: "center" });
      });

      const legendY = ph - 35;
      pdf.setDrawColor(45, 38, 64); pdf.setLineWidth(0.3); pdf.line(margin, legendY - 2, pw - margin, legendY - 2);
      pdf.setTextColor(167, 139, 250); pdf.setFontSize(9); pdf.setFont("helvetica", "bold"); pdf.text("Equipment Legend", margin, legendY + 4);
      let lx = margin; let ly = legendY + 10;
      visibleObjects.forEach((obj, idx) => {
        const hex = obj.color.replace("#", "");
        pdf.setFillColor(parseInt(hex.substring(0, 2), 16), parseInt(hex.substring(2, 4), 16), parseInt(hex.substring(4, 6), 16));
        pdf.rect(lx, ly - 3, 4, 4, "F");
        pdf.setTextColor(200, 200, 220); pdf.setFontSize(7); pdf.setFont("helvetica", "normal");
        pdf.text(`${idx + 1}. ${obj.label} (X:${obj.position[0].toFixed(1)}, Z:${obj.position[2].toFixed(1)})`, lx + 6, ly);
        lx += 65;
        if (lx > pw - margin - 60) { lx = margin; ly += 7; }
      });

      pdf.setTextColor(100, 100, 120); pdf.setFontSize(6);
      pdf.text("Generated by 3D Room Planner • AkitSolution", pw / 2, ph - 5, { align: "center" });
      pdf.save("floor-plan.pdf");
    } catch (err) { console.error("PDF export failed:", err); }
    finally { setExporting(false); }
  }, [visibleObjects, roomSize, measurements, cables, allCatalog, activeZoneId, building]);

  const selectedObj = objects.find(o => o.id === selectedId);
  const activeFloor = building.floors.find(f => f.id === activeFloorId);
  const activeZone = building.zones.find(z => z.id === activeZoneId);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              3D IT Infrastructure Planner
            </h1>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {viewMode === "building" && (
                <>
                  <Building2 className="h-3 w-3" />
                  <span>{building.name}</span>
                  <ChevronRight className="h-3 w-3" />
                  <span>{activeFloor?.name}</span>
                </>
              )}
              {viewMode === "room" && activeZone && (
                <>
                  <Building2 className="h-3 w-3" />
                  <span>{building.name}</span>
                  <ChevronRight className="h-3 w-3" />
                  <span>{activeFloor?.name}</span>
                  <ChevronRight className="h-3 w-3" />
                  <DoorOpen className="h-3 w-3" />
                  <span>{activeZone.name}</span>
                </>
              )}
              {viewMode === "room" && !activeZone && (
                <span>{currentLayoutId ? layoutName : "Single Room Mode"}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input value={layoutName} onChange={(e) => setLayoutName(e.target.value)} className="h-7 w-36 text-xs bg-background/50" placeholder="Layout name" />
          <Button size="sm" variant="outline" onClick={saveLayout} disabled={saving} className="text-xs gap-1.5">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
          </Button>
          <Dialog open={loadDialogOpen} onOpenChange={(open) => { setLoadDialogOpen(open); if (open) fetchLayouts(); }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-xs gap-1.5"><FolderOpen className="h-3 w-3" /> Load</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Saved Layouts</DialogTitle></DialogHeader>
              {loadingLayouts ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : savedLayouts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No saved layouts yet</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {savedLayouts.map(layout => (
                    <div key={layout.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                      <button onClick={() => loadLayout(layout.id)} className="flex-1 text-left">
                        <p className="text-sm font-medium text-foreground">{layout.name}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(layout.updated_at).toLocaleDateString()}</p>
                      </button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteLayout(layout.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>
          <Badge variant="outline" className="text-xs">{roomSize.w}×{roomSize.d}×{roomSize.h}m</Badge>
          <Button size="sm" variant="outline" onClick={exportPDF} disabled={exporting} className="text-xs gap-1.5">
            {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileDown className="h-3 w-3" />} PDF
          </Button>
          <Button size="sm" variant="outline" onClick={shareLayout} disabled={sharing || !currentLayoutId} className="text-xs gap-1.5">
            {sharing ? <Loader2 className="h-3 w-3 animate-spin" /> : shareUrl ? <Check className="h-3 w-3 text-green-500" /> : <Share2 className="h-3 w-3" />}
            {shareUrl ? "Copied!" : "Share"}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="w-72 border-r border-border/50 bg-card/30 overflow-y-auto">
          <Tabs value={leftTab} onValueChange={setLeftTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3 rounded-none border-b border-border/30 bg-transparent h-9">
              <TabsTrigger value="equipment" className="text-[10px] data-[state=active]:bg-primary/10">Equipment</TabsTrigger>
              <TabsTrigger value="building" className="text-[10px] data-[state=active]:bg-primary/10">Building</TabsTrigger>
              <TabsTrigger value="tools" className="text-[10px] data-[state=active]:bg-primary/10">Tools</TabsTrigger>
            </TabsList>

            {/* ===== EQUIPMENT TAB ===== */}
            <TabsContent value="equipment" className="p-3 space-y-3 mt-0">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-foreground">Standard Equipment</h3>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {OBJECT_CATALOG.map(item => {
                    const IconComp = getIconComponent(item.icon);
                    return (
                      <button key={item.type} onClick={() => addObject(item.type)}
                        className="flex flex-col items-center gap-0.5 p-2 rounded-lg border border-border/50 bg-background/50 hover:bg-primary/10 hover:border-primary/50 transition-all text-center group">
                        <IconComp className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-[9px] text-muted-foreground group-hover:text-foreground leading-tight">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator className="bg-border/30" />

              {/* Custom Equipment */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-foreground">Custom Equipment</h3>
                  <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-6 w-6">
                        <PlusCircle className="h-3.5 w-3.5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader><DialogTitle>Create Custom Equipment</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs">Name</Label>
                          <Input value={newCustom.label} onChange={e => setNewCustom(p => ({ ...p, label: e.target.value }))}
                            placeholder="e.g. Fingerprint Scanner" className="h-8 text-sm mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">Icon</Label>
                          <div className="grid grid-cols-6 gap-1 mt-1">
                            {ICON_OPTIONS.map(opt => (
                              <button key={opt.key} onClick={() => setNewCustom(p => ({ ...p, icon: opt.key }))}
                                className={`p-2 rounded border transition-all ${newCustom.icon === opt.key ? "border-primary bg-primary/10" : "border-border/50 hover:bg-muted/30"}`}>
                                <opt.Icon className="h-4 w-4 mx-auto" />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Color</Label>
                          <div className="flex gap-2 mt-1 items-center">
                            <input type="color" value={newCustom.color} onChange={e => setNewCustom(p => ({ ...p, color: e.target.value }))}
                              className="w-8 h-8 rounded border border-border/50 cursor-pointer" />
                            <Input value={newCustom.color} onChange={e => setNewCustom(p => ({ ...p, color: e.target.value }))}
                              className="h-8 text-xs font-mono flex-1" />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Size (meters)</Label>
                          <div className="grid grid-cols-3 gap-2 mt-1">
                            {(["Width", "Height", "Depth"] as const).map((dim, i) => (
                              <div key={dim}>
                                <span className="text-[10px] text-muted-foreground">{dim}</span>
                                <Input type="number" step="0.05" min="0.05" max="5"
                                  value={newCustom.size[i]}
                                  onChange={e => {
                                    const s = [...newCustom.size] as [number, number, number];
                                    s[i] = Math.max(0.05, parseFloat(e.target.value) || 0.05);
                                    setNewCustom(p => ({ ...p, size: s }));
                                  }}
                                  className="h-7 text-xs" />
                              </div>
                            ))}
                          </div>
                        </div>
                        <Button onClick={addCustomEquipment} className="w-full text-xs">
                          <PlusCircle className="h-3 w-3 mr-1" /> Create Equipment
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                {customEquipments.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-2">No custom equipment yet. Click + to create.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    {customEquipments.map(ce => {
                      const IconComp = getIconComponent(ce.icon);
                      return (
                        <button key={ce.type} onClick={() => addObject(ce.type)}
                          className="flex flex-col items-center gap-0.5 p-2 rounded-lg border border-border/50 bg-background/50 hover:bg-primary/10 hover:border-primary/50 transition-all text-center group relative">
                          <div className="w-2 h-2 rounded-full absolute top-1 right-1" style={{ background: ce.color }} />
                          <IconComp className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          <span className="text-[9px] text-muted-foreground group-hover:text-foreground leading-tight">{ce.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ===== BUILDING TAB ===== */}
            <TabsContent value="building" className="p-3 space-y-3 mt-0">
              {/* Building name */}
              <div>
                <Label className="text-xs">Building Name</Label>
                <Input value={building.name} onChange={e => setBuilding(p => ({ ...p, name: e.target.value }))}
                  className="h-7 text-xs mt-1" />
              </div>

              <Separator className="bg-border/30" />

              {/* View mode toggle */}
              <div className="flex gap-1">
                <Button size="sm" variant={viewMode === "building" ? "default" : "outline"} className="flex-1 text-[10px] h-7"
                  onClick={() => { setViewMode("building"); setActiveZoneId(null); }}>
                  <Building2 className="h-3 w-3 mr-1" /> 3D View
                </Button>
                <Button size="sm" variant={viewMode === "floormap" ? "default" : "outline"} className="flex-1 text-[10px] h-7"
                  onClick={() => { setViewMode("floormap"); setActiveZoneId(null); }}>
                  <Map className="h-3 w-3 mr-1" /> 2D Map
                </Button>
                <Button size="sm" variant={viewMode === "room" ? "default" : "outline"} className="flex-1 text-[10px] h-7"
                  onClick={() => setViewMode("room")}>
                  <DoorOpen className="h-3 w-3 mr-1" /> Room
                </Button>
              </div>

              {activeZoneId && viewMode === "room" && (
                <Button size="sm" variant="outline" className="w-full text-[10px] h-7" onClick={exitToBuilding}>
                  <ArrowLeft className="h-3 w-3 mr-1" /> Back to Building View
                </Button>
              )}

              <Separator className="bg-border/30" />

              {/* Floors */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-foreground">Floors</h3>
                  <Dialog open={floorDialogOpen} onOpenChange={setFloorDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-6 w-6"><Plus className="h-3 w-3" /></Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-xs">
                      <DialogHeader><DialogTitle>Add Floor</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs">Floor Name</Label>
                          <Input value={newFloorName} onChange={e => setNewFloorName(e.target.value)}
                            placeholder="e.g. 1st Floor" className="h-8 text-sm mt-1" />
                        </div>
                        <Button onClick={addFloor} className="w-full text-xs"><Plus className="h-3 w-3 mr-1" /> Add Floor</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="space-y-1">
                  {building.floors.sort((a, b) => b.level - a.level).map(floor => (
                    <button key={floor.id} onClick={() => setActiveFloorId(floor.id)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center gap-2 ${
                        activeFloorId === floor.id ? "bg-primary/20 text-primary border border-primary/30" : "hover:bg-muted/50 text-muted-foreground"
                      }`}>
                      <Layers className="h-3 w-3" />
                      <span className="flex-1">{floor.name}</span>
                      <Badge variant="outline" className="text-[8px] h-4">L{floor.level}</Badge>
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="bg-border/30" />

              {/* Zones on current floor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-foreground">Zones ({activeFloor?.name})</h3>
                  <Dialog open={zoneDialogOpen} onOpenChange={setZoneDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-6 w-6"><Plus className="h-3 w-3" /></Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader><DialogTitle>Add Zone / Room</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs">Zone Name</Label>
                          <Input value={newZone.name || ""} onChange={e => setNewZone(p => ({ ...p, name: e.target.value }))}
                            placeholder="e.g. Server Room A" className="h-8 text-sm mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">Type</Label>
                          <Select value={newZone.type} onValueChange={v => setNewZone(p => ({ ...p, type: v as Zone["type"] }))}>
                            <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(ZONE_TYPE_LABELS).map(([k, v]) => (
                                <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div><Label className="text-[10px]">Width(m)</Label>
                            <Input type="number" value={newZone.width} onChange={e => setNewZone(p => ({ ...p, width: parseFloat(e.target.value) || 5 }))} className="h-7 text-xs mt-0.5" /></div>
                          <div><Label className="text-[10px]">Depth(m)</Label>
                            <Input type="number" value={newZone.depth} onChange={e => setNewZone(p => ({ ...p, depth: parseFloat(e.target.value) || 5 }))} className="h-7 text-xs mt-0.5" /></div>
                          <div><Label className="text-[10px]">Height(m)</Label>
                            <Input type="number" value={newZone.height} onChange={e => setNewZone(p => ({ ...p, height: parseFloat(e.target.value) || 3 }))} className="h-7 text-xs mt-0.5" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><Label className="text-[10px]">Offset X</Label>
                            <Input type="number" value={newZone.offsetX} onChange={e => setNewZone(p => ({ ...p, offsetX: parseFloat(e.target.value) || 0 }))} className="h-7 text-xs mt-0.5" /></div>
                          <div><Label className="text-[10px]">Offset Z</Label>
                            <Input type="number" value={newZone.offsetZ} onChange={e => setNewZone(p => ({ ...p, offsetZ: parseFloat(e.target.value) || 0 }))} className="h-7 text-xs mt-0.5" /></div>
                        </div>
                        <Button onClick={addZone} className="w-full text-xs"><Plus className="h-3 w-3 mr-1" /> Add Zone</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                {currentFloorZones.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-2">No zones yet on this floor</p>
                ) : (
                  <div className="space-y-1">
                    {currentFloorZones.map(zone => (
                      <div key={zone.id} className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                        activeZoneId === zone.id ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "hover:bg-muted/50 text-muted-foreground"
                      }`}>
                        <DoorOpen className="h-3 w-3 flex-shrink-0" />
                        <button onClick={() => { setActiveZoneId(zone.id); if (viewMode === "building") enterZone(zone.id); }}
                          className="flex-1 text-left truncate">{zone.name}</button>
                        <Badge variant="outline" className="text-[8px] h-4">{ZONE_TYPE_LABELS[zone.type]?.split(" ")[0]}</Badge>
                        <Button size="icon" variant="ghost" className="h-5 w-5 flex-shrink-0"
                          onClick={(e) => { e.stopPropagation(); enterZone(zone.id); }}>
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-5 w-5 flex-shrink-0 text-destructive"
                          onClick={(e) => { e.stopPropagation(); setBuilding(p => ({ ...p, zones: p.zones.filter(z => z.id !== zone.id) })); }}>
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Room size (when in room view) */}
              {viewMode === "room" && (
                <>
                  <Separator className="bg-border/30" />
                  <div>
                    <h3 className="text-xs font-semibold text-foreground mb-2">Room Size</h3>
                    <div className="space-y-1">
                      {([{ label: "Width", key: "w" as const }, { label: "Depth", key: "d" as const }, { label: "Height", key: "h" as const }]).map(({ label, key }) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">{label}</span>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setRoomSize(s => ({ ...s, [key]: Math.max(2, s[key] - 1) }))}>
                              <Minus className="h-2.5 w-2.5" />
                            </Button>
                            <span className="text-[10px] font-mono w-7 text-center">{roomSize[key]}m</span>
                            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setRoomSize(s => ({ ...s, [key]: Math.min(30, s[key] + 1) }))}>
                              <Plus className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* ===== TOOLS TAB ===== */}
            <TabsContent value="tools" className="p-3 space-y-3 mt-0">
              <div>
                <h3 className="text-xs font-semibold text-foreground mb-2">Measure</h3>
                <div className="space-y-1">
                  <Button variant={measureMode ? "default" : "outline"} size="sm" className="w-full justify-start text-xs" onClick={handleMeasure}>
                    <Ruler className="h-3 w-3 mr-2" />
                    {measureMode ? (measureStart ? "Select 2nd object" : "Select 1st object") : "Measure Distance"}
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => setMeasurements([])}>
                    <RotateCcw className="h-3 w-3 mr-2" /> Clear Measurements
                  </Button>
                </div>
              </div>

              <Separator className="bg-border/30" />

              <div>
                <h3 className="text-xs font-semibold text-foreground mb-2">Cable Routing</h3>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-1">
                    {CABLE_TYPES.map(ct => (
                      <button key={ct.type} onClick={() => setSelectedCableType(ct.type)}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded text-[10px] border transition-all ${
                          selectedCableType === ct.type ? "border-primary/60 bg-primary/10 text-foreground" : "border-border/40 text-muted-foreground hover:bg-muted/30"
                        }`}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ct.color }} />
                        {ct.label.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                  <Button variant={cableMode ? "default" : "outline"} size="sm" className="w-full justify-start text-xs"
                    onClick={() => { setCableMode(!cableMode); setCableStart(null); setMeasureMode(false); }}>
                    <Cable className="h-3 w-3 mr-2" />
                    {cableMode ? (cableStart ? "Select destination" : "Select source") : "Add Cable"}
                  </Button>
                  {cables.length > 0 && (
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => setCables([])}>
                      <Unplug className="h-3 w-3 mr-2" /> Clear All Cables
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* 3D Viewport or 2D Floor Map */}
        <div className="flex-1 relative">
          {viewMode === "floormap" ? (
            <FloorMap2D
              zones={currentFloorZones}
              objects={objects}
              allCatalog={allCatalog}
              floorName={activeFloor?.name || "Floor"}
              onZoneClick={(id) => enterZone(id)}
            />
          ) : (
            <>
              <Canvas shadows className="bg-[#080510]">
                <Suspense fallback={null}>
                  <Scene
                    objects={visibleObjects}
                    selectedId={selectedId}
                    onSelect={(id) => {
                      setSelectedId(id);
                      if (cableMode && !cableStart) {
                        setCableStart(id);
                      } else if (cableMode && cableStart && cableStart !== id) {
                        const cType = CABLE_TYPES.find(c => c.type === selectedCableType) || CABLE_TYPES[0];
                        setCables(prev => [...prev, {
                          id: `cable-${Date.now()}`, fromId: cableStart, toId: id,
                          cableType: selectedCableType, color: cType.color, label: cType.label,
                        }]);
                        setCableMode(false); setCableStart(null);
                      } else if (measureMode && !measureStart) {
                        setMeasureStart(id);
                      } else if (measureMode && measureStart && measureStart !== id) {
                        const startObj = objects.find(o => o.id === measureStart);
                        const endObj = objects.find(o => o.id === id);
                        if (startObj && endObj) {
                          setMeasurements(prev => [...prev, { start: new THREE.Vector3(...startObj.position), end: new THREE.Vector3(...endObj.position) }]);
                        }
                        setMeasureMode(false); setMeasureStart(null);
                      }
                    }}
                    onMove={(id, pos) => setObjects(prev => prev.map(o => o.id === id ? { ...o, position: pos } : o))}
                    roomSize={roomSize}
                    measurements={measurements}
                    cables={cables}
                    allCatalog={allCatalog}
                    zones={currentFloorZones}
                    activeZoneId={activeZoneId}
                    onZoneClick={(id) => enterZone(id)}
                    viewMode={viewMode}
                  />
                </Suspense>
              </Canvas>

              <div className="absolute bottom-4 left-4 text-[10px] text-muted-foreground/60">
                {viewMode === "building" ? "Click a zone to enter • Scroll to zoom • Right-drag to orbit" : "Drag objects to move • Scroll to zoom • Right-drag to orbit"}
              </div>
            </>
          )}
        </div>

        {/* Right Panel - Properties */}
        <div className="w-64 border-l border-border/50 bg-card/30 p-4 space-y-4 overflow-y-auto">
          {selectedObj ? (
            <>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">{selectedObj.label}</h3>
                <Badge variant="secondary" className="text-[10px]">{selectedObj.type}</Badge>
              </div>
              <Separator className="bg-border/30" />
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Position</h4>
                {(["x", "y", "z"] as const).map(axis => (
                  <div key={axis} className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground uppercase">{axis}</span>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveSelected(axis, -0.5)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-xs font-mono w-12 text-center">
                        {selectedObj.position[axis === "x" ? 0 : axis === "y" ? 1 : 2].toFixed(1)}
                      </span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveSelected(axis, 0.5)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Actions</h4>
                <div className="space-y-1">
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={rotateSelected}>
                    <RotateCcw className="h-3 w-3 mr-2" />Rotate 45°
                  </Button>
                  <Button variant="destructive" size="sm" className="w-full justify-start text-xs" onClick={deleteSelected}>
                    <Trash2 className="h-3 w-3 mr-2" />Delete
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-muted-foreground text-xs pt-8">
              <Eye className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Select an object to see its properties</p>
              <p className="mt-2 text-[10px]">Add equipment from the left panel</p>
            </div>
          )}

          <Separator className="bg-border/30" />

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Placed Objects ({visibleObjects.length})
            </h3>
            {visibleObjects.length === 0 ? (
              <p className="text-xs text-muted-foreground">No objects placed yet</p>
            ) : (
              <div className="space-y-1">
                {visibleObjects.map(obj => (
                  <button key={obj.id} onClick={() => setSelectedId(obj.id)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                      selectedId === obj.id ? "bg-primary/20 text-primary border border-primary/30" : "hover:bg-muted/50 text-muted-foreground"
                    }`}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: obj.color }} />
                      {obj.label}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {cables.length > 0 && (
            <>
              <Separator className="bg-border/30" />
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Cables ({cables.length})</h3>
                <div className="space-y-1">
                  {cables.map(cable => {
                    const fromObj = objects.find(o => o.id === cable.fromId);
                    const toObj = objects.find(o => o.id === cable.toId);
                    return (
                      <div key={cable.id} className="flex items-center gap-1 px-2 py-1.5 rounded text-[10px] bg-muted/20 border border-border/30">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cable.color }} />
                        <span className="flex-1 truncate text-muted-foreground">{fromObj?.label || "?"} → {toObj?.label || "?"}</span>
                        <Button size="icon" variant="ghost" className="h-5 w-5 flex-shrink-0"
                          onClick={() => setCables(prev => prev.filter(c => c.id !== cable.id))}>
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
