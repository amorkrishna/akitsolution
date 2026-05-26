import { useMemo } from "react";
import * as THREE from "three";
import type { CameraPlacement } from "@/stores/cameraPlannerStore";

interface CoverageZoneProps {
  camera: CameraPlacement;
  roomHeight: number;
}

export function CoverageZone({ camera, roomHeight: _roomHeight }: CoverageZoneProps) {
  const { position, rotationY, rotationX, fovH, fovV, range, color } = camera;

  // Build a frustum cone geometry from camera specs
  const geometry = useMemo(() => {
    const hHalf = THREE.MathUtils.degToRad(fovH / 2);
    const vHalf = THREE.MathUtils.degToRad(fovV / 2);

    // Base radius of the cone at maximum range
    const baseRadiusH = Math.tan(hHalf) * range;
    const baseRadiusV = Math.tan(vHalf) * range;
    const baseRadius = Math.max(baseRadiusH, baseRadiusV);

    const segments = 32;
    const geo = new THREE.ConeGeometry(baseRadius, range, segments, 1, true);
    // Pivot so the tip is at origin and cone opens along +Y
    geo.translate(0, -range / 2, 0);
    return geo;
  }, [fovH, fovV, range]);

  // Rotate so the cone faces the camera's look direction
  // Camera looks -Z by default; rotateX to aim downward, rotateY for horizontal aim
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    // Start pointing down (-Y to +Z conversion)
    q.setFromEuler(new THREE.Euler(rotationX - Math.PI / 2, rotationY, 0, "YXZ"));
    return q;
  }, [rotationY, rotationX]);

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [color]
  );

  const wireMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.3,
        wireframe: true,
        depthWrite: false,
      }),
    [color]
  );

  return (
    <group position={position} quaternion={quaternion}>
      {/* Solid fill */}
      <mesh geometry={geometry} material={material} />
      {/* Wireframe outline */}
      <mesh geometry={geometry} material={wireMaterial} />
    </group>
  );
}
