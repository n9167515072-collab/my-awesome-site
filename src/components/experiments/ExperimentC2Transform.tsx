"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { Card3D } from "@/components/object-kit/Card3D";
import { TarotBox3D } from "@/components/object-kit/TarotBox3D";
import { buildStackLayout, type CardLayout } from "@/components/object-kit/DeckStack3D";
import { ALICE_DECK, DECKS, type World } from "@/components/object-kit/deck-config";

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

// Phase durations (seconds since the click). Only Alice's box opens — the
// intro deliberately starts from one object, not two.
const T_OPEN = 0.85;
const T_RELEASE = 1.7;
const T_CHAOS_HOLD = 1.3;
const T_ORGANIZE = 1.7;
const OPEN_END = T_OPEN;
const RELEASE_END = OPEN_END + T_RELEASE;
const CHAOS_END = RELEASE_END + T_CHAOS_HOLD;
const ORGANIZE_END = CHAOS_END + T_ORGANIZE;

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
  fanState,
  flipState,
  onToggleFlip,
}: {
  spec: FlightSpec;
  phase: Phase;
  phaseRef: React.RefObject<Phase>;
  tRef: React.RefObject<number>;
  fanState: Record<World, boolean>;
  flipState: Set<string>;
  onToggleFlip: () => void;
}) {
  const deck = DECKS[spec.group];
  const groupRef = useRef<THREE.Group>(null);

  const restPos = useMemo(() => STACK_CENTER[spec.group].clone().add(new THREE.Vector3(...spec.layout.rest.pos)), [spec]);
  const fanPos = useMemo(() => STACK_CENTER[spec.group].clone().add(new THREE.Vector3(...spec.layout.fan.pos)), [spec]);
  const restRotZ = spec.layout.rest.rot[2];
  const fanRotZ = spec.layout.fan.rot[2];

  const settledPos = useRef(restPos.clone());
  const settledRotZ = useRef(restRotZ);

  const [flippedState, setFlippedState] = useState(spec.showsBackInChaos);
  const flippedRef = useRef(spec.showsBackInChaos);

  useFrame(() => {
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
      group.position.copy(BOX_POS);
      group.scale.setScalar(0.001);
      return;
    }
    group.visible = true;

    const travelT = clamp01((t - spec.spawnStart) / 0.55);
    const popScale = Math.min(1, travelT * 2.2);

    if (t < CHAOS_END) {
      const eased = easeOutCubic(travelT);
      group.position.set(
        lerp(BOX_POS.x, spec.chaosPos.x, eased),
        lerp(BOX_POS.y, spec.chaosPos.y, eased),
        lerp(BOX_POS.z, spec.chaosPos.z, eased),
      );
      group.rotation.set(lerp(0, spec.chaosRot.x, eased), lerp(0, spec.chaosRot.y, eased), lerp(0, spec.chaosRot.z, eased));
      group.scale.setScalar(popScale * lerp(1, spec.chaosScale, eased));
      settledPos.current.copy(group.position);
      settledRotZ.current = spec.chaosRot.z;
    } else if (t < ORGANIZE_END) {
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
  openProgressRef,
  fanState,
  flipState,
  onToggleFan,
  onToggleFlip,
}: {
  phase: Phase;
  phaseRef: React.RefObject<Phase>;
  tRef: React.RefObject<number>;
  openProgressRef: React.RefObject<number>;
  fanState: Record<World, boolean>;
  flipState: Set<string>;
  onToggleFan: (g: World) => void;
  onToggleFlip: (id: string) => void;
}) {
  const boxWrapperRef = useRef<THREE.Group>(null);

  useFrame((_state, delta) => {
    if (phaseRef.current !== "closed") {
      tRef.current += delta;
    }
    const t = tRef.current;
    openProgressRef.current = easeOutCubic(clamp01(t / T_OPEN));

    if (boxWrapperRef.current) {
      const fadeT = clamp01((t - OPEN_END) / (T_OPEN * 0.6));
      const scale = 1 - fadeT;
      boxWrapperRef.current.scale.setScalar(scale);
      boxWrapperRef.current.visible = scale > 0.01;
    }
  });

  return (
    <>
      <color attach="background" args={["#0a0908"]} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[2.5, 3, 4]} intensity={1.1} />
      <directionalLight position={[-3, -1, -2]} intensity={0.35} />

      <group ref={boxWrapperRef} position={BOX_POS.toArray()}>
        <TarotBox3D deck={ALICE_DECK} openProgress={openProgressRef} interactive={phase === "closed"} />
      </group>

      {FLIGHT_SPECS.map((spec) => (
        <FlightCard
          key={spec.id}
          spec={spec}
          phase={phase}
          phaseRef={phaseRef}
          tRef={tRef}
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
  const openProgressRef = useRef(0);
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
          openProgressRef={openProgressRef}
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
