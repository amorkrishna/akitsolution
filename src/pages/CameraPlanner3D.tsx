import { useRef, useCallback, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Loader } from "@react-three/drei";
import { RoomScene } from "@/components/camera-planner/RoomScene";
import { PlannerControls } from "@/components/camera-planner/PlannerControls";
import { Blueprint2D, type Blueprint2DHandle } from "@/components/camera-planner/Blueprint2D";
import { useCameraPlannerStore, type ViewMode } from "@/stores/cameraPlannerStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Camera, MousePointer2, Info, Box, MapIcon, Columns2,
  Download, FileImage,
} from "lucide-react";
import { DesignFramework } from "@/components/camera-planner/DesignFramework";

// ─── Stats Bar ───────────────────────────────────────────────────────────────
function StatsBar() {
  const { cameras, room, sceneName, viewMode, setViewMode } = useCameraPlannerStore();
  const area = room.width * room.length;
  const totalCoverage = cameras.reduce((acc, cam) => {
    const fovRad = (cam.fovH * Math.PI) / 180;
    return acc + 0.5 * cam.range * cam.range * fovRad;
  }, 0);
  const coveragePct = Math.min(100, Math.round((totalCoverage / area) * 100));

  const viewOptions: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
    { mode: "3d",    icon: <Box className="h-3.5 w-3.5" />,     label: "3D" },
    { mode: "2d",    icon: <MapIcon className="h-3.5 w-3.5" />, label: "2D Blueprint" },
    { mode: "split", icon: <Columns2 className="h-3.5 w-3.5" />,label: "Split" },
  ];

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-border/60 bg-card/80 backdrop-blur-sm text-xs flex-shrink-0 flex-wrap gap-y-1">
      {/* Scene name */}
      <span className="font-semibold text-primary truncate max-w-[180px]">{sceneName}</span>
      <div className="h-3 w-px bg-border" />

      {/* Camera count */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Camera className="h-3.5 w-3.5" />
        <span>{cameras.length} camera{cameras.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="h-3 w-px bg-border" />

      {/* Room size */}
      <span className="text-muted-foreground">{room.width}m × {room.length}m × {room.height}m</span>
      <div className="h-3 w-px bg-border" />

      {/* Coverage */}
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Coverage:</span>
        <Badge
          variant="outline"
          className={
            coveragePct >= 80
              ? "bg-green-500/10 text-green-400 border-green-500/30 text-[9px]"
              : coveragePct >= 50
              ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30 text-[9px]"
              : "bg-red-500/10 text-red-400 border-red-500/30 text-[9px]"
          }
        >
          {cameras.length === 0 ? "0%" : `~${coveragePct}%`}
        </Badge>
      </div>

      {/* View mode toggle */}
      <div className="ml-auto flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
        {viewOptions.map(({ mode, icon, label }) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
              viewMode === mode
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {icon}
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Hint */}
      <div className="hidden lg:flex items-center gap-1 text-muted-foreground/50">
        <Info className="h-3 w-3" />
        <span>Scroll · Drag · Right-drag to navigate 3D</span>
      </div>
    </div>
  );
}

// ─── Placing overlay ─────────────────────────────────────────────────────────
function PlacingOverlay() {
  const { placingMode } = useCameraPlannerStore();
  if (!placingMode) return null;
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
      <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full shadow-xl text-xs font-semibold animate-bounce">
        <MousePointer2 className="h-4 w-4" />
        Click wall or floor to place camera — ESC to cancel
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CameraPlanner3D() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const blueprint2DRef = useRef<Blueprint2DHandle>(null);
  const { setPlacingMode, placingMode, viewMode, cameras, sceneName } = useCameraPlannerStore();

  // ESC cancels placing mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && placingMode) setPlacingMode(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [placingMode, setPlacingMode]);

  // Export 3D canvas as PNG
  const export3D = useCallback(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const canvas = container.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `3d-plan-${sceneName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.png`;
    link.click();
  }, [sceneName]);

  // Export 2D blueprint as PNG
  const export2D = useCallback(() => {
    blueprint2DRef.current?.exportPNG(sceneName);
  }, [sceneName]);

  const show3D = viewMode === "3d" || viewMode === "split";
  const show2D = viewMode === "2d" || viewMode === "split";

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-3 sm:-m-4 md:-m-6 lg:-m-8 overflow-hidden">

      {/* ── Page header ── */}
      <div className="px-4 py-3 border-b border-border/60 bg-background/95 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center border border-blue-500/20">
            <Camera style={{ width: 18, height: 18 }} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">3D Camera Planner</h1>
            <p className="text-[11px] text-muted-foreground">
              Interactive 3D + 2D architectural blueprint with pre-built templates
            </p>
          </div>

          {/* Export + Framework buttons */}
          <div className="ml-auto flex items-center gap-2">
            <DesignFramework />
            <div className="h-4 w-px bg-border/60" />
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5 h-8"
              onClick={export2D}
              disabled={cameras.length === 0}
            >
              <FileImage className="h-3.5 w-3.5 text-blue-400" />
              Blueprint PNG
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5 h-8"
              onClick={export3D}
              disabled={cameras.length === 0}
            >
              <Download className="h-3.5 w-3.5 text-indigo-400" />
              3D PNG
            </Button>
            <Badge variant="outline" className="text-[10px] bg-blue-500/5 border-blue-500/20 text-blue-400">
              Beta
            </Badge>
          </div>
        </div>
      </div>

      {/* ── Stats / view mode bar ── */}
      <StatsBar />

      {/* ── Main content: left panel + canvas area ── */}
      <div className="flex flex-1 min-h-0">

        {/* Left control panel */}
        <div className="w-72 flex-shrink-0 border-r border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden">
          <PlannerControls onExport={export2D} />
        </div>

        {/* Canvas area */}
        <div className="flex-1 flex min-w-0 min-h-0">

          {/* 3D Canvas */}
          {show3D && (
            <div
              ref={canvasContainerRef}
              className={`relative overflow-hidden bg-[#0f172a] ${show2D ? "w-1/2 border-r border-border/40" : "flex-1"}`}
              style={{ cursor: placingMode ? "crosshair" : "default" }}
            >
              <PlacingOverlay />

              {/* 3D label */}
              <div className="absolute top-2 left-3 z-10 pointer-events-none">
                <Badge variant="outline" className="text-[9px] bg-indigo-500/10 border-indigo-500/20 text-indigo-300">
                  3D View
                </Badge>
              </div>

              <Canvas
                shadows
                gl={{ antialias: true, preserveDrawingBuffer: true }}
                style={{ width: "100%", height: "100%" }}
              >
                <Suspense fallback={null}>
                  <RoomScene />
                </Suspense>
              </Canvas>

              <Loader
                containerStyles={{ background: "rgba(15,23,42,0.8)", backdropFilter: "blur(8px)" }}
                barStyles={{ background: "#6366f1" }}
                dataStyles={{ color: "#94a3b8", fontSize: "12px" }}
                dataInterpolation={(p) => `Loading 3D scene... ${Math.round(p)}%`}
              />
            </div>
          )}

          {/* 2D Blueprint Canvas */}
          {show2D && (
            <div className={`relative overflow-hidden bg-[#0a1628] ${show3D ? "w-1/2" : "flex-1"}`}>
              {/* 2D label */}
              <div className="absolute top-2 left-3 z-10 pointer-events-none">
                <Badge variant="outline" className="text-[9px] bg-blue-500/10 border-blue-500/20 text-blue-300">
                  2D Blueprint
                </Badge>
              </div>

              {cameras.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MapIcon className="h-12 w-12 mb-3 opacity-20" />
                  <p className="text-sm">Load a template or place cameras</p>
                  <p className="text-xs opacity-60 mt-1">Blueprint appears here</p>
                </div>
              ) : (
                <Blueprint2D ref={blueprint2DRef} className="w-full h-full" />
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
