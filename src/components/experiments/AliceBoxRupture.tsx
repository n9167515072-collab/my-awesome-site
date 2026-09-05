"use client";

import { useMemo, useRef } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

import type { DeckConfig } from "@/components/object-kit/deck-config";

const INSIDE_COLOR = "#e9ddc4"; // plain cardboard-interior tone, same as TarotBox3D's seam cap
const TOP_BAND_FRAC = 0.26; // fraction of the box's height that ruptures away
const MAX_RUPTURE_ANGLE = 1.05; // radians each fragment swings outward, mirrored
const MAX_LIFT = 0.32;
// 1x1 transparent pixel — used only as a placeholder useTexture() src when a
// deck has no real front-face photo, so the hook can still be called
// unconditionally.
const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

export function getRuptureBandY(size: { h: number }) {
  const bandH = size.h * TOP_BAND_FRAC;
  const topOfBase = size.h / 2 - bandH;
  const boxTopY = size.h / 2;
  return { bandH, topOfBase, boxTopY };
}

function placeholderColor(face: DeckConfig["box"]["faces"][number]) {
  return face.kind === "placeholder" ? face.color : "#403e3e";
}

function cropClone(tex: THREE.Texture, offsetX: number, offsetY: number, repeatX: number, repeatY: number) {
  const t = tex.clone();
  t.needsUpdate = true;
  t.offset.set(offsetX, offsetY);
  t.repeat.set(repeatX, repeatY);
  return t;
}

function buildFragmentMaterials(
  side: -1 | 1,
  faces: DeckConfig["box"]["faces"],
  frontFace: DeckConfig["box"]["faces"][number],
  frontTex: THREE.Texture,
  hasRealFront: boolean,
) {
  const outerColor = side === -1 ? placeholderColor(faces[1]) : placeholderColor(faces[0]);
  const frontMat = hasRealFront
    ? new THREE.MeshStandardMaterial({
        map: cropClone(frontTex, side === -1 ? 0 : 0.5, 1 - TOP_BAND_FRAC, 0.5, TOP_BAND_FRAC),
        roughness: 0.62,
        metalness: 0.02,
      })
    : new THREE.MeshStandardMaterial({ color: placeholderColor(frontFace), roughness: 0.85 });
  const inner = new THREE.MeshStandardMaterial({ color: INSIDE_COLOR, roughness: 0.75 });
  const outer = new THREE.MeshStandardMaterial({ color: outerColor, roughness: 0.85 });
  const top = new THREE.MeshStandardMaterial({ color: placeholderColor(faces[2]), roughness: 0.85 });
  const cutBottom = new THREE.MeshStandardMaterial({ color: INSIDE_COLOR, roughness: 0.75 });
  const back = new THREE.MeshStandardMaterial({ color: placeholderColor(faces[5]), roughness: 0.85 });
  // BoxGeometry order: [+x, -x, +y, -y, +z, -z]
  return side === -1 ? [inner, outer, top, cutBottom, frontMat, back] : [outer, inner, top, cutBottom, frontMat, back];
}

export type AliceBoxRuptureProps = {
  deck: DeckConfig;
  interactive?: boolean;
  /** 0..1 — how much internal light is leaking through the still-closed seam. */
  pressureRef: React.RefObject<number>;
  /** 0..1 — how far the two top fragments have split open. */
  ruptureRef: React.RefObject<number>;
  /** 0..1 — the light/particle burst spike, peaks at rupture then decays as the card cloud takes over. */
  burstRef: React.RefObject<number>;
};

/**
 * The Alice box's lower body plus its two top fragments, built as one
 * continuous shell rather than TarotBox3D's hinge halves — so the top can
 * visually rupture into two symmetric pieces instead of flipping open like
 * a lid. C2-specific stylized VFX; TarotBox3D itself is untouched and keeps
 * serving /object-test and any other non-rupture use.
 */
export function AliceBoxRupture({ deck, interactive = true, pressureRef, ruptureRef, burstRef, ...groupProps }: AliceBoxRuptureProps & ThreeElements["group"]) {
  const { faces, size } = deck.box;
  const frontFace = faces[4];
  const hasRealFront = frontFace.kind === "real";
  const frontUrl = hasRealFront ? frontFace.texture.src : TRANSPARENT_PIXEL;
  const frontTex = useTexture(frontUrl);

  const { bandH, topOfBase } = getRuptureBandY(size);
  const baseHeight = size.h - bandH;

  const baseGeometry = useMemo(() => {
    const g = new THREE.BoxGeometry(size.w, baseHeight, size.d);
    g.translate(0, -size.h / 2 + baseHeight / 2, 0);
    return g;
  }, [size.w, baseHeight, size.d, size.h]);

  const fragGeometry = useMemo(() => new THREE.BoxGeometry(size.w / 2, bandH, size.d), [size.w, bandH, size.d]);

  const baseMaterials = useMemo(() => {
    const front = hasRealFront
      ? new THREE.MeshStandardMaterial({ map: cropClone(frontTex, 0, 0, 1, 1 - TOP_BAND_FRAC), roughness: 0.62, metalness: 0.02 })
      : new THREE.MeshStandardMaterial({ color: placeholderColor(frontFace), roughness: 0.85 });
    return [
      new THREE.MeshStandardMaterial({ color: placeholderColor(faces[0]), roughness: 0.85 }), // +x right
      new THREE.MeshStandardMaterial({ color: placeholderColor(faces[1]), roughness: 0.85 }), // -x left
      new THREE.MeshStandardMaterial({ color: INSIDE_COLOR, roughness: 0.75 }), // +y top — the cut, exposed once ruptured
      new THREE.MeshStandardMaterial({ color: placeholderColor(faces[3]), roughness: 0.85 }), // -y bottom
      front, // +z front
      new THREE.MeshStandardMaterial({ color: placeholderColor(faces[5]), roughness: 0.85 }), // -z back
    ];
  }, [faces, frontFace, frontTex, hasRealFront]);

  const leftMaterials = useMemo(
    () => buildFragmentMaterials(-1, faces, frontFace, frontTex, hasRealFront),
    [faces, frontFace, frontTex, hasRealFront],
  );
  const rightMaterials = useMemo(
    () => buildFragmentMaterials(1, faces, frontFace, frontTex, hasRealFront),
    [faces, frontFace, frontTex, hasRealFront],
  );

  const groupRef = useRef<THREE.Group>(null);
  const leftPivot = useRef<THREE.Group>(null);
  const rightPivot = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const BASE_YAW = 0.5;
  const BASE_PITCH = -0.14;

  useFrame(({ clock }) => {
    const rupture = ruptureRef.current;
    if (leftPivot.current) {
      leftPivot.current.rotation.y = -rupture * MAX_RUPTURE_ANGLE;
      leftPivot.current.position.y = topOfBase + bandH / 2 + rupture * MAX_LIFT;
    }
    if (rightPivot.current) {
      rightPivot.current.rotation.y = rupture * MAX_RUPTURE_ANGLE;
      rightPivot.current.position.y = topOfBase + bandH / 2 + rupture * MAX_LIFT;
    }
    if (lightRef.current) {
      lightRef.current.intensity = pressureRef.current * 1.3 + burstRef.current * 6;
    }
    if (!groupRef.current) return;
    const idleBob = interactive ? Math.sin(clock.elapsedTime * 0.7) * 0.03 : 0;
    groupRef.current.position.y = idleBob;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, BASE_YAW, 0.08);
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, BASE_PITCH, 0.08);
  });

  return (
    <group {...groupProps}>
      <group ref={groupRef}>
        <mesh geometry={baseGeometry} material={baseMaterials} />
        <group ref={leftPivot} position={[0, topOfBase + bandH / 2, 0]}>
          <mesh position={[-size.w / 4, 0, 0]} geometry={fragGeometry} material={leftMaterials} />
        </group>
        <group ref={rightPivot} position={[0, topOfBase + bandH / 2, 0]}>
          <mesh position={[size.w / 4, 0, 0]} geometry={fragGeometry} material={rightMaterials} />
        </group>
        {/* Interior light — the source lives inside the shell, never as a floating sphere. */}
        <pointLight ref={lightRef} position={[0, topOfBase + bandH * 0.4, 0]} color="#ffdca8" intensity={0} distance={4.5} decay={2} />
        <SeamGlow topOfBase={topOfBase} size={size} pressureRef={pressureRef} ruptureRef={ruptureRef} />
      </group>
    </group>
  );
}

/** Soft additive glow at the still-closed seam and top corners — light leaking out before rupture, not a ring or portal shape. */
function SeamGlow({
  topOfBase,
  size,
  pressureRef,
  ruptureRef,
}: {
  topOfBase: number;
  size: { w: number; d: number };
  pressureRef: React.RefObject<number>;
  ruptureRef: React.RefObject<number>;
}) {
  const stripRef = useRef<THREE.Mesh>(null);
  const cornerRefs = useRef<(THREE.Mesh | null)[]>([]);
  const texture = useMemo(() => makeGlowTexture(), []);

  const corners: [number, number][] = [
    [-size.w / 2 + 0.08, size.d / 2 - 0.05],
    [size.w / 2 - 0.08, size.d / 2 - 0.05],
    [-size.w / 2 + 0.08, -size.d / 2 + 0.05],
    [size.w / 2 - 0.08, -size.d / 2 + 0.05],
  ];

  useFrame(({ camera }) => {
    const level = pressureRef.current * (1 - ruptureRef.current);
    if (stripRef.current) {
      stripRef.current.quaternion.copy(camera.quaternion);
      (stripRef.current.material as THREE.MeshBasicMaterial).opacity = level * 0.8;
    }
    cornerRefs.current.forEach((m) => {
      if (!m) return;
      m.quaternion.copy(camera.quaternion);
      (m.material as THREE.MeshBasicMaterial).opacity = level * 0.6;
    });
  });

  return (
    <>
      <mesh ref={stripRef} position={[0, topOfBase, size.d / 2 + 0.02]} scale={[size.w * 0.85, 0.14, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0} />
      </mesh>
      {corners.map(([x, z], i) => (
        <mesh
          key={i}
          ref={(el) => {
            cornerRefs.current[i] = el;
          }}
          position={[x, topOfBase, z]}
          scale={[0.16, 0.16, 1]}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={texture} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0} />
        </mesh>
      ))}
    </>
  );
}

/** Soft radial gradient (no ring/hole) — reads as a light bloom, shared by every glow/haze decal in the rupture sequence. */
export function makeGlowTexture(warm = true) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    if (warm) {
      gradient.addColorStop(0, "rgba(255,241,212,0.95)");
      gradient.addColorStop(0.4, "rgba(255,226,172,0.4)");
      gradient.addColorStop(1, "rgba(255,226,172,0)");
    } else {
      gradient.addColorStop(0, "rgba(255,255,255,0.9)");
      gradient.addColorStop(0.4, "rgba(255,255,255,0.35)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
