import { useRef } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { CameraPlacement } from "@/stores/cameraPlannerStore";
import { useCameraPlannerStore } from "@/stores/cameraPlannerStore";

interface CameraMarkerProps {
  camera: CameraPlacement;
  showLabels: boolean;
}

const DOME_GEO = new THREE.SphereGeometry(0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
const BULLET_GEO = new THREE.CylinderGeometry(0.06, 0.06, 0.3, 10);
const PTZ_GEO = new THREE.SphereGeometry(0.15, 12, 12);
const FISHEYE_GEO = new THREE.SphereGeometry(0.18, 12, 12);

function cameraGeometry(type: CameraPlacement["type"]) {
  switch (type) {
    case "dome": return DOME_GEO;
    case "bullet": return BULLET_GEO;
    case "ptz": return PTZ_GEO;
    case "fisheye": return FISHEYE_GEO;
    default: return DOME_GEO;
  }
}

export function CameraMarker({ camera, showLabels }: CameraMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { selectedId, selectCamera } = useCameraPlannerStore();
  const isSelected = selectedId === camera.id;

  const material = new THREE.MeshStandardMaterial({
    color: camera.color,
    emissive: isSelected ? camera.color : "#000000",
    emissiveIntensity: isSelected ? 0.5 : 0,
    roughness: 0.3,
    metalness: 0.7,
  });

  return (
    <group
      position={camera.position}
      rotation={[camera.rotationX, camera.rotationY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        selectCamera(isSelected ? null : camera.id);
      }}
    >
      {/* Camera body */}
      <mesh ref={meshRef} geometry={cameraGeometry(camera.type)} material={material} castShadow>
        {isSelected && (
          <lineSegments>
            <edgesGeometry args={[cameraGeometry(camera.type)]} />
            <lineBasicMaterial color="#ffffff" linewidth={2} />
          </lineSegments>
        )}
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.22, 0.26, 32]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} transparent opacity={0.8} />
        </mesh>
      )}

      {/* Label */}
      {showLabels && (
        <Html
          distanceFactor={10}
          position={[0, 0.35, 0]}
          center
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              background: isSelected ? camera.color : "rgba(0,0,0,0.75)",
              color: "#fff",
              fontSize: "10px",
              fontFamily: "Inter, sans-serif",
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: "4px",
              whiteSpace: "nowrap",
              border: isSelected ? "1px solid #fff" : "none",
            }}
          >
            📷 {camera.name}
          </div>
        </Html>
      )}
    </group>
  );
}
