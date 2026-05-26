import { useRef, useCallback } from "react";
import { Grid, OrbitControls, PerspectiveCamera, Environment, GizmoHelper, GizmoViewport } from "@react-three/drei";
import * as THREE from "three";
import { useCameraPlannerStore } from "@/stores/cameraPlannerStore";
import { CameraMarker } from "./CameraMarker";
import { CoverageZone } from "./CoverageZone";
import type { ThreeEvent } from "@react-three/fiber";

let cameraCounter = 1;

export function RoomScene() {
  const {
    room,
    cameras,
    selectedId,
    placingMode,
    showCoverage,
    showGrid,
    showLabels,
    addCamera,
    selectCamera,
  } = useCameraPlannerStore();

  const orbitRef = useRef<any>(null);

  const { width: W, length: L, height: H } = room;

  // Floor click handler — place camera on click when in placing mode
  const handleFloorClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (!placingMode) return;
      e.stopPropagation();
      const { x, z } = e.point;
      addCamera({
        name: `Camera ${cameraCounter++}`,
        type: "dome",
        position: [x, H, z],          // mounted at ceiling height
        rotationY: 0,
        rotationX: Math.PI / 4,        // 45° tilt
        fovH: 90,
        fovV: 60,
        range: 6,
        mountPosition: "ceiling",
        color: "#3b82f6",
      });
    },
    [placingMode, addCamera, H]
  );

  // Wall click handlers
  const makeWallClickHandler = (
    axis: "front" | "back" | "left" | "right",
    wallY: number
  ) =>
    (e: ThreeEvent<MouseEvent>) => {
      if (!placingMode) return;
      e.stopPropagation();
      const pt = e.point;
      let position: [number, number, number];
      let rotY = 0;

      switch (axis) {
        case "front":  position = [pt.x, Math.min(pt.y, H - 0.2), L / 2];  rotY = Math.PI; break;
        case "back":   position = [pt.x, Math.min(pt.y, H - 0.2), -L / 2]; rotY = 0; break;
        case "left":   position = [-W / 2, Math.min(pt.y, H - 0.2), pt.z]; rotY = Math.PI / 2; break;
        case "right":  position = [W / 2, Math.min(pt.y, H - 0.2), pt.z];  rotY = -Math.PI / 2; break;
        default: return;
      }

      addCamera({
        name: `Camera ${cameraCounter++}`,
        type: "bullet",
        position,
        rotationY: rotY,
        rotationX: Math.PI / 6,
        fovH: 80,
        fovV: 55,
        range: 8,
        mountPosition: "wall",
        color: "#10b981",
      });
      void wallY; // suppress unused warning
    };

  return (
    <>
      {/* Camera rig */}
      <PerspectiveCamera makeDefault fov={50} position={[W * 0.9, H * 2.5, L * 1.5]} near={0.1} far={500} />
      <OrbitControls
        ref={orbitRef}
        target={[0, H / 2, 0]}
        maxPolarAngle={Math.PI / 1.8}
        minDistance={2}
        maxDistance={50}
        enableDamping
        dampingFactor={0.05}
      />

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[W, H * 3, L]} intensity={1} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[0, H - 0.2, 0]} intensity={0.5} color="#fffbe6" />
      <Environment preset="city" background={false} />

      {/* Gizmo */}
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport axisColors={["#e74c3c", "#2ecc71", "#3498db"]} labelColor="white" />
      </GizmoHelper>

      {/* ── Room Geometry ── */}
      {/* Floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onClick={handleFloorClick}
      >
        <planeGeometry args={[W, L]} />
        <meshStandardMaterial
          color="#1e293b"
          roughness={0.9}
          metalness={0.1}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Ceiling (transparent) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}>
        <planeGeometry args={[W, L]} />
        <meshStandardMaterial color="#334155" transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>

      {/* Front wall (z = L/2) */}
      <mesh position={[0, H / 2, L / 2]} onClick={makeWallClickHandler("front", H / 2)}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#334155" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>

      {/* Back wall (z = -L/2) */}
      <mesh position={[0, H / 2, -L / 2]} rotation={[0, Math.PI, 0]} onClick={makeWallClickHandler("back", H / 2)}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#334155" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>

      {/* Left wall (x = -W/2) */}
      <mesh position={[-W / 2, H / 2, 0]} rotation={[0, Math.PI / 2, 0]} onClick={makeWallClickHandler("left", H / 2)}>
        <planeGeometry args={[L, H]} />
        <meshStandardMaterial color="#334155" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>

      {/* Right wall (x = W/2) */}
      <mesh position={[W / 2, H / 2, 0]} rotation={[0, -Math.PI / 2, 0]} onClick={makeWallClickHandler("right", H / 2)}>
        <planeGeometry args={[L, H]} />
        <meshStandardMaterial color="#334155" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>

      {/* Room edge wireframe */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(W, H, L)]} />
        <lineBasicMaterial color="#4f6ef7" transparent opacity={0.6} />
      </lineSegments>
      {/* Position the box correctly centered at H/2 */}
      <group position={[0, H / 2, 0]}>
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(W, H, L)]} />
          <lineBasicMaterial color="#4f6ef7" transparent opacity={0.7} />
        </lineSegments>
      </group>

      {/* Grid on floor */}
      {showGrid && (
        <Grid
          position={[0, 0.001, 0]}
          args={[W, L]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#3b82f6"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#6366f1"
          fadeDistance={60}
          fadeStrength={1.5}
          infiniteGrid={false}
        />
      )}

      {/* Coverage zones */}
      {showCoverage &&
        cameras.map((cam) => (
          <CoverageZone key={`cov-${cam.id}`} camera={cam} roomHeight={H} />
        ))}

      {/* Camera markers */}
      {cameras.map((cam) => (
        <CameraMarker key={cam.id} camera={cam} showLabels={showLabels} />
      ))}

      {/* Deselect on background click */}
      <mesh
        visible={false}
        position={[0, H / 2, 0]}
        onClick={(e) => {
          e.stopPropagation();
          if (selectedId) selectCamera(null);
        }}
      >
        <boxGeometry args={[W + 10, H + 10, L + 10]} />
        <meshBasicMaterial side={THREE.BackSide} />
      </mesh>
    </>
  );
}
