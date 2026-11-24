import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment } from "@react-three/drei";
import { RotatingEquipment } from "./EquipmentModels";
import { Loader2 } from "lucide-react";

function ViewerFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
    </div>
  );
}

interface Equipment3DViewerProps {
  category: string;
  accentColor?: string;
  className?: string;
}

export default function Equipment3DViewer({ category, accentColor, className }: Equipment3DViewerProps) {
  return (
    <div className={className ?? "h-72 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-emerald-50"}>
      <Canvas shadows camera={{ position: [2.6, 1.6, 2.6], fov: 40 }} dpr={[1, 1.5]}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[3, 4, 2]}
            intensity={1.1}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <RotatingEquipment category={category} color={accentColor} />
          <ContactShadows position={[0, -0.62, 0]} opacity={0.45} scale={5} blur={2} far={2} />
          <Environment preset="city" />
          <OrbitControls
            enablePan={false}
            minDistance={2}
            maxDistance={5}
            maxPolarAngle={Math.PI / 2.05}
            autoRotate={false}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
