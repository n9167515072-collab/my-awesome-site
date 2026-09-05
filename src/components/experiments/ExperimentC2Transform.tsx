"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { Card3D } from "@/components/object-kit/Card3D";
import { buildStackLayout, type CardLayout } from "@/components/object-kit/DeckStack3D";
import { ALICE_DECK, DECKS, type World } from "@/components/object-kit/deck-config";
import { AliceBoxRupture, getRuptureBandY, makeGlowTexture } from "./AliceBoxRupture";
import { BurstVFX } from "./BoxBurstVFX";

// ---------------------------------------------------------------------------
// math helpers — deterministic, manual (no motion/react useTransform here;
// this whole scene is R3F/Three.js, driven by a single elapsed-time ref)
// ---------------------------------------------------------------------------
function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
/** Deterministic pseudo-random in [0,1) — reproducible, not Math.random(). */
function seeded(i: number) {
  const x = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
  return x - Math.floor(x);
}

const CARDS_PER_GROUP = 12;
const INTERACTIVE_PER_GROUP = 3;

const STACK_CENTER: Record<World, THREE.Vector3> = {
  alice: new THREE.Vector3(-1.6, -0.05, 0),
  vitraji: new THREE.Vector3(1.6, -0.05, 0),
};

const BOX_POS = new THREE.Vector3(0, 0, 1.7);
const { bandH: RUPTURE_BAND_H, topOfBase: RUPTURE_TOP_OF_BASE } = getRuptureBandY(ALICE_DECK.box.size);
// Cards spawn just inside the ruptured opening, then shoot straight up
// through it (LAUNCH_POS) before diverging into the chaos cloud — never
// from a floating point disconnected from the box.
const RELEASE_POS = BOX_POS.clone().add(new THREE.Vector3(0, RUPTURE_TOP_OF_BASE + RUPTURE_BAND_H * 0.5, 0));
const LAUNCH_POS = BOX_POS.clone().add(new THREE.Vector3(0, RUPTURE_TOP_OF_BASE + RUPTURE_BAND_H + 0.6, 0));
const LAUNCH_T = 0.32; // fraction of each card's travel window spent shooting straight up before diverging

// Phase durations (seconds since the click). Only Alice's box opens — the
// intro deliberately starts from one object, not two. The opening beat is
// its own escalation: CALM -> PRESSURE (seam glow builds) -> RUPTURE (the
// top splits) -> BURST (light + particles peak, first cards shoot out).
const CALM_END = 0.5;
const PRESSURE_END = 1.2;
const RUPTURE_END = 1.6;
const BURST_END = 2.0;
const OPEN_END = BURST_END;

const T_RELEASE = 1.7;
const T_CHAOS_HOLD = 1.3;
const T_ORGANIZE = 1.7;
const RELEASE_END = OPEN_END + T_RELEASE;
const CHAOS_END = RELEASE_END + T_CHAOS_HOLD;
const ORGANIZE_END = CHAOS_END + T_ORGANIZE;

/** 0..1 — internal light leaking through the still-closed seam, before anything moves. */
function pressureLevel(t: number) {
  if (t < CALM_END) return 0;
  if (t < PRESSURE_END) return easeInOutCubic(clamp01((t - CALM_END) / (PRESSURE_END - CALM_END)));
  return 1;
}
/** 0..1 — how far the two top fragments have split apart: a readable tear across the whole window, not an instant snap. */
function ruptureLevel(t: number) {
  if (t < PRESSURE_END) return 0;
  if (t < RUPTURE_END) return easeInOutCubic(clamp01((t - PRESSURE_END) / (RUPTURE_END - PRESSURE_END)));
  return 1;
}
/** 0..1 — the light/particle burst spike: rises through the burst window, then decays as the card cloud takes over. */
function burstLevel(t: number) {
  if (t < RUPTURE_END) return 0;
  if (t < BURST_END) return easeOutCubic(clamp01((t - RUPTURE_END) / (BURST_END - RUPTURE_END)));
  return Math.max(0, 1 - clamp01((t - BURST_END) / 0.9));
}

type FlightSpec = {
  id: string;
  group: World;
  layout: CardLayout;
  spawnStart: number;
  chaosPos: THREE.Vector3;
  chaosRot: THREE.Euler;
  chaosScale: number;
  showsBackInChaos: boolean;
  revealAt: number;
  /** First few cards out of the rupture get a brief accompanying glow trail. */
  hasLaunchGlow: boolean;
};

function buildFlightSpecs(): FlightSpec[] {
  const specs: FlightSpec[] = [];
  (["alice", "vitraji"] as World[]).forEach((group, groupIndex) => {
    const side = group === "alice" ? -1 : 1;
    const layout = buildStackLayout(CARDS_PER_GROUP, INTERACTIVE_PER_GROUP);
    layout.forEach((cardLayout, localIndex) => {
      const globalIndex = groupIndex * CARDS_PER_GROUP + localIndex;
      const r1 = seeded(globalIndex * 3 + 1);
      const r2 = seeded(globalIndex * 3 + 2);
      const r3 = seeded(globalIndex * 3 + 3);
      const r4 = seeded(globalIndex * 5 + 1);

      // golden-angle spiral cloud, biased so a few cards swing close to
      // camera while most sit further back — an art-directed cloud, not a
      // uniform random scatter.
      const golden = 2.399963;
      const angle = globalIndex * golden + side * 0.3;
      const radiusBand = 1.6 + (globalIndex % 5) * 0.42;
      const closePass = globalIndex % 4 === 0;
      const chaosPos = new THREE.Vector3(
        Math.cos(angle) * radiusBand * (0.85 + r1 * 0.5) + side * 0.4,
        (r2 - 0.5) * 4.4,
        closePass ? 2.4 + r3 * 1.6 : -2.6 - r3 * 2.4,
      );
      const chaosRot = new THREE.Euler((r1 - 0.5) * Math.PI * 1.4, (r2 - 0.5) * Math.PI * 1.6, (r3 - 0.5) * Math.PI);
      const chaosScale = 0.82 + r4 * 0.36;

      const spawnStart = OPEN_END + (localIndex / CARDS_PER_GROUP) * T_RELEASE * 0.72 + r1 * 0.06;
      // cards passing close to camera mostly show their (recognizable)
      // front; the deep background cloud is mostly card backs.
      const showsBackInChaos = closePass ? r2 < 0.25 : r2 < 0.72;
      const revealAt = CHAOS_END + (localIndex / CARDS_PER_GROUP) * T_ORGANIZE * 0.5 + r3 * 0.15;

      specs.push({
        id: `${group}-${localIndex}`,
        group,
        layout: cardLayout,
        spawnStart,
        chaosPos,
        chaosRot,
        chaosScale,
        showsBackInChaos,
        revealAt,
        hasLaunchGlow: localIndex < 3,
      });
    });
  });
  return specs;
}

const FLIGHT_SPECS = buildFlightSpecs();

type Phase = "closed" | "opening" | "catalogue";

function FlightCard({
  spec,
  phase,
  phaseRef,
  tRef,
  glowTexture,
  fanState,
  flipState,
  onToggleFlip,
}: {
  spec: FlightSpec;
  phase: Phase;
  phaseRef: React.RefObject<Phase>;
  tRef: React.RefObject<number>;
  glowTexture: THREE.Texture;
  fanState: Record<World, boolean>;
  flipState: Set<string>;
  onToggleFlip: () => void;
}) {
  const deck = DECKS[spec.group];
  const groupRef = useRef<THREE.Group>(null);
  const trailRef = useRef<THREE.Mesh>(null);

  const restPos = useMemo(() => STACK_CENTER[spec.group].clone().add(new THREE.Vector3(...spec.layout.rest.pos)), [spec]);
  const fanPos = useMemo(() => STACK_CENTER[spec.group].clone().add(new THREE.Vector3(...spec.layout.fan.pos)), [spec]);
  const restRotZ = spec.layout.rest.rot[2];
  const fanRotZ = spec.layout.fan.rot[2];

  const settledPos = useRef(restPos.clone());
  const settledRotZ = useRef(restRotZ);

  const [flippedState, setFlippedState] = useState(spec.showsBackInChaos);
  const flippedRef = useRef(spec.showsBackInChaos);

  useFrame((state) => {
    const t = tRef.current;
    const group = groupRef.current;

    const shouldBeFlipped = t < spec.revealAt ? spec.showsBackInChaos : flipState.has(spec.id);
    if (shouldBeFlipped !== flippedRef.current) {
      flippedRef.current = shouldBeFlipped;
      setFlippedState(shouldBeFlipped);
    }

    if (!group) return;

    if (t < spec.spawnStart) {
      group.visible = false;
      group.position.copy(RELEASE_POS);
      group.scale.setScalar(0.001);
      if (trailRef.current) trailRef.current.visible = false;
      return;
    }
    group.visible = true;

    const travelT = clamp01((t - spec.spawnStart) / 0.55);
    const popScale = Math.min(1, travelT * 2.2);

    if (t < CHAOS_END) {
      let pos: THREE.Vector3;
      let divergeT: number;
      if (travelT < LAUNCH_T) {
        // shoots straight out through the rupture opening, aligned with the burst
        divergeT = 0;
        pos = RELEASE_POS.clone().lerp(LAUNCH_POS, easeOutCubic(travelT / LAUNCH_T));
      } else {
        divergeT = easeOutCubic((travelT - LAUNCH_T) / (1 - LAUNCH_T));
        pos = LAUNCH_POS.clone().lerp(spec.chaosPos, divergeT);
      }
      group.position.copy(pos);
      group.rotation.set(lerp(0, spec.chaosRot.x, divergeT), lerp(0, spec.chaosRot.y, divergeT), lerp(0, spec.chaosRot.z, divergeT));
      const eased = easeOutCubic(travelT);
      group.scale.setScalar(popScale * lerp(1, spec.chaosScale, eased));
      settledPos.current.copy(group.position);
      settledRotZ.current = lerp(0, spec.chaosRot.z, divergeT);

      if (spec.hasLaunchGlow && trailRef.current) {
        const glowT = 1 - clamp01(travelT / (LAUNCH_T * 1.4));
        trailRef.current.visible = glowT > 0.02;
        trailRef.current.quaternion.copy(state.camera.quaternion);
        trailRef.current.scale.setScalar(0.35 + glowT * 0.3);
        (trailRef.current.material as THREE.MeshBasicMaterial).opacity = glowT * 0.7;
      }
    } else if (t < ORGANIZE_END) {
      if (trailRef.current) trailRef.current.visible = false;
      const orgT = easeInOutCubic(clamp01((t - CHAOS_END) / T_ORGANIZE));
      group.position.set(
        lerp(spec.chaosPos.x, restPos.x, orgT),
        lerp(spec.chaosPos.y, restPos.y, orgT),
        lerp(spec.chaosPos.z, restPos.z, orgT),
      );
      group.rotation.set(lerp(spec.chaosRot.x, 0, orgT), lerp(spec.chaosRot.y, 0, orgT), lerp(spec.chaosRot.z, restRotZ, orgT));
      group.scale.setScalar(lerp(spec.chaosScale, 1, orgT));
      settledPos.current.copy(group.position);
      settledRotZ.current = lerp(spec.chaosRot.z, restRotZ, orgT);
    } else {
      if (trailRef.current) trailRef.current.visible = false;
      const fanned = fanState[spec.group];
      const target = fanned ? fanPos : restPos;
      const targetRotZ = fanned ? fanRotZ : restRotZ;
      settledPos.current.x = lerp(settledPos.current.x, target.x, 0.14);
      settledPos.current.y = lerp(settledPos.current.y, target.y, 0.14);
      settledPos.current.z = lerp(settledPos.current.z, target.z, 0.14);
      settledRotZ.current = lerp(settledRotZ.current, targetRotZ, 0.14);
      group.position.copy(settledPos.current);
      group.rotation.set(0, 0, settledRotZ.current);
      group.scale.setScalar(1);
    }
  });

  const interactive = phase === "catalogue" && fanState[spec.group] && spec.layout.interactiveIndex !== null;

  return (
    <group ref={groupRef}>
      {spec.hasLaunchGlow && (
        <mesh ref={trailRef} position={[0, -0.12, 0]} visible={false}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={glowTexture} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0} />
        </mesh>
      )}
      <Card3D
        frontTexture={deck.cardFronts[spec.layout.frontIndex]}
        backTexture={deck.cardBack}
        tint={deck.tint}
        flipped={flippedState}
        interactive={interactive}
        onClick={() => {
          if (phaseRef.current !== "catalogue" || !fanState[spec.group]) return;
          onToggleFlip();
        }}
      />
    </group>
  );
}

function StackHitArea({ group, onFan }: { group: World; onFan: () => void }) {
  const pos = STACK_CENTER[group];
  return (
    <mesh
      position={[pos.x, pos.y, pos.z + 0.06]}
      visible={false}
      onClick={(e) => {
        e.stopPropagation();
        onFan();
      }}
    >
      <planeGeometry args={[1.3, 1.7]} />
    </mesh>
  );
}

function Scene({
  phase,
  phaseRef,
  tRef,
  pressureRef,
  ruptureRef,
  burstRef,
  fanState,
  flipState,
  onToggleFan,
  onToggleFlip,
}: {
  phase: Phase;
  phaseRef: React.RefObject<Phase>;
  tRef: React.RefObject<number>;
  pressureRef: React.RefObject<number>;
  ruptureRef: React.RefObject<number>;
  burstRef: React.RefObject<number>;
  fanState: Record<World, boolean>;
  flipState: Set<string>;
  onToggleFan: (g: World) => void;
  onToggleFlip: (id: string) => void;
}) {
  const boxWrapperRef = useRef<THREE.Group>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const keyLightRef = useRef<THREE.DirectionalLight>(null);
  const glowTexture = useMemo(() => makeGlowTexture(true), []);

  useFrame((_state, delta) => {
    if (phaseRef.current !== "closed") {
      tRef.current += delta;
    }
    const t = tRef.current;
    pressureRef.current = pressureLevel(t);
    ruptureRef.current = ruptureLevel(t);
    burstRef.current = burstLevel(t);

    // exposure lift: nearby surfaces and cards read brighter right through the burst
    if (ambientRef.current) ambientRef.current.intensity = 0.65 + burstRef.current * 0.35;
    if (keyLightRef.current) keyLightRef.current.intensity = 1.1 + burstRef.current * 0.7;

    if (boxWrapperRef.current) {
      const fadeT = clamp01((t - BURST_END) / 0.5);
      const scale = 1 - fadeT;
      boxWrapperRef.current.scale.setScalar(scale);
      boxWrapperRef.current.visible = scale > 0.01;
    }
  });

  return (
    <>
      <color attach="background" args={["#0a0908"]} />
      <ambientLight ref={ambientRef} intensity={0.65} />
      <directionalLight ref={keyLightRef} position={[2.5, 3, 4]} intensity={1.1} />
      <directionalLight position={[-3, -1, -2]} intensity={0.35} />

      {/* The box stays one intact shell that ruptures into two symmetric top
          fragments — never a hinge-flip lid — then shrinks away as a whole
          once the release zone above it has taken over as the focus. */}
      <group ref={boxWrapperRef} position={BOX_POS.toArray()}>
        <AliceBoxRupture deck={ALICE_DECK} interactive={phase === "closed"} pressureRef={pressureRef} ruptureRef={ruptureRef} burstRef={burstRef} />
      </group>

      <BurstVFX burstRef={burstRef} tRef={tRef} spawnAt={RUPTURE_END} position={RELEASE_POS} />

      {FLIGHT_SPECS.map((spec) => (
        <FlightCard
          key={spec.id}
          spec={spec}
          phase={phase}
          phaseRef={phaseRef}
          tRef={tRef}
          glowTexture={glowTexture}
          fanState={fanState}
          flipState={flipState}
          onToggleFlip={() => onToggleFlip(spec.id)}
        />
      ))}

      {phase === "catalogue" && !fanState.alice && <StackHitArea group="alice" onFan={() => onToggleFan("alice")} />}
      {phase === "catalogue" && !fanState.vitraji && <StackHitArea group="vitraji" onFan={() => onToggleFan("vitraji")} />}
    </>
  );
}

export function ExperimentC2Transform() {
  const [phase, setPhase] = useState<Phase>("closed");
  const phaseRef = useRef<Phase>("closed");
  const tRef = useRef(0);
  const pressureRef = useRef(0);
  const ruptureRef = useRef(0);
  const burstRef = useRef(0);
  const [fanState, setFanState] = useState<Record<World, boolean>>({ alice: false, vitraji: false });
  const [flipState, setFlipState] = useState<Set<string>>(new Set());

  function goPhase(next: Phase) {
    phaseRef.current = next;
    setPhase(next);
  }

  function handleStart() {
    if (phaseRef.current !== "closed") return;
    tRef.current = 0;
    goPhase("opening");
  }

  function toggleFan(group: World) {
    setFanState((prev) => ({ ...prev, [group]: !prev[group] }));
  }
  function toggleFlip(id: string) {
    setFlipState((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#0a0908]">
      <Canvas camera={{ fov: 45, position: [0, 0, 6] }} dpr={[1, 2]}>
        <Scene
          phase={phase}
          phaseRef={phaseRef}
          tRef={tRef}
          pressureRef={pressureRef}
          ruptureRef={ruptureRef}
          burstRef={burstRef}
          fanState={fanState}
          flipState={flipState}
          onToggleFan={toggleFan}
          onToggleFlip={toggleFlip}
        />
        <PhaseWatcher phaseRef={phaseRef} tRef={tRef} onCatalogue={() => goPhase("catalogue")} />
      </Canvas>

      {phase === "closed" && (
        <button
          type="button"
          onClick={handleStart}
          aria-label="Открыть колоду"
          className="absolute left-1/2 top-1/2 z-10 h-[70%] w-[42%] -translate-x-1/2 -translate-y-1/2 cursor-pointer"
        />
      )}

      <p className="pointer-events-none absolute left-6 top-6 z-20 text-[10px] font-medium tracking-[0.3em] text-white/40 sm:left-10 sm:top-8">
        EXPERIMENT C2 — BOX BECOMES CATALOGUE
      </p>

      {phase === "catalogue" && (
        <>
          <p className="pointer-events-none absolute bottom-10 left-[28%] z-20 -translate-x-1/2 text-[11px] font-medium tracking-[0.35em] text-white/70">
            АЛИСА
          </p>
          <p className="pointer-events-none absolute bottom-10 left-[72%] z-20 -translate-x-1/2 text-[11px] font-medium tracking-[0.35em] text-white/70">
            ВИТРАЖИ
          </p>
        </>
      )}
    </div>
  );
}

/** Lives inside the Canvas purely to watch the shared time ref and fire the one-time phase transition via real React state. */
function PhaseWatcher({
  phaseRef,
  tRef,
  onCatalogue,
}: {
  phaseRef: React.RefObject<Phase>;
  tRef: React.RefObject<number>;
  onCatalogue: () => void;
}) {
  useFrame(() => {
    if (phaseRef.current === "opening" && tRef.current >= ORGANIZE_END) {
      onCatalogue();
    }
  });
  return null;
}
