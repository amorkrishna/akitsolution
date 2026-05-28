import React, { useState, useRef } from 'react';
import { Camera, Plus, Settings2, Box as BoxIcon, Trash2, Crosshair, View, LayoutGrid } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Sphere, Cylinder, SpotLight, Box as DreiBox } from '@react-three/drei';
import * as THREE from 'three';

// --- Types ---
type CameraType = 'Dome' | 'Bullet';
type EnvObjectType = 'door' | 'stair' | 'table' | 'chair' | 'server-rack';

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

export interface EnvObject {
  id: string;
  x: number; // Pixels
  y: number; // Pixels
  type: EnvObjectType;
  width: number; // feet
  depth: number; // feet
  height: number; // feet
  rotation: number; // degrees
  color: string;
  label: string;
}

const SENSOR_WIDTH = 4.8; // 1/3" sensor width in mm
const PIXELS_PER_FEET = 10; 
const VISUAL_RANGE_FEET = 30; // Length of the FOV cone in the 2D view

const OBJECT_TEMPLATES: Record<EnvObjectType, Omit<EnvObject, 'id' | 'x' | 'y'>> = {
  'door': { type: 'door', label: 'দরজা (Door)', width: 3, depth: 0.5, height: 7, rotation: 0, color: '#64748b' },
  'stair': { type: 'stair', label: 'সিঁড়ি (Stair)', width: 4, depth: 10, height: 5, rotation: 0, color: '#334155' },
  'table': { type: 'table', label: 'টেবিল (Table)', width: 5, depth: 3, height: 2.5, rotation: 0, color: '#b45309' },
  'chair': { type: 'chair', label: 'চেয়ার (Chair)', width: 2, depth: 2, height: 3, rotation: 0, color: '#451a03' },
  'server-rack': { type: 'server-rack', label: 'সার্ভার র্যাক (Server Rack)', width: 2, depth: 3, height: 7, rotation: 0, color: '#0f172a' },
};

// --- Helper Functions ---
const calculateFOV = (focalLength: number) => {
  const thetaRad = 2 * Math.atan(SENSOR_WIDTH / (2 * focalLength));
  return (thetaRad * 180) / Math.PI; 
};

// --- 3D Scene Component ---
const Scene3D = ({ cameras, envObjects }: { cameras: CameraNode[], envObjects: EnvObject[] }) => {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={1} castShadow />
      
      <Grid infiniteGrid fadeDistance={50} sectionColor="#888" cellColor="#ccc" cellSize={1} sectionSize={5} />

      {/* Render Environment Objects */}
      {envObjects.map((obj) => {
        const posX = obj.x / PIXELS_PER_FEET;
        const posZ = obj.y / PIXELS_PER_FEET;
        const posY = obj.height / 2; // Center of the box vertically
        const rotY = -(obj.rotation * Math.PI) / 180;

        return (
          <group key={obj.id} position={[posX, posY, posZ]} rotation={[0, rotY, 0]}>
            <DreiBox args={[obj.width, obj.height, obj.depth]} castShadow receiveShadow>
              <meshStandardMaterial color={obj.color} />
            </DreiBox>
          </group>
        );
      })}

      {/* Render Cameras */}
      {cameras.map((cam) => {
        const posX = cam.x / PIXELS_PER_FEET;
        const posZ = cam.y / PIXELS_PER_FEET;
        const posY = cam.height;
        const fovDegrees = calculateFOV(cam.focalLength);
        const fovRadians = (fovDegrees * Math.PI) / 180;
        const rotY = -(cam.rotation * Math.PI) / 180;
        const rotX = -((90 - cam.tilt) * Math.PI) / 180;

        return (
          <group key={cam.id} position={[posX, posY, posZ]} rotation={[0, rotY, 0]}>
            {cam.type === 'Dome' ? (
              <Sphere args={[0.4, 16, 16]} position={[0, -0.2, 0]}>
                <meshStandardMaterial color="#333" />
              </Sphere>
            ) : (
              <Cylinder args={[0.2, 0.2, 0.8, 16]} rotation={[Math.PI / 2, 0, 0]}>
                <meshStandardMaterial color="#f0f0f0" />
              </Cylinder>
            )}
            
            <Cylinder args={[0.05, 0.05, posY]} position={[0, -posY / 2, 0]}>
              <meshStandardMaterial color="#666" />
            </Cylinder>

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
  const [envObjects, setEnvObjects] = useState<EnvObject[]>([]);
  
  const [selectedItem, setSelectedItem] = useState<{ id: string; type: 'camera' | 'object' } | null>(null);
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
  const [isDragging, setIsDragging] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);

  const addCamera = () => {
    const newCam: CameraNode = {
      id: Math.random().toString(36).substring(2, 9),
      x: 300, y: 300, type: 'Dome', height: 10, tilt: 45, focalLength: 2.8, rotation: 0,
    };
    setCameras([...cameras, newCam]);
    setSelectedItem({ id: newCam.id, type: 'camera' });
  };

  const addObject = (type: EnvObjectType) => {
    const template = OBJECT_TEMPLATES[type];
    const newObj: EnvObject = {
      id: Math.random().toString(36).substring(2, 9),
      x: 350, y: 350,
      ...template
    };
    setEnvObjects([...envObjects, newObj]);
    setSelectedItem({ id: newObj.id, type: 'object' });
  };

  // Drag Handlers
  const handlePointerDown = (e: React.PointerEvent, id: string, type: 'camera' | 'object') => {
    if (viewMode !== '2D') return;
    e.stopPropagation();
    setSelectedItem({ id, type });
    setIsDragging(true);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !selectedItem || viewMode !== '2D' || !svgRef.current) return;
    
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return;
    
    const x = (e.clientX - CTM.e) / CTM.a;
    const y = (e.clientY - CTM.f) / CTM.d;

    if (selectedItem.type === 'camera') {
      setCameras(cams => cams.map(c => c.id === selectedItem.id ? { ...c, x, y } : c));
    } else {
      setEnvObjects(objs => objs.map(o => o.id === selectedItem.id ? { ...o, x, y } : o));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  // Update properties
  const updateSelectedCamera = (updates: Partial<CameraNode>) => {
    setCameras(cams => cams.map(c => c.id === selectedItem?.id ? { ...c, ...updates } : c));
  };
  const updateSelectedObject = (updates: Partial<EnvObject>) => {
    setEnvObjects(objs => objs.map(o => o.id === selectedItem?.id ? { ...o, ...updates } : o));
  };

  const deleteItem = () => {
    if (!selectedItem) return;
    if (selectedItem.type === 'camera') {
      setCameras(cams => cams.filter(c => c.id !== selectedItem.id));
    } else {
      setEnvObjects(objs => objs.filter(o => o.id !== selectedItem.id));
    }
    setSelectedItem(null);
  };

  const selectedCam = selectedItem?.type === 'camera' ? cameras.find(c => c.id === selectedItem.id) : null;
  const selectedObj = selectedItem?.type === 'object' ? envObjects.find(o => o.id === selectedItem.id) : null;

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full bg-slate-50 text-slate-900 rounded-lg overflow-hidden border shadow-sm">
      {/* LEFT PANEL */}
      <div className="flex-1 relative bg-white overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between gap-2 items-start pointer-events-none">
          
          <div className="flex flex-col gap-2 pointer-events-auto">
            <button onClick={addCamera} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md shadow-md hover:bg-blue-700 transition w-max">
              <Camera size={18} /><span>ক্যামেরা (Camera)</span>
            </button>
            <div className="bg-white p-2 rounded-md shadow-md border flex flex-col gap-1 w-max">
              <span className="text-xs font-semibold text-slate-500 mb-1">পরিবেশ উপাদান (Environment)</span>
              {Object.values(OBJECT_TEMPLATES).map((template) => (
                <button
                  key={template.type}
                  onClick={() => addObject(template.type)}
                  className="text-left px-3 py-1.5 text-sm rounded hover:bg-slate-100 transition flex items-center gap-2"
                >
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: template.color }}></div>
                  {template.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-md shadow-md flex border p-1 pointer-events-auto">
            <button onClick={() => setViewMode('2D')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${viewMode === '2D' ? 'bg-slate-100 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}>
              <LayoutGrid size={16} className="inline mr-2" /> 2D Plan
            </button>
            <button onClick={() => setViewMode('3D')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-2 ${viewMode === '3D' ? 'bg-slate-100 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}>
              <BoxIcon size={16} /> 3D Preview
            </button>
          </div>
        </div>

        {/* View Area */}
        <div className="flex-1 w-full h-full cursor-crosshair">
          {viewMode === '2D' ? (
            <svg
              ref={svgRef}
              className="w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onClick={() => setSelectedItem(null)}
            >
              {/* Draw Env Objects */}
              {envObjects.map((obj) => {
                const isSelected = selectedItem?.id === obj.id;
                const w = obj.width * PIXELS_PER_FEET;
                const h = obj.depth * PIXELS_PER_FEET;
                return (
                  <g
                    key={obj.id}
                    transform={`translate(${obj.x}, ${obj.y}) rotate(${obj.rotation})`}
                    onPointerDown={(e) => handlePointerDown(e, obj.id, 'object')}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <rect
                      x={-w/2} y={-h/2}
                      width={w} height={h}
                      fill={obj.color}
                      stroke={isSelected ? '#3b82f6' : '#ffffff'}
                      strokeWidth={isSelected ? 3 : 1}
                      className="shadow-sm transition-all"
                    />
                    {/* Direction Indicator */}
                    <line x1={0} y1={0} x2={w/2} y2={0} stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeDasharray="2,2" className="pointer-events-none" />
                  </g>
                );
              })}

              {/* Draw Cameras */}
              {cameras.map((cam) => {
                const isSelected = selectedItem?.id === cam.id;
                const fovDegrees = calculateFOV(cam.focalLength);
                const range = VISUAL_RANGE_FEET * PIXELS_PER_FEET;
                const halfAngleRad = (fovDegrees / 2) * (Math.PI / 180);
                const rotRad = (cam.rotation * Math.PI) / 180;

                const p1 = { x: cam.x, y: cam.y };
                const p2 = { x: cam.x + range * Math.cos(rotRad - halfAngleRad), y: cam.y + range * Math.sin(rotRad - halfAngleRad) };
                const p3 = { x: cam.x + range * Math.cos(rotRad + halfAngleRad), y: cam.y + range * Math.sin(rotRad + halfAngleRad) };

                return (
                  <g key={cam.id}>
                    <polygon
                      points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
                      fill={isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(156, 163, 175, 0.15)'}
                      stroke={isSelected ? '#3b82f6' : '#9ca3af'}
                      strokeWidth="1"
                      className="pointer-events-none transition-all duration-300"
                    />
                    <g
                      transform={`translate(${cam.x}, ${cam.y})`}
                      onPointerDown={(e) => handlePointerDown(e, cam.id, 'camera')}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <circle r={12} fill="white" stroke={isSelected ? '#2563eb' : '#4b5563'} strokeWidth={isSelected ? 3 : 2} className="shadow-sm transition-all" />
                      <Camera size={14} x={-7} y={-7} color={isSelected ? '#2563eb' : '#4b5563'} className="pointer-events-none" />
                    </g>
                  </g>
                );
              })}
            </svg>
          ) : (
            <div className="w-full h-full bg-slate-900">
              <Canvas camera={{ position: [0, 20, 30], fov: 50 }}>
                <Scene3D cameras={cameras} envObjects={envObjects} />
              </Canvas>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Properties */}
      <div className="w-80 bg-white border-l shadow-xl flex flex-col z-20">
        <div className="p-4 border-b bg-slate-50 flex items-center gap-2">
          <Settings2 size={20} className="text-slate-600" />
          <h2 className="font-semibold text-lg">Properties</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!selectedItem ? (
            <div className="text-center text-slate-500 mt-10 flex flex-col items-center">
              <Crosshair size={48} className="text-slate-300 mb-4" />
              <p>Select an item on the canvas to configure it.</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* CAMERA PROPERTIES */}
              {selectedCam && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Camera Type</label>
                    <div className="flex gap-2">
                      <button onClick={() => updateSelectedCamera({ type: 'Dome' })} className={`flex-1 py-2 rounded border text-sm font-medium ${selectedCam.type === 'Dome' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}>Dome</button>
                      <button onClick={() => updateSelectedCamera({ type: 'Bullet' })} className={`flex-1 py-2 rounded border text-sm font-medium ${selectedCam.type === 'Bullet' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}>Bullet</button>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700">Lens (Focal Length)</label>
                      <span className="text-xs font-mono bg-slate-100 px-1 rounded">{selectedCam.focalLength} mm</span>
                    </div>
                    <input type="range" min="2.8" max="12" step="0.1" value={selectedCam.focalLength} onChange={(e) => updateSelectedCamera({ focalLength: parseFloat(e.target.value) })} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700">Rotation (Pan)</label>
                      <span className="text-xs font-mono bg-slate-100 px-1 rounded">{selectedCam.rotation}&deg;</span>
                    </div>
                    <input type="range" min="0" max="360" value={selectedCam.rotation} onChange={(e) => updateSelectedCamera({ rotation: parseInt(e.target.value) })} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700">Height</label>
                      <span className="text-xs font-mono bg-slate-100 px-1 rounded">{selectedCam.height} ft</span>
                    </div>
                    <input type="range" min="5" max="30" value={selectedCam.height} onChange={(e) => updateSelectedCamera({ height: parseInt(e.target.value) })} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700">Tilt</label>
                      <span className="text-xs font-mono bg-slate-100 px-1 rounded">{selectedCam.tilt}&deg;</span>
                    </div>
                    <input type="range" min="0" max="90" value={selectedCam.tilt} onChange={(e) => updateSelectedCamera({ tilt: parseInt(e.target.value) })} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                  </div>
                </>
              )}

              {/* OBJECT PROPERTIES */}
              {selectedObj && (
                <>
                  <div className="bg-slate-100 p-2 rounded text-sm font-semibold text-slate-700 mb-4">{selectedObj.label}</div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700">Rotation</label>
                      <span className="text-xs font-mono bg-slate-100 px-1 rounded">{selectedObj.rotation}&deg;</span>
                    </div>
                    <input type="range" min="0" max="360" value={selectedObj.rotation} onChange={(e) => updateSelectedObject({ rotation: parseInt(e.target.value) })} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700">Width (ft)</label>
                      <span className="text-xs font-mono bg-slate-100 px-1 rounded">{selectedObj.width}</span>
                    </div>
                    <input type="range" min="1" max="20" step="0.5" value={selectedObj.width} onChange={(e) => updateSelectedObject({ width: parseFloat(e.target.value) })} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700">Depth (ft)</label>
                      <span className="text-xs font-mono bg-slate-100 px-1 rounded">{selectedObj.depth}</span>
                    </div>
                    <input type="range" min="0.5" max="20" step="0.5" value={selectedObj.depth} onChange={(e) => updateSelectedObject({ depth: parseFloat(e.target.value) })} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700">Height (ft)</label>
                      <span className="text-xs font-mono bg-slate-100 px-1 rounded">{selectedObj.height}</span>
                    </div>
                    <input type="range" min="1" max="20" step="0.5" value={selectedObj.height} onChange={(e) => updateSelectedObject({ height: parseFloat(e.target.value) })} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                  </div>
                </>
              )}

              <div className="pt-6 border-t border-slate-100">
                <button
                  onClick={deleteItem}
                  className="w-full flex justify-center items-center gap-2 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition font-medium text-sm border border-red-200"
                >
                  <Trash2 size={16} /> Delete Selected Item
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
