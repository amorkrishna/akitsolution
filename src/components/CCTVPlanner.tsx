import React, { useState, useRef, useCallback } from 'react';
import { Camera, Plus, Settings2, Box, Maximize, RotateCcw, Trash2, Crosshair, View } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Sphere, Cylinder, SpotLight } from '@react-three/drei';
import * as THREE from 'three';

// --- Types ---
type CameraType = 'Dome' | 'Bullet';

export interface CameraNode {
  id: string;
  x: number; // Pixels
  y: number; // Pixels
  type: CameraType;
  height: number; // Height in feet
  tilt: number; // Tilt angle in degrees
  focalLength: number; // Lens focal length in mm
  rotation: number; // Pan rotation in degrees (0 is pointing right)
}

const SENSOR_WIDTH = 4.8; // 1/3" sensor width in mm
const PIXELS_PER_FEET = 10; 
const VISUAL_RANGE_FEET = 30; // Length of the FOV cone in the 2D view

// --- Helper Functions ---
// Calculate FOV in degrees based on focal length and sensor width
const calculateFOV = (focalLength: number) => {
  // theta = 2 * arctan(h / 2f)
  const thetaRad = 2 * Math.atan(SENSOR_WIDTH / (2 * focalLength));
  return (thetaRad * 180) / Math.PI; // Return in degrees
};

// --- 3D Scene Component ---
const Scene3D = ({ cameras }: { cameras: CameraNode[] }) => {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={1} castShadow />
      
      {/* Ground Grid */}
      <Grid 
        infiniteGrid 
        fadeDistance={50} 
        sectionColor="#888" 
        cellColor="#ccc" 
        cellSize={1} 
        sectionSize={5} 
      />

      {cameras.map((cam) => {
        // Convert 2D pixel coordinates to 3D world coordinates
        // Assuming 1 unit in 3D = 1 foot
        const posX = cam.x / PIXELS_PER_FEET;
        const posZ = cam.y / PIXELS_PER_FEET;
        const posY = cam.height;

        const fovDegrees = calculateFOV(cam.focalLength);
        const fovRadians = (fovDegrees * Math.PI) / 180;
        
        // Rotation (Three.js uses radians). Z is inverted in typical 2D-to-3D mappings
        const rotY = -(cam.rotation * Math.PI) / 180;
        // Tilt
        const rotX = -((90 - cam.tilt) * Math.PI) / 180;

        return (
          <group key={cam.id} position={[posX, posY, posZ]} rotation={[0, rotY, 0]}>
            {/* Camera Body */}
            {cam.type === 'Dome' ? (
              <Sphere args={[0.4, 16, 16]} position={[0, -0.2, 0]}>
                <meshStandardMaterial color="#333" />
              </Sphere>
            ) : (
              <Cylinder args={[0.2, 0.2, 0.8, 16]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                <meshStandardMaterial color="#f0f0f0" />
              </Cylinder>
            )}
            
            {/* Pole / Mount indicator */}
            <Cylinder args={[0.05, 0.05, posY]} position={[0, -posY / 2, 0]}>
              <meshStandardMaterial color="#666" />
            </Cylinder>

            {/* FOV SpotLight to simulate coverage */}
            <group rotation={[rotX, 0, 0]}>
              <SpotLight
                position={[0, 0, 0]}
                angle={fovRadians / 2}
                penumbra={0.2}
                intensity={2}
                distance={VISUAL_RANGE_FEET}
                color="#ffffaa"
                castShadow
              />
              {/* Optional: Add a helper cone for explicit visual volume */}
              <mesh position={[0, 0, VISUAL_RANGE_FEET / 2]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[Math.tan(fovRadians / 2) * VISUAL_RANGE_FEET, 0, VISUAL_RANGE_FEET, 32, 1, true]} />
                <meshBasicMaterial color="#ffff00" transparent opacity={0.1} side={THREE.DoubleSide} />
              </mesh>
            </group>
          </group>
        );
      })}
      
      <OrbitControls makeDefault />
    </>
  );
};

// --- Main Component ---
export default function CCTVPlanner() {
  const [cameras, setCameras] = useState<CameraNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
  const [isDragging, setIsDragging] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);

  // Add a new camera to the center of the grid
  const addCamera = () => {
    const newCam: CameraNode = {
      id: Math.random().toString(36).substring(2, 9),
      x: 300,
      y: 300,
      type: 'Dome',
      height: 10,
      tilt: 45,
      focalLength: 2.8,
      rotation: 0,
    };
    setCameras([...cameras, newCam]);
    setSelectedId(newCam.id);
  };

  // Handle Dragging in 2D
  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    if (viewMode !== '2D') return;
    e.stopPropagation();
    setSelectedId(id);
    setIsDragging(true);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !selectedId || viewMode !== '2D' || !svgRef.current) return;
    
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return;
    
    // Convert screen coordinates to SVG coordinates
    const x = (e.clientX - CTM.e) / CTM.a;
    const y = (e.clientY - CTM.f) / CTM.d;

    setCameras((cams) =>
      cams.map((cam) => (cam.id === selectedId ? { ...cam, x, y } : cam))
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  // Update selected camera properties
  const updateSelected = (updates: Partial<CameraNode>) => {
    setCameras((cams) =>
      cams.map((cam) => (cam.id === selectedId ? { ...cam, ...updates } : cam))
    );
  };

  const deleteCamera = (id: string) => {
    setCameras((cams) => cams.filter((c) => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const selectedCam = cameras.find((c) => c.id === selectedId);

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full bg-slate-50 text-slate-900 rounded-lg overflow-hidden border shadow-sm">
      {/* LEFT PANEL: Canvas Area */}
      <div className="flex-1 relative bg-white overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <button
            onClick={addCamera}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md shadow-md hover:bg-blue-700 transition"
          >
            <Plus size={18} />
            <span>Add Camera</span>
          </button>
          
          <div className="bg-white rounded-md shadow-md flex border p-1">
            <button
              onClick={() => setViewMode('2D')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                viewMode === '2D' ? 'bg-slate-100 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              2D Plan
            </button>
            <button
              onClick={() => setViewMode('3D')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-2 ${
                viewMode === '3D' ? 'bg-slate-100 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Box size={16} />
              3D Preview
            </button>
          </div>
        </div>

        {/* View Area */}
        <div className="flex-1 w-full h-full cursor-crosshair">
          {viewMode === '2D' ? (
            // 2D SVG Canvas
            <svg
              ref={svgRef}
              className="w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onClick={() => setSelectedId(null)}
            >
              {cameras.map((cam) => {
                const isSelected = cam.id === selectedId;
                const fovDegrees = calculateFOV(cam.focalLength);
                
                // Draw FOV Triangle
                const range = VISUAL_RANGE_FEET * PIXELS_PER_FEET;
                const halfAngleRad = (fovDegrees / 2) * (Math.PI / 180);
                const rotRad = (cam.rotation * Math.PI) / 180;

                const p1 = { x: cam.x, y: cam.y };
                const p2 = {
                  x: cam.x + range * Math.cos(rotRad - halfAngleRad),
                  y: cam.y + range * Math.sin(rotRad - halfAngleRad),
                };
                const p3 = {
                  x: cam.x + range * Math.cos(rotRad + halfAngleRad),
                  y: cam.y + range * Math.sin(rotRad + halfAngleRad),
                };

                return (
                  <g key={cam.id}>
                    {/* FOV Cone */}
                    <polygon
                      points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
                      fill={isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(156, 163, 175, 0.15)'}
                      stroke={isSelected ? '#3b82f6' : '#9ca3af'}
                      strokeWidth="1"
                      className="pointer-events-none transition-all duration-300"
                    />
                    
                    {/* Camera Node */}
                    <g
                      transform={`translate(${cam.x}, ${cam.y})`}
                      onPointerDown={(e) => handlePointerDown(e, cam.id)}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <circle
                        r={12}
                        fill="white"
                        stroke={isSelected ? '#2563eb' : '#4b5563'}
                        strokeWidth={isSelected ? 3 : 2}
                        className="shadow-sm transition-all"
                      />
                      <Camera
                        size={14}
                        x={-7}
                        y={-7}
                        color={isSelected ? '#2563eb' : '#4b5563'}
                        className="pointer-events-none"
                      />
                    </g>
                  </g>
                );
              })}
            </svg>
          ) : (
            // 3D Canvas Preview
            <div className="w-full h-full bg-slate-900">
              <Canvas camera={{ position: [0, 20, 30], fov: 50 }}>
                <Scene3D cameras={cameras} />
              </Canvas>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Customization Sidebar */}
      <div className="w-80 bg-white border-l shadow-xl flex flex-col z-20">
        <div className="p-4 border-b bg-slate-50 flex items-center gap-2">
          <Settings2 size={20} className="text-slate-600" />
          <h2 className="font-semibold text-lg">Properties</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!selectedCam ? (
            <div className="text-center text-slate-500 mt-10 flex flex-col items-center">
              <Crosshair size={48} className="text-slate-300 mb-4" />
              <p>Select a camera on the canvas to configure its properties.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Type Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Camera Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateSelected({ type: 'Dome' })}
                    className={`flex-1 py-2 rounded border text-sm font-medium ${
                      selectedCam.type === 'Dome' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Dome
                  </button>
                  <button
                    onClick={() => updateSelected({ type: 'Bullet' })}
                    className={`flex-1 py-2 rounded border text-sm font-medium ${
                      selectedCam.type === 'Bullet' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Bullet
                  </button>
                </div>
              </div>

              {/* Focal Length (Lens) */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">Lens Size (Focal Length)</label>
                  <span className="text-xs font-mono bg-slate-100 px-1 rounded">{selectedCam.focalLength} mm</span>
                </div>
                <input
                  type="range"
                  min="2.8"
                  max="12"
                  step="0.1"
                  value={selectedCam.focalLength}
                  onChange={(e) => updateSelected({ focalLength: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>2.8mm (Wide)</span>
                  <span>12mm (Zoomed)</span>
                </div>
                <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-100 flex items-start gap-2">
                  <View size={14} className="mt-0.5" />
                  <p>Calculated FOV Angle: <strong>{calculateFOV(selectedCam.focalLength).toFixed(1)}&deg;</strong></p>
                </div>
              </div>

              {/* Rotation (Pan) */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">Rotation (Pan)</label>
                  <span className="text-xs font-mono bg-slate-100 px-1 rounded">{selectedCam.rotation}&deg;</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={selectedCam.rotation}
                  onChange={(e) => updateSelected({ rotation: parseInt(e.target.value) })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Height */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">Mounting Height</label>
                  <span className="text-xs font-mono bg-slate-100 px-1 rounded">{selectedCam.height} ft</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={selectedCam.height}
                  onChange={(e) => updateSelected({ height: parseInt(e.target.value) })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Tilt */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">Tilt Angle</label>
                  <span className="text-xs font-mono bg-slate-100 px-1 rounded">{selectedCam.tilt}&deg;</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  value={selectedCam.tilt}
                  onChange={(e) => updateSelected({ tilt: parseInt(e.target.value) })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-[10px] text-slate-400 mt-1">0&deg; = Straight down, 90&deg; = Straight forward</p>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <button
                  onClick={() => deleteCamera(selectedCam.id)}
                  className="w-full flex justify-center items-center gap-2 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition font-medium text-sm border border-red-200"
                >
                  <Trash2 size={16} />
                  Delete Camera
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
