import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Camera, Plus, Trash2, Eye, EyeOff, Grid3x3, Tag, Crosshair,
  ChevronDown, ChevronRight, RotateCcw, Download,
} from "lucide-react";
import { useCameraPlannerStore, type CameraPlacement, type CameraType } from "@/stores/cameraPlannerStore";
import { TemplateSelector } from "./TemplateSelector";
import { DesignFrameworkCard } from "./DesignFramework";
import { cn } from "@/lib/utils";
import { useState } from "react";

const CAMERA_TYPES: { value: CameraType; label: string; icon: string }[] = [
  { value: "dome",    label: "Dome",    icon: "🔘" },
  { value: "bullet",  label: "Bullet",  icon: "🔫" },
  { value: "ptz",     label: "PTZ",     icon: "🔄" },
  { value: "fisheye", label: "Fisheye", icon: "🐟" },
];

function CameraCard({ camera }: { camera: CameraPlacement }) {
  const { selectedId, selectCamera, updateCamera, removeCamera } = useCameraPlannerStore();
  const [expanded, setExpanded] = useState(false);
  const isSelected = selectedId === camera.id;

  const toggle = () => {
    selectCamera(isSelected ? null : camera.id);
    setExpanded(!isSelected || !expanded);
  };

  return (
    <div
      className={cn(
        "rounded-lg border transition-all",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/40"
      )}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-2 p-2.5 cursor-pointer"
        onClick={toggle}
      >
        <div
          className="h-4 w-4 rounded-full flex-shrink-0"
          style={{ background: camera.color }}
        />
        <span className="flex-1 text-xs font-semibold truncate">{camera.name}</span>
        <Badge variant="outline" className="text-[9px] px-1 py-0">
          {CAMERA_TYPES.find(t => t.value === camera.type)?.icon} {camera.type}
        </Badge>
        {isSelected
          ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
          : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
      </div>

      {/* Expanded config */}
      {isSelected && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
          {/* Name */}
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Camera Name</Label>
            <Input
              value={camera.name}
              onChange={(e) => updateCamera(camera.id, { name: e.target.value })}
              className="h-7 text-xs"
            />
          </div>

          {/* Type */}
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Type</Label>
            <Select
              value={camera.type}
              onValueChange={(v) => updateCamera(camera.id, { type: v as CameraType })}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAMERA_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">
                    {t.icon} {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* FOV */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <Label className="text-[10px] text-muted-foreground">H. FOV</Label>
              <span className="text-[10px] font-mono text-primary">{camera.fovH}°</span>
            </div>
            <Slider
              value={[camera.fovH]}
              onValueChange={([v]) => updateCamera(camera.id, { fovH: v })}
              min={20} max={180} step={5}
              className="h-4"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <Label className="text-[10px] text-muted-foreground">V. FOV</Label>
              <span className="text-[10px] font-mono text-primary">{camera.fovV}°</span>
            </div>
            <Slider
              value={[camera.fovV]}
              onValueChange={([v]) => updateCamera(camera.id, { fovV: v })}
              min={10} max={120} step={5}
              className="h-4"
            />
          </div>

          {/* Range */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <Label className="text-[10px] text-muted-foreground">Range</Label>
              <span className="text-[10px] font-mono text-primary">{camera.range}m</span>
            </div>
            <Slider
              value={[camera.range]}
              onValueChange={([v]) => updateCamera(camera.id, { range: v })}
              min={1} max={30} step={0.5}
              className="h-4"
            />
          </div>

          {/* Rotation Y */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <Label className="text-[10px] text-muted-foreground">Rotation (H)</Label>
              <span className="text-[10px] font-mono text-primary">
                {Math.round((camera.rotationY * 180) / Math.PI)}°
              </span>
            </div>
            <Slider
              value={[camera.rotationY]}
              onValueChange={([v]) => updateCamera(camera.id, { rotationY: v })}
              min={-Math.PI} max={Math.PI} step={0.05}
              className="h-4"
            />
          </div>

          {/* Tilt */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <Label className="text-[10px] text-muted-foreground">Tilt (V)</Label>
              <span className="text-[10px] font-mono text-primary">
                {Math.round((camera.rotationX * 180) / Math.PI)}°
              </span>
            </div>
            <Slider
              value={[camera.rotationX]}
              onValueChange={([v]) => updateCamera(camera.id, { rotationX: v })}
              min={0} max={Math.PI / 2} step={0.05}
              className="h-4"
            />
          </div>

          {/* Height */}
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Height (Y)</Label>
            <Input
              type="number"
              value={camera.position[1].toFixed(1)}
              onChange={(e) =>
                updateCamera(camera.id, {
                  position: [camera.position[0], parseFloat(e.target.value) || 0, camera.position[2]],
                })
              }
              className="h-7 text-xs"
              step={0.1}
            />
          </div>

          <Button
            variant="destructive"
            size="sm"
            className="w-full h-7 text-xs"
            onClick={() => removeCamera(camera.id)}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Remove Camera
          </Button>
        </div>
      )}
    </div>
  );
}

interface PlannerControlsProps {
  onExport: () => void;
}

export function PlannerControls({ onExport }: PlannerControlsProps) {
  const {
    room, cameras, placingMode,
    showCoverage, showGrid, showLabels,
    setRoom, setPlacingMode,
    toggleCoverage, toggleGrid, toggleLabels,
    clearAll,
  } = useCameraPlannerStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  void canvasRef;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/60 flex-shrink-0">
        <div className="flex items-center gap-2 mb-0.5">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Camera className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-sm font-bold">3D Camera Planner</h2>
        </div>
        <p className="text-[10px] text-muted-foreground ml-9">
          Click walls/floor to place cameras
        </p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* Templates */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Scene Templates
          </h3>
          <TemplateSelector />
        </div>

        <Separator />

        {/* Room Dimensions */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Room Dimensions
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {(["width", "length", "height"] as const).map((key) => (
              <div key={key} className="space-y-1">
                <Label className="text-[10px] text-muted-foreground capitalize">{key} (m)</Label>
                <Input
                  type="number"
                  value={room[key]}
                  onChange={(e) => setRoom({ [key]: Math.max(1, parseFloat(e.target.value) || 1) })}
                  className="h-8 text-xs text-center font-mono"
                  min={1}
                  max={100}
                  step={0.5}
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[9px] text-muted-foreground">
            <span>W: {room.width}m</span>
            <span>L: {room.length}m</span>
            <span>H: {room.height}m</span>
          </div>
        </div>

        <Separator />

        {/* Place Mode */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Place Camera
          </h3>
          <Button
            className={cn(
              "w-full text-xs transition-all",
              placingMode
                ? "bg-primary text-primary-foreground animate-pulse"
                : "bg-primary/10 text-primary hover:bg-primary/20"
            )}
            onClick={() => setPlacingMode(!placingMode)}
          >
            {placingMode ? (
              <>
                <Crosshair className="h-4 w-4 mr-2 animate-spin" />
                Click a wall or floor...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Camera
              </>
            )}
          </Button>
          {placingMode && (
            <p className="text-[10px] text-muted-foreground text-center">
              Press <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">ESC</kbd> to cancel
            </p>
          )}
        </div>

        <Separator />

        {/* Display Toggles */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            View Options
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {showCoverage ? <Eye className="h-3.5 w-3.5 text-muted-foreground" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className="text-xs">Coverage Zones</span>
              </div>
              <Switch checked={showCoverage} onCheckedChange={toggleCoverage} className="scale-75" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Grid3x3 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs">Grid</span>
              </div>
              <Switch checked={showGrid} onCheckedChange={toggleGrid} className="scale-75" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs">Labels</span>
              </div>
              <Switch checked={showLabels} onCheckedChange={toggleLabels} className="scale-75" />
            </div>
          </div>
        </div>

        <Separator />

        {/* Camera List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Cameras
            </h3>
            <Badge variant="secondary" className="text-[10px]">
              {cameras.length}
            </Badge>
          </div>

          {cameras.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Camera className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-xs">No cameras placed yet</p>
              <p className="text-[10px]">Click "Add Camera" to start</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cameras.map((cam) => (
                <CameraCard key={cam.id} camera={cam} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="p-4 border-t border-border/60 space-y-2 flex-shrink-0">
        <DesignFrameworkCard />
        <Button
          onClick={onExport}
          className="w-full text-xs"
          variant="default"
          disabled={cameras.length === 0}
        >
          <Download className="h-3.5 w-3.5 mr-2" />
          Export Blueprint PNG
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60"
          onClick={clearAll}
          disabled={cameras.length === 0}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-2" />
          Clear All
        </Button>
      </div>
    </div>
  );
}
