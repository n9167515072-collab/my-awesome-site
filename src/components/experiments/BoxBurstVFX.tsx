"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { makeGlowTexture } from "./AliceBoxRupture";

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
  kind: "glow" | "debris";
  delay: number;
  dir: THREE.Vector3;
  speed: number;
  size: number;
  spin: THREE.Vector3;
};

const GLOW_COUNT = 12;
const DEBRIS_COUNT = 7;
const LIFETIME = 0.85;

function buildParticles(): ParticleSpec[] {
  const specs: ParticleSpec[] = [];
  for (let i = 0; i < GLOW_COUNT; i++) {
    const r1 = seeded(i * 7 + 1);
    const r2 = seeded(i * 7 + 2);
    const r3 = seeded(i * 7 + 3);
    const angle = i * 2.399963;
    const dir = new THREE.Vector3(Math.cos(angle) * (0.35 + r1 * 0.55), 1.2 + r2 * 0.9, Math.sin(angle) * (0.35 + r1 * 0.55)).normalize();
    specs.push({ id: i, kind: "glow", delay: r3 * 0.16, dir, speed: 1.2 + r2 * 0.9, size: 0.045 + r1 * 0.05, spin: new THREE.Vector3() });
  }
  for (let i = 0; i < DEBRIS_COUNT; i++) {
    const r1 = seeded(i * 11 + 1);
    const r2 = seeded(i * 11 + 2);
    const r3 = seeded(i * 11 + 3);
    const angle = i * 2.399963 + 1.3;
    const dir = new THREE.Vector3(Math.cos(angle) * (0.5 + r1 * 0.7), 0.75 + r2 * 0.75, Math.sin(angle) * (0.5 + r1 * 0.7)).normalize();
    specs.push({
      id: GLOW_COUNT + i,
      kind: "debris",
      delay: r3 * 0.2,
      dir,
      speed: 0.9 + r2 * 0.7,
      size: 0.05 + r1 * 0.04,
      spin: new THREE.Vector3((r1 - 0.5) * 9, (r2 - 0.5) * 9, (r3 - 0.5) * 9),
    });
  }
  return specs;
}

const PARTICLES = buildParticles();

/**
 * The rupture burst: a soft haze bloom, two crossed light-shaft planes (not
 * a ring), a dozen warm glow specks, and a handful of tumbling debris flecks
 * — all deterministic and short-lived. Cinematic product-explosion scale,
 * not a fantasy-spell particle field.
 */
export function BurstVFX({
  burstRef,
  tRef,
  spawnAt,
  position,
}: {
  burstRef: React.RefObject<number>;
  /** The same shared elapsed-since-click clock every other C2 element animates from. */
  tRef: React.RefObject<number>;
  /** Fixed timestamp (seconds since click) the burst particles spawn at — RUPTURE_END. */
  spawnAt: number;
  position: THREE.Vector3;
}) {
  const glowTex = useMemo(() => makeGlowTexture(true), []);
  const hazeRef = useRef<THREE.Mesh>(null);
  const rayARef = useRef<THREE.Mesh>(null);
  const rayBRef = useRef<THREE.Mesh>(null);
  const particleRefs = useRef<(THREE.Group | null)[]>([]);

  useFrame(({ camera }) => {
    const burst = burstRef.current;
    const t = tRef.current;

    if (hazeRef.current) {
      hazeRef.current.quaternion.copy(camera.quaternion);
      hazeRef.current.scale.setScalar(1.4 + burst * 1.8);
      (hazeRef.current.material as THREE.MeshBasicMaterial).opacity = burst * 0.5;
    }
    if (rayARef.current) {
      rayARef.current.scale.set(0.55 + burst * 0.35, 1.4 + burst * 1.6, 1);
      (rayARef.current.material as THREE.MeshBasicMaterial).opacity = burst * 0.55;
    }
    if (rayBRef.current) {
      rayBRef.current.scale.set(0.55 + burst * 0.35, 1.4 + burst * 1.6, 1);
      (rayBRef.current.material as THREE.MeshBasicMaterial).opacity = burst * 0.4;
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
      const gravity = p.kind === "debris" ? 0.9 : 0.15;
      group.position.set(
        p.dir.x * p.speed * lt,
        p.dir.y * p.speed * lt - 0.5 * gravity * lt * lt,
        p.dir.z * p.speed * lt,
      );
      const fadeIn = clamp01(lt / 0.1);
      const fadeOut = 1 - clamp01((lt - LIFETIME * 0.55) / (LIFETIME * 0.45));
      const life = Math.min(fadeIn, fadeOut);
      group.scale.setScalar(p.size * (0.6 + life * 0.4));
      if (p.kind === "debris") {
        group.rotation.set(p.spin.x * lt, p.spin.y * lt, p.spin.z * lt);
      } else {
        group.quaternion.copy(camera.quaternion);
      }
      const mesh = group.children[0] as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial | THREE.MeshStandardMaterial;
      mat.opacity = life * (p.kind === "glow" ? 0.9 : 1);
    });
  });

  return (
    <group position={position.toArray()}>
      <mesh ref={hazeRef}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={glowTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0} />
      </mesh>
      <mesh ref={rayARef}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={glowTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0} />
      </mesh>
      <mesh ref={rayBRef} rotation={[0, Math.PI / 2, 0]}>
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
          {p.kind === "glow" ? (
            <mesh>
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial map={glowTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0} />
            </mesh>
          ) : (
            <mesh>
              <planeGeometry args={[1, 1.4]} />
              <meshStandardMaterial color="#2c2823" roughness={0.9} transparent opacity={0} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}
