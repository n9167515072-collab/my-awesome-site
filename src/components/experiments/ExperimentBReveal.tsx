"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

import aliceMacro from "../../../assets/prototype/03-alice-macro-prototype.png";
import aliceBoxCrop from "../../../assets/experiments/cards/alice-box.png";

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}
function segment(p: number, a: number, b: number) {
  return clamp01((p - a) / (b - a));
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

type ProgressRef = { current: number };

function HeroCard({ progress }: { progress: ProgressRef }) {
  const frontTex = useTexture(aliceMacro.src);
  const group = useRef<THREE.Group>(null);

  const materials = useMemo(() => {
    const edge = new THREE.MeshStandardMaterial({ color: "#efe6d3", roughness: 0.55, metalness: 0.05 });
    const back = new THREE.MeshStandardMaterial({ color: "#1c1a17", roughness: 0.85 });
    const front = new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.45 });
    return [edge, edge, edge, edge, front, back];
  }, [frontTex]);

  useFrame(({ camera }) => {
    const p = progress.current;
    const z = lerp(0.34, 3.5, segment(p, 0, 0.85));
    const x = lerp(0, 1.15, segment(p, 0.32, 0.78));
    const y = lerp(0, 0.4, segment(p, 0.32, 0.78));
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);

    if (group.current) {
      group.current.rotation.y = lerp(0, -0.5, segment(p, 0.35, 0.92));
    }
  });

  return (
    <group ref={group}>
      <mesh material={materials}>
        <boxGeometry args={[1.4, 2, 0.055]} />
      </mesh>
    </group>
  );
}

function StackAndBox({ progress }: { progress: ProgressRef }) {
  const boxTex = useTexture(aliceBoxCrop.src);
  const boxMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const cardMatRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);

  useFrame(() => {
    const p = progress.current;
    const stackT = segment(p, 0.68, 0.95);
    cardMatRefs.current.forEach((m) => {
      if (m) m.opacity = 0.85 * stackT;
    });
    if (boxMatRef.current) boxMatRef.current.opacity = 0.45 * segment(p, 0.82, 1);
  });

  return (
    <group>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0.14 * (i + 1), -0.1 * (i + 1), -0.05 * (i + 1) - 0.03]}>
          <boxGeometry args={[1.4, 2, 0.05]} />
          <meshStandardMaterial
            ref={(el) => {
              cardMatRefs.current[i] = el;
            }}
            color="#e9ddc4"
            transparent
            opacity={0}
            roughness={0.6}
          />
        </mesh>
      ))}
      <mesh position={[0.6, -0.3, -1.6]} rotation={[0, 0.3, -0.05]}>
        <planeGeometry args={[1.7, 2.2]} />
        <meshStandardMaterial ref={boxMatRef} map={boxTex} transparent opacity={0} roughness={0.6} />
      </mesh>
    </group>
  );
}

function Scene({ progress }: { progress: ProgressRef }) {
  return (
    <>
      <color attach="background" args={["#0a0908"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[2, 2, 3]} intensity={1.1} />
      <directionalLight position={[-2, -1, -2]} intensity={0.3} />
      <HeroCard progress={progress} />
      <StackAndBox progress={progress} />
    </>
  );
}

export function ExperimentBReveal() {
  const trackRef = useRef<HTMLDivElement>(null);
  const progress = useRef(0);

  useEffect(() => {
    function update() {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      progress.current = clamp01(-rect.top / (scrollable || 1));
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div ref={trackRef} className="relative h-[420vh] w-full bg-[#0a0908]">
      <div className="sticky top-0 h-dvh w-full overflow-hidden">
        <Canvas camera={{ fov: 42, near: 0.01, far: 20 }} dpr={[1, 2]}>
          <Scene progress={progress} />
        </Canvas>

        <p className="pointer-events-none absolute left-6 top-6 text-[10px] font-medium tracking-[0.3em] text-white/40 sm:left-10 sm:top-8">
          EXPERIMENT B — ARTWORK BECOMES OBJECT
        </p>
        <p className="pointer-events-none absolute bottom-6 right-6 text-[10px] font-medium tracking-[0.2em] text-white/30 sm:bottom-8 sm:right-10">
          ↓ SCROLL
        </p>
      </div>
    </div>
  );
}
