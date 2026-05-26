import type { CameraPlacement, RoomConfig } from "@/stores/cameraPlannerStore";

export type TemplateKey = "office" | "campus" | "industrial" | "school";

export interface SceneTemplate {
  key: TemplateKey;
  label: string;
  description: string;
  icon: string;
  tags: string[];
  room: RoomConfig;
  cameras: Omit<CameraPlacement, "id">[];
}

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#f97316",
  "#22d3ee", "#a3e635", "#fb923c", "#e879f9",
];

let ci = 0;
const c = () => COLORS[ci++ % COLORS.length];
const resetColors = () => { ci = 0; };

function makeTemplate(
  key: TemplateKey,
  label: string,
  description: string,
  icon: string,
  tags: string[],
  room: RoomConfig,
  rawCameras: Omit<CameraPlacement, "id" | "color">[]
): SceneTemplate {
  resetColors();
  return {
    key, label, description, icon, tags, room,
    cameras: rawCameras.map((cam) => ({ ...cam, color: c() })),
  };
}

const PI = Math.PI;

// ─── OFFICE / MULTI-ZONE ──────────────────────────────────────────────────────
const officeTemplate = makeTemplate(
  "office",
  "Office & Multi-Zone",
  "Corridors, workstations, server room & reception — complete office surveillance plan",
  "🏢",
  ["Office", "Corridor", "Server Room", "Reception"],
  { width: 24, length: 18, height: 3 },
  [
    // Reception entrance - facing inward
    { name: "Reception CAM-01", type: "dome",   position: [-10, 2.9, -8.5], rotationY: 0,        rotationX: PI/4, fovH: 110, fovV: 70, range: 8,  mountPosition: "ceiling" },
    { name: "Reception CAM-02", type: "bullet", position: [10,  2.5, -8.5], rotationY: PI,        rotationX: PI/5, fovH: 80,  fovV: 55, range: 10, mountPosition: "wall" },
    // Main corridor
    { name: "Corridor CAM-03", type: "dome",   position: [-5,  2.9, 0],    rotationY: PI/2,      rotationX: PI/4, fovH: 100, fovV: 65, range: 7,  mountPosition: "ceiling" },
    { name: "Corridor CAM-04", type: "dome",   position: [5,   2.9, 0],    rotationY: -PI/2,     rotationX: PI/4, fovH: 100, fovV: 65, range: 7,  mountPosition: "ceiling" },
    // Workstation area
    { name: "Workspace CAM-05", type: "dome",  position: [-9,  2.9, 4],    rotationY: PI/4,      rotationX: PI/3, fovH: 90,  fovV: 60, range: 6,  mountPosition: "ceiling" },
    { name: "Workspace CAM-06", type: "dome",  position: [9,   2.9, 4],    rotationY: -PI/4,     rotationX: PI/3, fovH: 90,  fovV: 60, range: 6,  mountPosition: "ceiling" },
    // Server room
    { name: "Server Rm CAM-07", type: "dome",  position: [10,  2.9, 8.5],  rotationY: PI,        rotationX: PI/4, fovH: 70,  fovV: 50, range: 5,  mountPosition: "ceiling" },
    // Stairwell / fire exit
    { name: "Exit CAM-08",      type: "bullet", position: [-11, 2.5, 8.5], rotationY: -PI/2,    rotationX: PI/6, fovH: 80,  fovV: 55, range: 9,  mountPosition: "wall" },
    // Corner wide-angle
    { name: "Corner CAM-09",    type: "fisheye", position: [0,  2.9, -7],   rotationY: 0,        rotationX: PI/4, fovH: 180, fovV: 120, range: 5, mountPosition: "ceiling" },
  ]
);

// ─── CAMPUS MULTI-BUILDING ───────────────────────────────────────────────────
const campusTemplate = makeTemplate(
  "campus",
  "Multi-Building Campus",
  "Large outdoor campus with multiple zones, parking, and secure perimeter coverage",
  "🏫",
  ["Campus", "Outdoor", "Parking", "Perimeter", "PTZ"],
  { width: 50, length: 40, height: 5 },
  [
    // Main gate PTZ
    { name: "Main Gate PTZ-01",  type: "ptz",    position: [0,   4.8, -19],  rotationY: 0,       rotationX: PI/6, fovH: 60,  fovV: 40, range: 20, mountPosition: "wall" },
    // Perimeter corner PTZs
    { name: "Perimeter PTZ-02",  type: "ptz",    position: [-24, 4.8, -19],  rotationY: PI/4,    rotationX: PI/5, fovH: 55,  fovV: 38, range: 18, mountPosition: "wall" },
    { name: "Perimeter PTZ-03",  type: "ptz",    position: [24,  4.8, -19],  rotationY: -PI/4,   rotationX: PI/5, fovH: 55,  fovV: 38, range: 18, mountPosition: "wall" },
    { name: "Perimeter PTZ-04",  type: "ptz",    position: [-24, 4.8, 19],   rotationY: 3*PI/4,  rotationX: PI/5, fovH: 55,  fovV: 38, range: 18, mountPosition: "wall" },
    { name: "Perimeter PTZ-05",  type: "ptz",    position: [24,  4.8, 19],   rotationY: -3*PI/4, rotationX: PI/5, fovH: 55,  fovV: 38, range: 18, mountPosition: "wall" },
    // Building A entrance
    { name: "Bldg A Entry CAM-06", type: "dome", position: [-12, 4.5, -10],  rotationY: 0,       rotationX: PI/4, fovH: 100, fovV: 65, range: 10, mountPosition: "ceiling" },
    // Building B entrance
    { name: "Bldg B Entry CAM-07", type: "dome", position: [12,  4.5, -10],  rotationY: 0,       rotationX: PI/4, fovH: 100, fovV: 65, range: 10, mountPosition: "ceiling" },
    // Central courtyard
    { name: "Courtyard CAM-08",    type: "ptz",  position: [0,   4.8, 0],    rotationY: 0,       rotationX: PI/5, fovH: 65,  fovV: 45, range: 22, mountPosition: "ceiling" },
    // Parking lot wide-area
    { name: "Parking CAM-09",   type: "bullet",  position: [-20, 4.5, 15],   rotationY: PI/3,    rotationX: PI/8, fovH: 90,  fovV: 60, range: 15, mountPosition: "wall" },
    { name: "Parking CAM-10",   type: "bullet",  position: [20,  4.5, 15],   rotationY: -PI/3,   rotationX: PI/8, fovH: 90,  fovV: 60, range: 15, mountPosition: "wall" },
    // Sports field / back area
    { name: "Field PTZ-11",     type: "ptz",     position: [0,   4.8, 19],   rotationY: PI,      rotationX: PI/6, fovH: 70,  fovV: 45, range: 25, mountPosition: "wall" },
    // Side gates
    { name: "Side Gate CAM-12", type: "bullet",  position: [-24, 3.5, 0],    rotationY: PI/2,    rotationX: PI/5, fovH: 80,  fovV: 55, range: 12, mountPosition: "wall" },
  ]
);

// ─── INDUSTRIAL FACILITY ─────────────────────────────────────────────────────
const industrialTemplate = makeTemplate(
  "industrial",
  "Industrial Facility",
  "Factory floor, loading docks, machinery zones, and high-ceiling warehouse surveillance",
  "🏭",
  ["Factory", "Warehouse", "Loading Dock", "Machinery", "High-Ceiling"],
  { width: 40, length: 32, height: 9 },
  [
    // High-mount PTZ at roof trusses
    { name: "Roof PTZ-01",     type: "ptz",    position: [-15, 8.5, -12],  rotationY: PI/4,    rotationX: PI/3, fovH: 65,  fovV: 45, range: 22, mountPosition: "ceiling" },
    { name: "Roof PTZ-02",     type: "ptz",    position: [15,  8.5, -12],  rotationY: -PI/4,   rotationX: PI/3, fovH: 65,  fovV: 45, range: 22, mountPosition: "ceiling" },
    { name: "Roof PTZ-03",     type: "ptz",    position: [-15, 8.5, 12],   rotationY: 3*PI/4,  rotationX: PI/3, fovH: 65,  fovV: 45, range: 22, mountPosition: "ceiling" },
    { name: "Roof PTZ-04",     type: "ptz",    position: [15,  8.5, 12],   rotationY: -3*PI/4, rotationX: PI/3, fovH: 65,  fovV: 45, range: 22, mountPosition: "ceiling" },
    // Loading dock area
    { name: "Loading Dock CAM-05", type: "bullet", position: [-19, 6,  -15],  rotationY: PI/2,    rotationX: PI/5, fovH: 85,  fovV: 58, range: 15, mountPosition: "wall" },
    { name: "Loading Dock CAM-06", type: "bullet", position: [-19, 6,  -5],   rotationY: PI/2,    rotationX: PI/5, fovH: 85,  fovV: 58, range: 15, mountPosition: "wall" },
    // Machine zone domes
    { name: "Machine Zone CAM-07", type: "dome",   position: [0,   8.5, -6],   rotationY: 0,       rotationX: PI/3, fovH: 110, fovV: 75, range: 12, mountPosition: "ceiling" },
    { name: "Machine Zone CAM-08", type: "dome",   position: [0,   8.5, 6],    rotationY: PI,      rotationX: PI/3, fovH: 110, fovV: 75, range: 12, mountPosition: "ceiling" },
    // Assembly line
    { name: "Assembly CAM-09",  type: "dome",    position: [-8,  8.5, 0],    rotationY: 0,       rotationX: PI/3, fovH: 95,  fovV: 65, range: 10, mountPosition: "ceiling" },
    { name: "Assembly CAM-10",  type: "dome",    position: [8,   8.5, 0],    rotationY: 0,       rotationX: PI/3, fovH: 95,  fovV: 65, range: 10, mountPosition: "ceiling" },
    // Perimeter bullets
    { name: "Perimeter CAM-11", type: "bullet",  position: [19,  5,   0],   rotationY: -PI/2,   rotationX: PI/6, fovH: 80,  fovV: 55, range: 18, mountPosition: "wall" },
    { name: "Perimeter CAM-12", type: "bullet",  position: [0,   5,  15.5], rotationY: PI,      rotationX: PI/6, fovH: 80,  fovV: 55, range: 18, mountPosition: "wall" },
    // Quality control / office entry
    { name: "QC Entry CAM-13", type: "dome",    position: [16,  8.5, -14],  rotationY: -PI/4,   rotationX: PI/4, fovH: 90,  fovV: 60, range: 8,  mountPosition: "ceiling" },
  ]
);

// ─── SCHOOL / CLASSROOM ──────────────────────────────────────────────────────
const schoolTemplate = makeTemplate(
  "school",
  "School & Classrooms",
  "Classrooms, corridors, playground, canteen, and main entrance for educational campus",
  "📚",
  ["School", "Classroom", "Corridor", "Playground", "Canteen"],
  { width: 30, length: 25, height: 3.2 },
  [
    // Main entrance
    { name: "Main Entrance CAM-01", type: "dome",   position: [0,   3,  -12], rotationY: 0,      rotationX: PI/4, fovH: 110, fovV: 70, range: 9,  mountPosition: "ceiling" },
    { name: "Gate PTZ-02",          type: "ptz",    position: [0,   3,  -11], rotationY: 0,      rotationX: PI/5, fovH: 65,  fovV: 45, range: 16, mountPosition: "wall" },
    // Main corridor
    { name: "Corridor CAM-03",      type: "dome",   position: [-10, 3,  -3],  rotationY: PI/2,   rotationX: PI/4, fovH: 100, fovV: 65, range: 7,  mountPosition: "ceiling" },
    { name: "Corridor CAM-04",      type: "dome",   position: [10,  3,  -3],  rotationY: -PI/2,  rotationX: PI/4, fovH: 100, fovV: 65, range: 7,  mountPosition: "ceiling" },
    { name: "Corridor CAM-05",      type: "dome",   position: [0,   3,  3],   rotationY: 0,      rotationX: PI/4, fovH: 100, fovV: 65, range: 7,  mountPosition: "ceiling" },
    // Classroom entries (bullet cameras facing doors)
    { name: "Class A Entry CAM-06", type: "bullet", position: [-13, 2.5, -8], rotationY: PI/2,  rotationX: PI/6, fovH: 75,  fovV: 52, range: 8,  mountPosition: "wall" },
    { name: "Class B Entry CAM-07", type: "bullet", position: [13,  2.5, -8], rotationY: -PI/2, rotationX: PI/6, fovH: 75,  fovV: 52, range: 8,  mountPosition: "wall" },
    // Canteen / cafeteria
    { name: "Canteen CAM-08",       type: "dome",   position: [-10, 3,  9],   rotationY: PI/3,   rotationX: PI/4, fovH: 110, fovV: 70, range: 8,  mountPosition: "ceiling" },
    // Playground / outdoor
    { name: "Playground PTZ-09",    type: "ptz",    position: [10,  3,  12],  rotationY: PI,     rotationX: PI/5, fovH: 70,  fovV: 48, range: 18, mountPosition: "wall" },
    // Library
    { name: "Library CAM-10",       type: "fisheye", position: [0,  3,  10],  rotationY: 0,      rotationX: PI/4, fovH: 185, fovV: 120, range: 5, mountPosition: "ceiling" },
  ]
);

export const SCENE_TEMPLATES: SceneTemplate[] = [
  officeTemplate,
  campusTemplate,
  industrialTemplate,
  schoolTemplate,
];
