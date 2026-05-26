import { create } from "zustand";

export type CameraType = "dome" | "bullet" | "ptz" | "fisheye";
export type MountPosition = "ceiling" | "wall" | "corner";
export type ViewMode = "3d" | "2d" | "split";

export interface CameraPlacement {
  id: string;
  name: string;
  type: CameraType;
  position: [number, number, number]; // [x, y, z] in meters
  rotationY: number;   // horizontal rotation in radians
  rotationX: number;   // tilt angle in radians (downward)
  fovH: number;        // horizontal FOV in degrees
  fovV: number;        // vertical FOV in degrees
  range: number;       // effective range in meters
  mountPosition: MountPosition;
  color: string;
}

export interface RoomConfig {
  width: number;   // X axis in meters
  length: number;  // Z axis in meters
  height: number;  // Y axis in meters
}

interface CameraPlannerState {
  room: RoomConfig;
  cameras: CameraPlacement[];
  selectedId: string | null;
  placingMode: boolean;
  showCoverage: boolean;
  showGrid: boolean;
  showLabels: boolean;
  viewMode: ViewMode;
  sceneName: string;

  // Actions
  setRoom: (room: Partial<RoomConfig>) => void;
  addCamera: (cam: Omit<CameraPlacement, "id">) => void;
  updateCamera: (id: string, patch: Partial<CameraPlacement>) => void;
  removeCamera: (id: string) => void;
  selectCamera: (id: string | null) => void;
  setPlacingMode: (v: boolean) => void;
  toggleCoverage: () => void;
  toggleGrid: () => void;
  toggleLabels: () => void;
  clearAll: () => void;
  setViewMode: (mode: ViewMode) => void;
  loadScene: (room: RoomConfig, cameras: Omit<CameraPlacement, "id">[], name: string) => void;
}

const CAMERA_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#f97316",
  "#22d3ee", "#a3e635", "#fb923c", "#e879f9",
];

let colorIdx = 0;
const nextColor = () => CAMERA_COLORS[colorIdx++ % CAMERA_COLORS.length];

export const useCameraPlannerStore = create<CameraPlannerState>((set) => ({
  room: { width: 10, length: 10, height: 3 },
  cameras: [],
  selectedId: null,
  placingMode: false,
  showCoverage: true,
  showGrid: true,
  showLabels: true,
  viewMode: "split",
  sceneName: "Untitled Plan",

  setRoom: (partial) =>
    set((s) => ({ room: { ...s.room, ...partial } })),

  addCamera: (cam) =>
    set((s) => ({
      cameras: [...s.cameras, { id: crypto.randomUUID(), ...cam, color: nextColor() }],
      placingMode: false,
    })),

  updateCamera: (id, patch) =>
    set((s) => ({
      cameras: s.cameras.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),

  removeCamera: (id) =>
    set((s) => ({
      cameras: s.cameras.filter((c) => c.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  selectCamera: (id) => set({ selectedId: id }),
  setPlacingMode: (v) => set({ placingMode: v }),
  toggleCoverage: () => set((s) => ({ showCoverage: !s.showCoverage })),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  clearAll: () => set({ cameras: [], selectedId: null, sceneName: "Untitled Plan" }),
  setViewMode: (mode) => set({ viewMode: mode }),

  loadScene: (room, rawCameras, name) => {
    colorIdx = 0;
    set({
      room,
      cameras: rawCameras.map((cam) => ({
        ...cam,
        id: crypto.randomUUID(),
        color: cam.color ?? nextColor(),
      })),
      selectedId: null,
      placingMode: false,
      sceneName: name,
    });
  },
}));
