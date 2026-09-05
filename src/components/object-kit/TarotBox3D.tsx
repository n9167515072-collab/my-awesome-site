"use client";

import { useMemo, useRef } from "react";
import { useFrame, type ThreeElements, type ThreeEvent } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

import type { DeckConfig } from "./deck-config";

export type TarotBox3DProps = {
  deck: DeckConfig;
  interactive?: boolean;
} & ThreeElements["group"];

/**
 * A plain box, textured with whichever real product faces exist and a flat
 * neutral color everywhere else — see deck.box.placeholderFaces for exactly
 * which sides are which. This never invents a box design; a placeholder
 * face is just an unmarked, uniformly-lit panel, not a guess at real
 * artwork.
 */
export function TarotBox3D({ deck, interactive = true, ...groupProps }: TarotBox3DProps) {
  const { faces, size } = deck.box;
  const realUrls = useMemo(
    () =>
      faces
        .map((face, i) => (face.kind === "real" ? { i, url: face.texture.src } : null))
        .filter((v): v is { i: number; url: string } => v !== null),
    [faces],
  );
  const loadedTextures = useTexture(realUrls.map((r) => r.url));

  const materials = useMemo(() => {
    return faces.map((face, i) => {
      if (face.kind === "real") {
        const slot = realUrls.findIndex((r) => r.i === i);
        const map = Array.isArray(loadedTextures) ? loadedTextures[slot] : loadedTextures;
        return new THREE.MeshStandardMaterial({ map, roughness: 0.62, metalness: 0.02 });
      }
      return new THREE.MeshStandardMaterial({ color: face.color, roughness: 0.85, metalness: 0 });
    });
  }, [faces, loadedTextures, realUrls]);

  const groupRef = useRef<THREE.Group>(null);
  const hovered = useRef(false);

  const BASE_YAW = 0.5;
  const BASE_PITCH = -0.14;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const idleBob = interactive ? Math.sin(clock.elapsedTime * 0.7) * 0.03 : 0;
    const targetYaw = BASE_YAW + (hovered.current ? 0.22 : 0);
    groupRef.current.position.y = idleBob;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetYaw, 0.08);
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, BASE_PITCH, 0.08);
  });

  function handlePointerOver(e: ThreeEvent<PointerEvent>) {
    if (!interactive) return;
    e.stopPropagation();
    hovered.current = true;
  }
  function handlePointerOut(e: ThreeEvent<PointerEvent>) {
    if (!interactive) return;
    e.stopPropagation();
    hovered.current = false;
  }

  return (
    <group {...groupProps}>
      <group ref={groupRef} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
        <mesh material={materials}>
          <boxGeometry args={[size.w, size.h, size.d]} />
        </mesh>
      </group>
    </group>
  );
}
