"use client";

import { useMemo, useRef } from "react";
import { useFrame, type ThreeElements, type ThreeEvent } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

import type { BoxFaceSource, DeckConfig } from "./deck-config";

export type TarotBox3DProps = {
  deck: DeckConfig;
  interactive?: boolean;
  /**
   * A ref (not a plain prop) so the lid can animate every frame without
   * forcing React re-renders — 0 = closed (default: no ref given, box is a
   * static single solid box, as used by /object-test). Animating .current
   * 0→1 hinges the lid (top half) open around its back-bottom edge, like a
   * flip-top lid, while the base stays put. Internally the box is always
   * two flush halves; at 0 they align seamlessly.
   */
  openProgress?: React.RefObject<number>;
};

const INSIDE_COLOR = "#e9ddc4"; // plain cardboard-interior tone, not a real photographed surface

function facesToHalfMaterials(faces: DeckConfig["box"]["faces"], half: "top" | "bottom", loadedByUrl: Map<string, THREE.Texture>) {
  // BoxGeometry order: [+x right, -x left, +y top, -y bottom, +z front, -z back]
  return faces.map((face, i) => {
    if (face.kind === "real") {
      const base = loadedByUrl.get(face.texture.src);
      if (!base) return new THREE.MeshStandardMaterial({ color: "#666", roughness: 0.7 });
      const tex = base.clone();
      tex.needsUpdate = true;
      tex.repeat.set(1, 0.5);
      tex.offset.set(0, half === "top" ? 0.5 : 0);
      return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62, metalness: 0.02 });
    }
    // the +y/-y caps (indices 2 top-of-lid, 3 bottom-of-base) are the seam
    // faces — hidden when closed, visible as the box's (unphotographed)
    // interior once open. Never a real texture; a plain interior tone.
    const isSeamCap = (half === "top" && i === 3) || (half === "bottom" && i === 2);
    return new THREE.MeshStandardMaterial({
      color: isSeamCap ? INSIDE_COLOR : (face as Extract<BoxFaceSource, { kind: "placeholder" }>).color,
      roughness: isSeamCap ? 0.75 : 0.85,
    });
  });
}

/**
 * A plain box, textured with whichever real product faces exist and a flat
 * neutral color everywhere else — see deck.box.placeholderFaces for exactly
 * which sides are which. This never invents a box design; a placeholder
 * face is just an unmarked, uniformly-lit panel, not a guess at real
 * artwork. Optionally opens like a flip-top lid via `openProgress`.
 */
export function TarotBox3D({ deck, interactive = true, openProgress, ...groupProps }: TarotBox3DProps & ThreeElements["group"]) {
  const staticZero = useRef(0);
  const progressRef = openProgress ?? staticZero;
  const { faces, size } = deck.box;
  const realUrls = useMemo(() => faces.filter((f) => f.kind === "real").map((f) => (f as Extract<BoxFaceSource, { kind: "real" }>).texture.src), [faces]);
  const loaded = useTexture(realUrls);
  const loadedByUrl = useMemo(() => {
    const map = new Map<string, THREE.Texture>();
    const arr = Array.isArray(loaded) ? loaded : [loaded];
    realUrls.forEach((url, i) => map.set(url, arr[i]));
    return map;
  }, [loaded, realUrls]);

  const lidGeometry = useMemo(() => {
    const g = new THREE.BoxGeometry(size.w, size.h / 2, size.d);
    g.translate(0, size.h / 4, size.d / 2); // origin at back-bottom edge of the lid
    return g;
  }, [size.w, size.h, size.d]);
  const baseGeometry = useMemo(() => {
    const g = new THREE.BoxGeometry(size.w, size.h / 2, size.d);
    g.translate(0, -size.h / 4, 0);
    return g;
  }, [size.w, size.h, size.d]);

  const lidMaterials = useMemo(() => facesToHalfMaterials(faces, "top", loadedByUrl), [faces, loadedByUrl]);
  const baseMaterials = useMemo(() => facesToHalfMaterials(faces, "bottom", loadedByUrl), [faces, loadedByUrl]);

  const groupRef = useRef<THREE.Group>(null);
  const lidRef = useRef<THREE.Mesh>(null);
  const hovered = useRef(false);

  const BASE_YAW = 0.5;
  const BASE_PITCH = -0.14;

  useFrame(({ clock }) => {
    if (lidRef.current) {
      lidRef.current.position.set(0, 0, -size.d / 2);
      lidRef.current.rotation.x = -progressRef.current * 2.05;
    }
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
        <mesh geometry={baseGeometry} material={baseMaterials} />
        <mesh ref={lidRef} geometry={lidGeometry} material={lidMaterials} />
      </group>
    </group>
  );
}
