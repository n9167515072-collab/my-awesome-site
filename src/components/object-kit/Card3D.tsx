"use client";

import { useMemo, useRef } from "react";
import { useFrame, type ThreeElements, type ThreeEvent } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { StaticImageData } from "next/image";

import { createRoundedCardGeometry } from "@/lib/three/card-geometry";

export type Card3DProps = {
  frontTexture: StaticImageData;
  backTexture: StaticImageData;
  tint?: string;
  flipped: boolean;
  width?: number;
  height?: number;
  thickness?: number;
  radius?: number;
  interactive?: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onHoverChange?: (hovered: boolean) => void;
} & Omit<ThreeElements["group"], "onClick" | "onPointerOver" | "onPointerOut">;

/**
 * A single physical card: rounded silhouette, real thickness, a beveled
 * edge, independent front/back textures, and a click-to-flip-ready surface.
 * Flip and hover are driven by the `flipped`/`onHoverChange` contract so a
 * parent (DeckStack3D, or a test harness) owns what a click *means* —
 * fan a stack, select a card, or flip it — while this component only knows
 * how to look and feel like a card.
 */
export function Card3D({
  frontTexture,
  backTexture,
  tint,
  flipped,
  width = 0.86,
  height = 1.24,
  thickness = 0.028,
  radius = 0.055,
  interactive = true,
  onClick,
  onHoverChange,
  ...groupProps
}: Card3DProps) {
  const frontMap = useTexture(frontTexture.src);
  const backMap = useTexture(backTexture.src);

  const geometry = useMemo(
    () => createRoundedCardGeometry(width, height, thickness, radius),
    [width, height, thickness, radius],
  );

  const materials = useMemo(() => {
    const edge = new THREE.MeshStandardMaterial({ color: "#efe6d3", roughness: 0.65, metalness: 0.02 });
    const back = new THREE.MeshStandardMaterial({
      map: backMap,
      color: tint ?? "#ffffff",
      roughness: 0.48,
      metalness: 0.02,
    });
    const front = new THREE.MeshStandardMaterial({
      map: frontMap,
      color: tint ?? "#ffffff",
      roughness: 0.48,
      metalness: 0.02,
    });
    // geometry.groups material indices: 0 = back cap, 1 = edge (side wall), 2 = front cap
    return [back, edge, front];
  }, [frontMap, backMap, tint]);

  const flipGroup = useRef<THREE.Group>(null);
  const hovered = useRef(false);

  useFrame(() => {
    if (!flipGroup.current) return;
    const target = flipped ? Math.PI : 0;
    flipGroup.current.rotation.y = THREE.MathUtils.lerp(flipGroup.current.rotation.y, target, 0.18);
    const liftTarget = hovered.current ? 1 : 0;
    const currentLift = flipGroup.current.userData.lift ?? 0;
    const nextLift = THREE.MathUtils.lerp(currentLift, liftTarget, 0.2);
    flipGroup.current.userData.lift = nextLift;
    flipGroup.current.scale.setScalar(1 + nextLift * 0.035);
  });

  function handlePointerOver(e: ThreeEvent<PointerEvent>) {
    if (!interactive) return;
    e.stopPropagation();
    hovered.current = true;
    onHoverChange?.(true);
  }
  function handlePointerOut(e: ThreeEvent<PointerEvent>) {
    if (!interactive) return;
    e.stopPropagation();
    hovered.current = false;
    onHoverChange?.(false);
  }
  function handleClick(e: ThreeEvent<MouseEvent>) {
    if (!interactive) return;
    e.stopPropagation();
    onClick?.(e);
  }

  return (
    <group {...groupProps}>
      <group ref={flipGroup} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut} onClick={handleClick}>
        <mesh geometry={geometry} material={materials} />
      </group>
    </group>
  );
}
