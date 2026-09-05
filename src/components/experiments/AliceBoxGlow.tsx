"use client";

import { useMemo, useRef } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";

import { TarotBox3D } from "@/components/object-kit/TarotBox3D";
import type { DeckConfig } from "@/components/object-kit/deck-config";
import { makeGlowTexture } from "./glowTexture";

export type AliceBoxGlowProps = {
  deck: DeckConfig;
  interactive?: boolean;
  /** 0..1 — internal light leaking through the seam and top corners, before the burst. */
  pressureRef: React.RefObject<number>;
  /** 0..1 — the light intensifying toward the burst; also lifts the interior point light hard. */
  burstRef: React.RefObject<number>;
};

/**
 * The Alice box, completely intact — plain TarotBox3D, never hinged or
 * split — with a light glowing from within it: an interior point light plus
 * seam and top-corner glow decals. The box is a stable, undamaged object;
 * only the light escaping it changes.
 */
export function AliceBoxGlow({ deck, interactive = true, pressureRef, burstRef, ...groupProps }: AliceBoxGlowProps & ThreeElements["group"]) {
  const { size } = deck.box;
  const lightRef = useRef<THREE.PointLight>(null);
  const seamY = size.h / 2 - 0.05;

  useFrame(() => {
    if (lightRef.current) {
      lightRef.current.intensity = pressureRef.current * 1.1 + burstRef.current * 6;
    }
  });

  return (
    <group {...groupProps}>
      <TarotBox3D deck={deck} interactive={interactive} />
      <pointLight ref={lightRef} position={[0, size.h * 0.25, 0]} color="#ffdca8" intensity={0} distance={4.5} decay={2} />
      <SeamGlow seamY={seamY} size={size} pressureRef={pressureRef} burstRef={burstRef} />
    </group>
  );
}

/**
 * A narrow bright line along the closed top seam — never a round glow or
 * corner blobs, which read as a halo. It starts as a thin bright thread and
 * thickens/brightens as the internal light intensifies toward the burst.
 */
function SeamGlow({
  seamY,
  size,
  pressureRef,
  burstRef,
}: {
  seamY: number;
  size: { w: number; d: number };
  pressureRef: React.RefObject<number>;
  burstRef: React.RefObject<number>;
}) {
  const stripRef = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => makeGlowTexture(), []);

  useFrame(({ camera }) => {
    const level = Math.min(1, pressureRef.current + burstRef.current * 0.6);
    if (stripRef.current) {
      stripRef.current.quaternion.copy(camera.quaternion);
      // thin bright thread -> a thicker band as intensity rises
      stripRef.current.scale.set(size.w * (0.78 + burstRef.current * 0.12), 0.05 + level * 0.16 + burstRef.current * 0.3, 1);
      (stripRef.current.material as THREE.MeshBasicMaterial).opacity = level * 0.95;
    }
  });

  return (
    <mesh ref={stripRef} position={[0, seamY, size.d / 2 + 0.02]} scale={[size.w * 0.78, 0.05, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0} />
    </mesh>
  );
}
