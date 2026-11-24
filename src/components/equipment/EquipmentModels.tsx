import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Low-poly procedural equipment models.
 * No .glb assets shipped with the project, so each category is built from
 * primitive Three.js geometry. Swap any of these for useLoader(GLTFLoader, ...)
 * later if real model files are added under /public/models.
 */

const bodyMaterialProps = { roughness: 0.45, metalness: 0.35 };

function Wheel({ position, radius = 0.5 }: { position: [number, number, number]; radius?: number }) {
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[radius, radius, 0.35, 20]} />
      <meshStandardMaterial color="#1f2937" roughness={0.9} />
    </mesh>
  );
}

function Tractor({ color = "#16a34a" }: { color?: string }) {
  return (
    <group position={[0, -0.3, 0]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[1.6, 0.7, 1]} />
        <meshStandardMaterial color={color} {...bodyMaterialProps} />
      </mesh>
      <mesh position={[-0.35, 1.15, 0]} castShadow>
        <boxGeometry args={[0.85, 0.55, 0.9]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.2} metalness={0.1} transparent opacity={0.75} />
      </mesh>
      <mesh position={[0.75, 0.5, 0]} castShadow>
        <boxGeometry args={[0.35, 0.35, 0.7]} />
        <meshStandardMaterial color="#111827" {...bodyMaterialProps} />
      </mesh>
      <Wheel position={[0.6, 0, 0.55]} radius={0.32} />
      <Wheel position={[0.6, 0, -0.55]} radius={0.32} />
      <Wheel position={[-0.55, 0.1, 0.62]} radius={0.5} />
      <Wheel position={[-0.55, 0.1, -0.62]} radius={0.5} />
    </group>
  );
}

function Harvester({ color = "#ca8a04" }: { color?: string }) {
  return (
    <group position={[0, -0.3, 0]}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[2, 0.9, 1.1]} />
        <meshStandardMaterial color={color} {...bodyMaterialProps} />
      </mesh>
      <mesh position={[0.2, 1.35, 0]} castShadow>
        <boxGeometry args={[0.8, 0.6, 0.9]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.2} metalness={0.1} transparent opacity={0.75} />
      </mesh>
      <mesh position={[-1.15, 0.45, 0]} castShadow>
        <boxGeometry args={[0.4, 0.9, 1.3]} />
        <meshStandardMaterial color="#4b5563" {...bodyMaterialProps} />
      </mesh>
      <Wheel position={[0.7, -0.1, 0.65]} radius={0.55} />
      <Wheel position={[0.7, -0.1, -0.65]} radius={0.55} />
      <Wheel position={[-0.6, -0.1, 0.65]} radius={0.55} />
      <Wheel position={[-0.6, -0.1, -0.65]} radius={0.55} />
    </group>
  );
}

function IrrigationPump({ color = "#0ea5e9" }: { color?: string }) {
  return (
    <group position={[0, -0.3, 0]}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[1.1, 0.6, 0.8]} />
        <meshStandardMaterial color="#374151" {...bodyMaterialProps} />
      </mesh>
      <mesh position={[0, 0.85, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 0.5, 24]} />
        <meshStandardMaterial color={color} {...bodyMaterialProps} />
      </mesh>
      <mesh position={[0.7, 0.85, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.6, 16]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.3} />
      </mesh>
      {[[-0.4, 0, 0.3], [0.4, 0, 0.3], [-0.4, 0, -0.3], [0.4, 0, -0.3]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <boxGeometry args={[0.12, 0.35, 0.12]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      ))}
    </group>
  );
}

function Rotavator({ color = "#f97316" }: { color?: string }) {
  return (
    <group position={[0, -0.3, 0]}>
      <mesh position={[0, 0.55, 0.2]} castShadow>
        <boxGeometry args={[1.3, 0.4, 0.5]} />
        <meshStandardMaterial color={color} {...bodyMaterialProps} />
      </mesh>
      <mesh position={[0, 0.35, -0.35]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 1.3, 16]} />
        <meshStandardMaterial color="#1f2937" {...bodyMaterialProps} />
      </mesh>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[-0.55 + i * 0.22, 0.35, -0.35]} castShadow>
          <boxGeometry args={[0.05, 0.4, 0.4]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      <Wheel position={[0.55, 0, 0.6]} radius={0.3} />
      <Wheel position={[0.55, 0, -0.6]} radius={0.3} />
    </group>
  );
}

function SeedDrill({ color = "#7c3aed" }: { color?: string }) {
  return (
    <group position={[0, -0.3, 0]}>
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[1.4, 0.7, 0.55]} />
        <meshStandardMaterial color={color} {...bodyMaterialProps} />
      </mesh>
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} position={[-0.55 + i * 0.28, 0.25, 0]} castShadow>
          <coneGeometry args={[0.08, 0.35, 8]} />
          <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      <Wheel position={[0.6, 0, 0.45]} radius={0.28} />
      <Wheel position={[0.6, 0, -0.45]} radius={0.28} />
      <Wheel position={[-0.6, 0, 0.45]} radius={0.28} />
      <Wheel position={[-0.6, 0, -0.45]} radius={0.28} />
    </group>
  );
}

function Sprayer({ color = "#2563eb" }: { color?: string }) {
  return (
    <group position={[0, -0.3, 0]}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <sphereGeometry args={[0.55, 20, 20]} />
        <meshStandardMaterial color={color} {...bodyMaterialProps} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[1.3, 0.25, 0.6]} />
        <meshStandardMaterial color="#1f2937" {...bodyMaterialProps} />
      </mesh>
      <mesh position={[0.85, 0.55, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 1.1, 8]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.6} roughness={0.3} />
      </mesh>
      <Wheel position={[0.55, -0.1, 0.32]} radius={0.26} />
      <Wheel position={[0.55, -0.1, -0.32]} radius={0.26} />
      <Wheel position={[-0.55, -0.1, 0.32]} radius={0.26} />
      <Wheel position={[-0.55, -0.1, -0.32]} radius={0.26} />
    </group>
  );
}

const categoryModelMap: Record<string, (props: { color?: string }) => JSX.Element> = {
  Tractor: Tractor,
  Harvester: Harvester,
  Irrigation: IrrigationPump,
  Pump: IrrigationPump,
  Tillage: Rotavator,
  Rotavator: Rotavator,
  Seeding: SeedDrill,
  "Seed Drill": SeedDrill,
  Sprayer: Sprayer,
};

export function RotatingEquipment({ category, color }: { category: string; color?: string }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.6;
    }
  });

  const Model = categoryModelMap[category] ?? Tractor;

  return (
    <group ref={groupRef}>
      <Model color={color} />
    </group>
  );
}

export default RotatingEquipment;
