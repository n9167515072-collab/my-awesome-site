"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

import aliceBoxImg from "../../../assets/experiments/cards/alice-box.png";
import aliceCard1Img from "../../../assets/experiments/cards/alice-card-1.png";
import aliceCard2Img from "../../../assets/experiments/cards/alice-card-2.png";
import aliceCard3Img from "../../../assets/experiments/cards/alice-card-3.png";
import aliceBackImg from "../../../assets/experiments/cards/alice-deck-back.png";
import vitrajiCard1Img from "../../../assets/experiments/cards/vitraji-card-1.png";
import vitrajiCard2Img from "../../../assets/experiments/cards/vitraji-card-2.png";
import vitrajiCard3Img from "../../../assets/experiments/cards/vitraji-card-3.png";
import vitrajiBackImg from "../../../assets/experiments/cards/vitraji-deck-back.png";

// ---------------------------------------------------------------------------
// math helpers (deliberately manual — motion's useTransform mis-clamps
// keyframe ranges in the installed version; plain lerps are correct here too)
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

type World = "alice" | "vitraji";

const CARD_W = 0.86;
const CARD_H = 1.24;
const CARD_T = 0.028;

const CARDS_PER_GROUP = 12;
const INTERACTIVE_PER_GROUP = 3;

const BOX_W = 1.05;
const BOX_H = 1.35;
const BOX_Z = 1.6;

const STACK_CENTER: Record<World, THREE.Vector3> = {
  alice: new THREE.Vector3(-1.55, -0.05, 0),
  vitraji: new THREE.Vector3(1.55, -0.05, 0),
};

// phase durations (seconds), chained from the moment of the click
const T_OPEN = 0.7;
const T_RELEASE = 1.6;
const T_CHAOS_HOLD = 1.2;
const T_ORGANIZE = 1.55;
const OPEN_END = T_OPEN;
const RELEASE_END = OPEN_END + T_RELEASE;
const CHAOS_END = RELEASE_END + T_CHAOS_HOLD;
const ORGANIZE_END = CHAOS_END + T_ORGANIZE;

type CardSpec = {
  id: string;
  group: World;
  interactiveIndex: number | null;
  frontKind: number;
  spawnStart: number;
  chaosPos: THREE.Vector3;
  chaosRot: THREE.Euler;
  restPos: THREE.Vector3;
  restRot: THREE.Euler;
  fanPos: THREE.Vector3;
  fanRot: THREE.Euler;
};

function buildCards(): CardSpec[] {
  const specs: CardSpec[] = [];
  const groups: World[] = ["alice", "vitraji"];

  groups.forEach((group, groupIndex) => {
    const side = group === "alice" ? -1 : 1;
    for (let localIndex = 0; localIndex < CARDS_PER_GROUP; localIndex++) {
      const globalIndex = groupIndex * CARDS_PER_GROUP + localIndex;
      const r1 = seeded(globalIndex * 3 + 1);
      const r2 = seeded(globalIndex * 3 + 2);
      const r3 = seeded(globalIndex * 3 + 3);

      // golden-angle spiral cloud, biased so a few cards swing close to camera
      const golden = 2.399963;
      const angle = globalIndex * golden + side * 0.3;
      const radiusBand = 1.6 + (globalIndex % 5) * 0.42;
      const closePass = globalIndex % 4 === 0;
      const chaosPos = new THREE.Vector3(
        Math.cos(angle) * radiusBand * (0.85 + r1 * 0.5) + side * 0.4,
        (r2 - 0.5) * 4.4,
        closePass ? 2.4 + r3 * 1.6 : -2.6 - r3 * 2.4,
      );
      const chaosRot = new THREE.Euler(
        (r1 - 0.5) * Math.PI * 1.4,
        (r2 - 0.5) * Math.PI * 1.6,
        (r3 - 0.5) * Math.PI,
      );

      const interactiveIndex = localIndex < INTERACTIVE_PER_GROUP ? localIndex : null;
      const mid = (INTERACTIVE_PER_GROUP - 1) / 2;

      // resting position: interactive cards fan-ready but closed (tight
      // pile with a hint of jitter); bulk cards form the stack's thickness
      const restPos =
        interactiveIndex !== null
          ? STACK_CENTER[group].clone().add(new THREE.Vector3((interactiveIndex - mid) * 0.02, (interactiveIndex - mid) * -0.015, interactiveIndex * 0.006))
          : STACK_CENTER[group]
              .clone()
              .add(new THREE.Vector3(side * -0.06, -0.02, -0.01 - (localIndex - INTERACTIVE_PER_GROUP) * 0.006));
      const restRot =
        interactiveIndex !== null
          ? new THREE.Euler(0, 0, (interactiveIndex - mid) * 0.05)
          : new THREE.Euler(0, 0, side * 0.14);

      const fanPos =
        interactiveIndex !== null
          ? STACK_CENTER[group].clone().add(new THREE.Vector3((interactiveIndex - mid) * 0.5, Math.abs(interactiveIndex - mid) * 0.08 + 0.03, interactiveIndex * 0.01))
          : restPos.clone();
      const fanRot =
        interactiveIndex !== null
          ? new THREE.Euler(0, 0, (interactiveIndex - mid) * 0.32)
          : restRot.clone();

      specs.push({
        id: `${group}-${localIndex}`,
        group,
        interactiveIndex,
        frontKind: localIndex % 3,
        spawnStart: OPEN_END + (localIndex / CARDS_PER_GROUP) * T_RELEASE * 0.72 + r1 * 0.06,
        chaosPos,
        chaosRot,
        restPos,
        restRot,
        fanPos,
        fanRot,
      });
    }
  });

  return specs;
}

const CARD_SPECS = buildCards();

type Phase = "closed" | "opening" | "catalogue";

function useSharedMaterials() {
  const aliceFrontTex = useTexture([aliceCard1Img.src, aliceCard2Img.src, aliceCard3Img.src]);
  const vitrajiFrontTex = useTexture([vitrajiCard1Img.src, vitrajiCard2Img.src, vitrajiCard3Img.src]);
  const aliceBackTex = useTexture(aliceBackImg.src);
  const vitrajiBackTex = useTexture(vitrajiBackImg.src);
  const boxTex = useTexture(aliceBoxImg.src);

  return useMemo(() => {
    const edge = new THREE.MeshStandardMaterial({ color: "#efe6d3", roughness: 0.6 });
    const aliceBack = new THREE.MeshStandardMaterial({ map: aliceBackTex, roughness: 0.55 });
    const vitrajiBack = new THREE.MeshStandardMaterial({ map: vitrajiBackTex, roughness: 0.55 });
    const aliceFronts = aliceFrontTex.map((t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }));
    const vitrajiFronts = vitrajiFrontTex.map((t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }));

    const boxTop = boxTex.clone();
    boxTop.needsUpdate = true;
    boxTop.repeat.set(1, 0.5);
    boxTop.offset.set(0, 0.5);
    const boxBottom = boxTex.clone();
    boxBottom.needsUpdate = true;
    boxBottom.repeat.set(1, 0.5);
    boxBottom.offset.set(0, 0);

    return {
      edge,
      backs: { alice: aliceBack, vitraji: vitrajiBack },
      fronts: { alice: aliceFronts, vitraji: vitrajiFronts },
      boxTopMat: new THREE.MeshStandardMaterial({ map: boxTop, roughness: 0.6, side: THREE.DoubleSide }),
      boxBottomMat: new THREE.MeshStandardMaterial({ map: boxBottom, roughness: 0.6, side: THREE.DoubleSide }),
    };
  }, [aliceFrontTex, vitrajiFrontTex, aliceBackTex, vitrajiBackTex, boxTex]);
}

function DeckBox({
  phaseRef,
  tRef,
  mats,
}: {
  phaseRef: React.RefObject<Phase>;
  tRef: React.RefObject<number>;
  mats: ReturnType<typeof useSharedMaterials>;
}) {
  const topRef = useRef<THREE.Mesh>(null);
  const bottomRef = useRef<THREE.Mesh>(null);
  const spineRef = useRef<THREE.Mesh>(null);

  const topGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(BOX_W, BOX_H / 2);
    g.translate(0, BOX_H / 4, 0);
    return g;
  }, []);
  const bottomGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(BOX_W, BOX_H / 2);
    g.translate(0, -BOX_H / 4, 0);
    return g;
  }, []);

  useFrame(({ clock }) => {
    const t = tRef.current;
    const phase = phaseRef.current;
    const idle = phase === "closed" ? Math.sin(clock.elapsedTime * 0.9) * 0.05 : 0;
    const idleRotY = phase === "closed" ? Math.sin(clock.elapsedTime * 0.6) * 0.12 : 0;

    const openT = easeOutCubic(clamp01(t / T_OPEN));
    const fadeT = clamp01((t - T_OPEN) / (T_OPEN * 0.6));
    const scale = 1 - fadeT;

    if (topRef.current) {
      topRef.current.rotation.x = -openT * 2.05;
      topRef.current.position.set(0, idle, BOX_Z);
      topRef.current.rotation.y = idleRotY;
      topRef.current.scale.setScalar(scale);
      topRef.current.visible = scale > 0.01;
    }
    if (bottomRef.current) {
      bottomRef.current.rotation.x = openT * 1.5;
      bottomRef.current.position.set(0, idle, BOX_Z);
      bottomRef.current.rotation.y = idleRotY;
      bottomRef.current.scale.setScalar(scale);
      bottomRef.current.visible = scale > 0.01;
    }
    if (spineRef.current) {
      spineRef.current.position.set(0, idle, BOX_Z - 0.16);
      spineRef.current.rotation.y = idleRotY;
      spineRef.current.scale.setScalar(scale);
      spineRef.current.visible = scale > 0.01;
    }
  });

  return (
    <group>
      <mesh ref={topRef} geometry={topGeo} material={mats.boxTopMat} />
      <mesh ref={bottomRef} geometry={bottomGeo} material={mats.boxBottomMat} />
      <mesh ref={spineRef}>
        <boxGeometry args={[BOX_W * 0.94, BOX_H * 0.94, 0.22]} />
        <meshStandardMaterial color="#171512" roughness={0.8} />
      </mesh>
    </group>
  );
}

function FlyingCard({
  spec,
  phaseRef,
  tRef,
  mats,
  fanned,
  flipped,
  onToggleFan,
  onToggleFlip,
}: {
  spec: CardSpec;
  phaseRef: React.RefObject<Phase>;
  tRef: React.RefObject<number>;
  mats: ReturnType<typeof useSharedMaterials>;
  fanned: boolean;
  flipped: boolean;
  onToggleFan: () => void;
  onToggleFlip: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const flipRef = useRef<THREE.Group>(null);
  const hoverRef = useRef(0);
  const settledPos = useRef(spec.restPos.clone());
  const settledRot = useRef(new THREE.Euler().copy(spec.restRot));

  useFrame(() => {
    const t = tRef.current;
    const group = groupRef.current;
    if (!group) return;

    if (t < spec.spawnStart) {
      group.visible = false;
      group.position.set(0, 0, BOX_Z);
      group.scale.setScalar(0.001);
      return;
    }
    group.visible = true;

    const travelT = clamp01((t - spec.spawnStart) / 0.55);
    const popScale = Math.min(1, travelT * 2.2);

    if (t < CHAOS_END) {
      const eased = easeOutCubic(travelT);
      group.position.set(
        lerp(0, spec.chaosPos.x, eased),
        lerp(0, spec.chaosPos.y, eased),
        lerp(BOX_Z, spec.chaosPos.z, eased),
      );
      group.rotation.set(
        lerp(0, spec.chaosRot.x, eased),
        lerp(0, spec.chaosRot.y, eased),
        lerp(0, spec.chaosRot.z, eased),
      );
      group.scale.setScalar(popScale);
    } else if (t < ORGANIZE_END) {
      const orgT = easeInOutCubic(clamp01((t - CHAOS_END) / T_ORGANIZE));
      group.position.set(
        lerp(spec.chaosPos.x, spec.restPos.x, orgT),
        lerp(spec.chaosPos.y, spec.restPos.y, orgT),
        lerp(spec.chaosPos.z, spec.restPos.z, orgT),
      );
      group.rotation.set(
        lerp(spec.chaosRot.x, spec.restRot.x, orgT),
        lerp(spec.chaosRot.y, spec.restRot.y, orgT),
        lerp(spec.chaosRot.z, spec.restRot.z, orgT),
      );
      group.scale.setScalar(1);
      settledPos.current.copy(group.position);
      settledRot.current.copy(group.rotation);
    } else {
      // catalogue: spring toward rest or fan target
      const target = fanned ? spec.fanPos : spec.restPos;
      const targetRot = fanned ? spec.fanRot : spec.restRot;
      const hoverTarget = spec.interactiveIndex !== null ? hoverRef.current : 0;
      settledPos.current.x = lerp(settledPos.current.x, target.x, 0.12);
      settledPos.current.y = lerp(settledPos.current.y, target.y + hoverTarget * 0.05, 0.12);
      settledPos.current.z = lerp(settledPos.current.z, target.z + hoverTarget * 0.12, 0.12);
      settledRot.current.x = lerp(settledRot.current.x, targetRot.x, 0.12);
      settledRot.current.y = lerp(settledRot.current.y, targetRot.y, 0.12);
      settledRot.current.z = lerp(settledRot.current.z, targetRot.z, 0.12);
      group.position.copy(settledPos.current);
      group.rotation.set(settledRot.current.x, settledRot.current.y, settledRot.current.z);
      group.scale.setScalar(1 + hoverTarget * 0.04);
    }

    if (flipRef.current) {
      const targetFlip = flipped ? Math.PI : 0;
      flipRef.current.rotation.y = lerp(flipRef.current.rotation.y, targetFlip, 0.16);
    }
  });

  const frontMat = mats.fronts[spec.group][spec.frontKind];
  const backMat = mats.backs[spec.group];
  const materials = [mats.edge, mats.edge, mats.edge, mats.edge, frontMat, backMat];

  const interactive = spec.interactiveIndex !== null;

  function handleClick(e: { stopPropagation: () => void }) {
    e.stopPropagation();
    if (phaseRef.current !== "catalogue" || !interactive) return;
    if (!fanned) onToggleFan();
    else onToggleFlip();
  }

  return (
    <group ref={groupRef}>
      <group
        ref={flipRef}
        onClick={interactive ? handleClick : undefined}
        onPointerOver={interactive ? () => (hoverRef.current = 1) : undefined}
        onPointerOut={interactive ? () => (hoverRef.current = 0) : undefined}
      >
        <mesh material={materials}>
          <boxGeometry args={[CARD_W, CARD_H, CARD_T]} />
        </mesh>
      </group>
    </group>
  );
}

function Scene({
  phaseRef,
  tRef,
  fanState,
  flipState,
  onToggleFan,
  onToggleFlip,
}: {
  phaseRef: React.RefObject<Phase>;
  tRef: React.RefObject<number>;
  fanState: Record<World, boolean>;
  flipState: Set<string>;
  onToggleFan: (g: World) => void;
  onToggleFlip: (id: string) => void;
}) {
  const mats = useSharedMaterials();

  useFrame((_state, delta) => {
    if (phaseRef.current !== "closed") {
      tRef.current += delta;
    }
  });

  return (
    <>
      <color attach="background" args={["#0a0908"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[2.5, 3, 4]} intensity={1.1} />
      <directionalLight position={[-3, -1, -2]} intensity={0.35} />

      <DeckBox phaseRef={phaseRef} tRef={tRef} mats={mats} />

      {CARD_SPECS.map((spec) => (
        <FlyingCard
          key={spec.id}
          spec={spec}
          phaseRef={phaseRef}
          tRef={tRef}
          mats={mats}
          fanned={fanState[spec.group]}
          flipped={flipState.has(spec.id)}
          onToggleFan={() => onToggleFan(spec.group)}
          onToggleFlip={() => onToggleFlip(spec.id)}
        />
      ))}
    </>
  );
}

export function ExperimentC2Transform() {
  const [phase, setPhase] = useState<Phase>("closed");
  const phaseRef = useRef<Phase>("closed");
  const tRef = useRef(0);
  const [fanState, setFanState] = useState<Record<World, boolean>>({ alice: false, vitraji: false });
  const [flipState, setFlipState] = useState<Set<string>>(new Set());
  const [showCatalogueLabels, setShowCatalogueLabels] = useState(false);

  function goPhase(next: Phase) {
    phaseRef.current = next;
    setPhase(next);
  }

  function handleStart() {
    if (phaseRef.current !== "closed") return;
    tRef.current = 0;
    goPhase("opening");
    window.setTimeout(() => {
      if (phaseRef.current === "opening") goPhase("catalogue");
      setShowCatalogueLabels(true);
    }, ORGANIZE_END * 1000);
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
          phaseRef={phaseRef}
          tRef={tRef}
          fanState={fanState}
          flipState={flipState}
          onToggleFan={toggleFan}
          onToggleFlip={toggleFlip}
        />
      </Canvas>

      {phase === "closed" && (
        <button
          type="button"
          onClick={handleStart}
          aria-label="Открыть колоду"
          className="absolute inset-0 z-10 cursor-pointer"
        />
      )}

      <p className="pointer-events-none absolute left-6 top-6 z-20 text-[10px] font-medium tracking-[0.3em] text-white/40 sm:left-10 sm:top-8">
        EXPERIMENT C2 — INTRO BECOMES CATALOGUE
      </p>

      {phase === "closed" && (
        <p className="pointer-events-none absolute bottom-10 left-1/2 z-20 -translate-x-1/2 text-[10px] font-medium tracking-[0.35em] text-white/40">
          НАЖМИТЕ
        </p>
      )}

      {showCatalogueLabels && (
        <>
          <p className="pointer-events-none absolute bottom-10 left-[28%] z-20 -translate-x-1/2 text-[11px] font-medium tracking-[0.35em] text-white/70 transition-opacity duration-700">
            АЛИСА
          </p>
          <p className="pointer-events-none absolute bottom-10 left-[72%] z-20 -translate-x-1/2 text-[11px] font-medium tracking-[0.35em] text-white/70 transition-opacity duration-700">
            ВИТРАЖИ
          </p>
        </>
      )}
    </div>
  );
}
