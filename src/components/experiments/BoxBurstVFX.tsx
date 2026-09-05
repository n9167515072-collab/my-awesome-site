"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { makeGlowTexture } from "./glowTexture";

/** Deterministic pseudo-random in [0,1) — reproducible, not Math.random(). */
function seeded(i: number) {
  const x = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
  return x - Math.floor(x);
}
function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

type ParticleSpec = {
  id: number;
  delay: number;
  dir: THREE.Vector3;
  speed: number;
  size: number;
};

const GLOW_COUNT = 10; // bright warm specks
const DUST_COUNT = 10; // small, dim light flecks
const LIFETIME = 0.85;

function buildParticles(): ParticleSpec[] {
  const specs: ParticleSpec[] = [];
  for (let i = 0; i < GLOW_COUNT; i++) {
    const r1 = seeded(i * 7 + 1);
    const r2 = seeded(i * 7 + 2);
    const r3 = seeded(i * 7 + 3);
    const angle = i * 2.399963;
    const dir = new THREE.Vector3(Math.cos(angle) * (0.35 + r1 * 0.55), 1.2 + r2 * 0.9, Math.sin(angle) * (0.35 + r1 * 0.55)).normalize();
    specs.push({ id: i, delay: r3 * 0.16, dir, speed: 1.2 + r2 * 0.9, size: 0.05 + r1 * 0.05 });
  }
  for (let i = 0; i < DUST_COUNT; i++) {
    const r1 = seeded(i * 11 + 1);
    const r2 = seeded(i * 11 + 2);
    const r3 = seeded(i * 11 + 3);
    const angle = i * 2.399963 + 1.3;
    const dir = new THREE.Vector3(Math.cos(angle) * (0.4 + r1 * 0.8), 0.9 + r2 * 1.0, Math.sin(angle) * (0.4 + r1 * 0.8)).normalize();
    specs.push({ id: GLOW_COUNT + i, delay: r3 * 0.22, dir, speed: 0.8 + r2 * 0.7, size: 0.02 + r1 * 0.02 });
  }
  return specs;
}

const PARTICLES = buildParticles();

/**
 * The light intensifying into the card burst: a single narrow beam that
 * rises upward from the seam (anchored at its base, not a symmetric blob),
 * warm glow specks, and fine light dust — all deterministic, short-lived,
 * and additive. Nothing here implies the box breaking: no debris, no
 * fragments, no tumbling geometry, and no round halo/orb shape.
 */
export function BurstVFX({
  burstRef,
  tRef,
  spawnAt,
  position,
}: {
  burstRef: React.RefObject<number>;
  /** The same shared elapsed-since-click clock every other intro element animates from. */
  tRef: React.RefObject<number>;
  /** Fixed timestamp (seconds since click) the burst particles spawn at. */
  spawnAt: number;
  position: THREE.Vector3;
}) {
  const glowTex = useMemo(() => makeGlowTexture(true), []);
  const beamRef = useRef<THREE.Mesh>(null);
  const particleRefs = useRef<(THREE.Group | null)[]>([]);

  useFrame(({ camera }) => {
    const burst = burstRef.current;
    const t = tRef.current;

    if (beamRef.current) {
      const h = 0.6 + burst * 2.0;
      const w = 0.32 + burst * 0.22;
      beamRef.current.quaternion.copy(camera.quaternion);
      beamRef.current.scale.set(w, h, 1);
      // anchored at its base (local y=0, the seam) — it rises upward, it
      // doesn't grow symmetrically from a floating center.
      beamRef.current.position.y = h / 2;
      (beamRef.current.material as THREE.MeshBasicMaterial).opacity = burst * 0.6;
    }

    PARTICLES.forEach((p, i) => {
      const group = particleRefs.current[i];
      if (!group) return;
      const lt = t - spawnAt - p.delay;
      if (lt < 0 || lt > LIFETIME) {
        group.visible = false;
        return;
      }
      group.visible = true;
      group.position.set(p.dir.x * p.speed * lt, p.dir.y * p.speed * lt - 0.075 * lt * lt, p.dir.z * p.speed * lt);
      const fadeIn = clamp01(lt / 0.1);
      const fadeOut = 1 - clamp01((lt - LIFETIME * 0.55) / (LIFETIME * 0.45));
      const life = Math.min(fadeIn, fadeOut);
      group.scale.setScalar(p.size * (0.6 + life * 0.4));
      group.quaternion.copy(camera.quaternion);
      const mesh = group.children[0] as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = life * 0.85;
    });
  });

  return (
    <group position={position.toArray()}>
      <mesh ref={beamRef}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={glowTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0} />
      </mesh>

      {PARTICLES.map((p, i) => (
        <group
          key={p.id}
          ref={(el) => {
            particleRefs.current[i] = el;
          }}
          visible={false}
        >
          <mesh>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={glowTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
