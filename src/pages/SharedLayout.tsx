import { useState, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Text, Html, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PlacedObject {
  id: string;
  type: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  label: string;
}

interface CableConnection {
  id: string;
  fromId: string;
  toId: string;
  cableType: string;
  color: string;
  label: string;
}

function RoomBox({ roomSize }: { roomSize: { w: number; d: number; h: number } }) {
  return (
    <group>
      <mesh position={[0, roomSize.h / 2, 0]}>
        <boxGeometry args={[roomSize.w, roomSize.h, roomSize.d]} />
        <meshStandardMaterial color="#1e1b4b" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(roomSize.w, roomSize.h, roomSize.d)]} />
        <lineBasicMaterial color="#6366f1" transparent opacity={0.4} />
      </lineSegments>
      <group position={[0, roomSize.h / 2, 0]}>
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(roomSize.w, roomSize.h, roomSize.d)]} />
          <lineBasicMaterial color="#6366f1" transparent opacity={0.4} />
        </lineSegments>
      </group>
    </group>
  );
}

function EquipmentBox({ obj }: { obj: PlacedObject }) {
  const SIZES: Record<string, [number, number, number]> = {
    "3d-printer": [1.2, 1.0, 1.0],
    camera: [0.3, 0.3, 0.5],
    "server-rack": [0.6, 2.0, 0.8],
    workstation: [1.5, 0.75, 0.7],
    table: [2.0, 0.75, 1.0],
    light: [0.4, 0.1, 0.4],
  };
  const size = SIZES[obj.type] || [1, 1, 1];

  return (
    <group position={obj.position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={obj.color} transparent opacity={0.85} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...size)]} />
        <lineBasicMaterial color="#fff" transparent opacity={0.3} />
      </lineSegments>
      <Html position={[0, size[1] / 2 + 0.3, 0]} center distanceFactor={8}>
        <div className="rounded-full px-2 py-0.5 text-[9px] font-bold whitespace-nowrap bg-background/80 border border-border/50 text-foreground shadow-sm">
          {obj.label}
        </div>
      </Html>
    </group>
  );
}

function CableRouteLine({ fromPos, toPos, color, label }: {
  fromPos: [number, number, number]; toPos: [number, number, number]; color: string; label: string;
}) {
  const start = new THREE.Vector3(...fromPos);
  const end = new THREE.Vector3(...toPos);
  start.y = 0.05; end.y = 0.05;
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const curve = new THREE.QuadraticBezierCurve3(start, new THREE.Vector3(mid.x, 0.05, mid.z), end);
  const points = curve.getPoints(20);
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineDashedMaterial({ color, dashSize: 0.15, gapSize: 0.08 });
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  const dist = start.distanceTo(end);

  return (
    <group>
      <primitive object={line} />
      <Html position={[mid.x, 0.25, mid.z]} center distanceFactor={8}>
        <div className="rounded px-1.5 py-0.5 text-[9px] font-semibold whitespace-nowrap border"
          style={{ background: `${color}dd`, color: "#fff", borderColor: color }}>
          {label} ({dist.toFixed(1)}m)
        </div>
      </Html>
    </group>
  );
}

function MeasurementLine({ start, end }: { start: THREE.Vector3; end: THREE.Vector3 }) {
  const distance = start.distanceTo(end);
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const points = [start, end];
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineDashedMaterial({ color: "#f59e0b", dashSize: 0.2, gapSize: 0.1 });
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();

  return (
    <group>
      <primitive object={line} />
      <Html position={[mid.x, mid.y + 0.3, mid.z]} center distanceFactor={8}>
        <div className="bg-amber-500/90 text-white rounded px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap">
          {distance.toFixed(2)}m
        </div>
      </Html>
    </group>
  );
}

export default function SharedLayout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [layoutName, setLayoutName] = useState("");
  const [objects, setObjects] = useState<PlacedObject[]>([]);
  const [cables, setCables] = useState<CableConnection[]>([]);
  const [measurements, setMeasurements] = useState<{ start: THREE.Vector3; end: THREE.Vector3 }[]>([]);
  const [roomSize, setRoomSize] = useState({ w: 10, d: 8, h: 3 });

  useEffect(() => {
    if (!token) { setError("No share token provided"); setLoading(false); return; }

    const fetchLayout = async () => {
      const { data, error: err } = await supabase
        .from("planner_layouts")
        .select("*")
        .eq("share_token", token)
        .eq("is_shared", true)
        .single();

      if (err || !data) {
        setError("Layout not found or not shared");
        setLoading(false);
        return;
      }

      setLayoutName(data.name);
      setRoomSize({ w: Number(data.room_width), d: Number(data.room_depth), h: Number(data.room_height) });

      const objData = data.objects as any;
      if (objData && objData.items) {
        setObjects(objData.items as PlacedObject[]);
        setCables(objData.cables || []);
      } else {
        setObjects(objData as unknown as PlacedObject[]);
      }

      const meas = (data.measurements as any[] || []).map((m: any) => ({
        start: new THREE.Vector3(m.start.x, m.start.y, m.start.z),
        end: new THREE.Vector3(m.end.x, m.end.y, m.end.z),
      }));
      setMeasurements(meas);
      setLoading(false);
    };

    fetchLayout();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => navigate("/")} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Home
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-3">
          <Eye className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              {layoutName}
            </h1>
            <p className="text-xs text-muted-foreground">Shared Layout — View Only</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {roomSize.w}×{roomSize.d}×{roomSize.h}m
        </Badge>
      </div>

      <div className="flex-1">
        <Canvas shadows>
          <Suspense fallback={null}>
            <PerspectiveCamera makeDefault position={[roomSize.w, roomSize.h * 2, roomSize.d]} fov={50} />
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 15, 10]} intensity={0.8} castShadow />
            <Grid infiniteGrid fadeDistance={30} fadeStrength={5} cellColor="#333" sectionColor="#555" />
            <RoomBox roomSize={roomSize} />
            {objects.map(obj => <EquipmentBox key={obj.id} obj={obj} />)}
            {measurements.map((m, i) => <MeasurementLine key={i} start={m.start} end={m.end} />)}
            {cables.map(cable => {
              const from = objects.find(o => o.id === cable.fromId);
              const to = objects.find(o => o.id === cable.toId);
              if (!from || !to) return null;
              return <CableRouteLine key={cable.id} fromPos={from.position} toPos={to.position} color={cable.color} label={cable.label} />;
            })}
            <OrbitControls enableDamping dampingFactor={0.1} />
          </Suspense>
        </Canvas>
      </div>

      <div className="px-4 py-2 border-t border-border/50 bg-card/30 text-center">
        <p className="text-[10px] text-muted-foreground">
          Equipment: {objects.length} • Cables: {cables.length} • Measurements: {measurements.length} — Scroll to zoom • Right-drag to orbit
        </p>
      </div>
    </div>
  );
}
