"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Image from "next/image";
import * as THREE from "three";

import { Card3D } from "@/components/object-kit/Card3D";
import { buildStackLayout, type CardLayout } from "@/components/object-kit/DeckStack3D";
import { ALICE_DECK, DECKS, type World } from "@/components/object-kit/deck-config";
import { AliceBoxGlow } from "./AliceBoxGlow";
import { BurstVFX } from "./BoxBurstVFX";
import { makeGlowTexture } from "./glowTexture";
import aliceMacro from "../../../assets/prototype/03-alice-macro-prototype.png";
import vitrajiMacro from "../../../assets/prototype/04-vitraji-macro-prototype.png";

const CLOSEUP_IMAGE: Record<World, typeof aliceMacro> = { alice: aliceMacro, vitraji: vitrajiMacro };
const DECK_LABEL: Record<World, string> = { alice: "АЛИСА", vitraji: "ВИТРАЖИ" };

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

// The cloud is the hero now, not the box VFX — more cards than a believable
// "closed stack" needs, so the eruption reads as abundant.
const CARDS_PER_GROUP = 24;
const INTERACTIVE_PER_GROUP = 3;

type StackCenters = Record<World, THREE.Vector3>;

/**
 * Landscape/desktop keeps the two decks side by side. Portrait stacks them
 * vertically instead — at this scale, keeping them side-by-side on a phone
 * would force both down to tiny, hard-to-read objects.
 */
function getStackCenters(isPortrait: boolean): StackCenters {
  return isPortrait
    ? { alice: new THREE.Vector3(0, 2.1, 0), vitraji: new THREE.Vector3(0, -2.1, 0) }
    : { alice: new THREE.Vector3(-1.6, -0.05, 0), vitraji: new THREE.Vector3(1.6, -0.05, 0) };
}

// The organized catalogue reads as the composition's new focal point, not a
// pair of small objects — every rest/fan offset authored in DeckStack3D
// (for a "scale 1" deck) is scaled up uniformly around each STACK_CENTER.
const CATALOGUE_SCALE = 2.8;

// The box is the very first thing on screen — pulled closer to camera and
// rendered larger so the opening doesn't read as a small object lost in a
// big black void.
const BOX_VISUAL_SCALE = 1.45;
const BOX_POS = new THREE.Vector3(0, 0, 2.7);
// The box never opens — cards spawn just inside its (intact) top and shoot
// straight up through that region (LAUNCH_POS) before diverging.
const BOX_TOP_Y = (ALICE_DECK.box.size.h / 2) * BOX_VISUAL_SCALE;
const RELEASE_POS = BOX_POS.clone().add(new THREE.Vector3(0, BOX_TOP_Y - 0.15, 0));
const LAUNCH_POS = BOX_POS.clone().add(new THREE.Vector3(0, BOX_TOP_Y + 0.9, 0));
const LAUNCH_T = 0.32; // fraction of each card's travel window spent shooting straight up before diverging

// Where the selected deck rushes toward the camera for the close-up, and
// where the other deck recedes to while it happens.
const CLOSEUP_CENTER = new THREE.Vector3(0, 0, 4.3);
const CLOSEUP_SCALE = 2.5;
const RECEDE_SCALE = 0.25;

// Phase durations (seconds since the click). Only Alice's box is involved —
// the intro deliberately starts from one object, not two. The box is just a
// believable origin now, not the main event: CALM -> a brief activation cue
// -> the card cloud takes over almost immediately.
const CALM_END = 0.15;
const LIGHT_END = 0.35;
const INTENSITY_END = 0.5;
const OPEN_END = INTENSITY_END;

const T_RELEASE = 1.0;
const T_CHAOS_HOLD = 0.7;
const T_ORGANIZE = 1.1;
const RELEASE_END = OPEN_END + T_RELEASE;
const CHAOS_END = RELEASE_END + T_CHAOS_HOLD;
const ORGANIZE_END = CHAOS_END + T_ORGANIZE;

/** 0..1 — internal light leaking through the closed seam, before it intensifies. */
function pressureLevel(t: number) {
  if (t < CALM_END) return 0;
  if (t < LIGHT_END) return easeInOutCubic(clamp01((t - CALM_END) / (LIGHT_END - CALM_END)));
  return 1;
}
/** 0..1 — the light intensifying toward the burst, then decaying as the card cloud takes over. */
function burstLevel(t: number) {
  if (t < LIGHT_END) return 0;
  if (t < INTENSITY_END) return easeOutCubic(clamp01((t - LIGHT_END) / (INTENSITY_END - LIGHT_END)));
  return Math.max(0, 1 - clamp01((t - INTENSITY_END) / 0.9));
}

type FlightSpec = {
  id: string;
  group: World;
  layout: CardLayout;
  spawnStart: number;
  chaosPos: THREE.Vector3;
  chaosRot: THREE.Euler;
  chaosScale: number;
  /**
   * Fixed for the card's entire life — chaos flight AND the organized
   * state. Never toggled at runtime: the same face the viewer glimpses
   * mid-flight is the face it settles on, so nothing appears to swap
   * identity once it lands. Interactive (visible top-of-stack) cards are
   * always fronts, since they need to be recognizable once organized.
   */
  showsBack: boolean;
  /** First few cards out of the box get a brief accompanying glow trail. */
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

      // golden-angle spiral cloud, biased so a third of the cards swing very
      // close to (and briefly fill) the camera view while the rest sit
      // further back — an art-directed cloud, not a uniform random scatter.
      const golden = 2.399963;
      const angle = globalIndex * golden + side * 0.3;
      const radiusBand = 1.6 + (globalIndex % 5) * 0.42;
      const closePass = globalIndex % 3 === 0;
      const chaosPos = new THREE.Vector3(
        Math.cos(angle) * radiusBand * (0.85 + r1 * 0.5) + side * 0.4,
        (r2 - 0.5) * 4.6,
        closePass ? 2.8 + r3 * 2.0 : -2.6 - r3 * 2.4,
      );
      const chaosRot = new THREE.Euler((r1 - 0.5) * Math.PI * 1.4, (r2 - 0.5) * Math.PI * 1.6, (r3 - 0.5) * Math.PI);
      const chaosScale = closePass ? 1.15 + r4 * 0.75 : 0.72 + r4 * 0.28;

      const spawnStart = OPEN_END + (localIndex / CARDS_PER_GROUP) * T_RELEASE * 0.72 + r1 * 0.06;
      // Stable for life: interactive (top-of-stack) cards are always
      // fronts, since the same card glimpsed in flight has to be
      // recognizable once it's sitting on top of the organized deck. Bulk
      // (hidden-in-the-pile) cards lean heavily toward backs, both to hide
      // the 3-artwork repetition across ~45 cards and because that's all
      // that's ever visible of them once organized — so whichever face they
      // launch with is already their final one.
      const showsBack = cardLayout.interactiveIndex === null && r2 < 0.78;

      specs.push({
        id: `${group}-${localIndex}`,
        group,
        layout: cardLayout,
        spawnStart,
        chaosPos,
        chaosRot,
        chaosScale,
        showsBack,
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
  stackCenters,
  closeupGroup,
  closeupGroupRef,
  onSelectDeck,
}: {
  spec: FlightSpec;
  phase: Phase;
  phaseRef: React.RefObject<Phase>;
  tRef: React.RefObject<number>;
  glowTexture: THREE.Texture;
  fanState: Record<World, boolean>;
  stackCenters: StackCenters;
  closeupGroup: World | null;
  closeupGroupRef: React.RefObject<World | null>;
  onSelectDeck: (g: World) => void;
}) {
  const deck = DECKS[spec.group];
  const groupRef = useRef<THREE.Group>(null);
  const trailRef = useRef<THREE.Mesh>(null);

  const restPos = useMemo(
    () => stackCenters[spec.group].clone().add(new THREE.Vector3(...spec.layout.rest.pos).multiplyScalar(CATALOGUE_SCALE)),
    [spec, stackCenters],
  );
  const fanPos = useMemo(
    () => stackCenters[spec.group].clone().add(new THREE.Vector3(...spec.layout.fan.pos).multiplyScalar(CATALOGUE_SCALE)),
    [spec, stackCenters],
  );
  const closeupPos = useMemo(
    () => CLOSEUP_CENTER.clone().add(new THREE.Vector3(spec.layout.rest.pos[0] * 0.4, spec.layout.rest.pos[1] * 0.4, spec.layout.rest.pos[2] * 0.4)),
    [spec],
  );
  const recedePos = useMemo(() => stackCenters[spec.group].clone().add(new THREE.Vector3(0, 0, -3.4)), [spec, stackCenters]);
  const restRotZ = spec.layout.rest.rot[2];
  const fanRotZ = spec.layout.fan.rot[2];

  const settledPos = useRef(restPos.clone());
  const settledRotZ = useRef(restRotZ);
  const settledScale = useRef(1);

  useFrame((state) => {
    const t = tRef.current;
    const group = groupRef.current;

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
        // shoots straight up out of the box, aligned with the light burst
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
      settledScale.current = 1;

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
      group.scale.setScalar(lerp(spec.chaosScale, CATALOGUE_SCALE, orgT));
      settledPos.current.copy(group.position);
      settledRotZ.current = lerp(spec.chaosRot.z, restRotZ, orgT);
      settledScale.current = CATALOGUE_SCALE;
    } else {
      if (trailRef.current) trailRef.current.visible = false;
      const activeCloseup = closeupGroupRef.current;
      let target: THREE.Vector3;
      let targetRotZ: number;
      let targetScale: number;
      if (activeCloseup === spec.group) {
        target = closeupPos;
        targetRotZ = 0;
        targetScale = CLOSEUP_SCALE;
      } else if (activeCloseup !== null) {
        target = recedePos;
        targetRotZ = restRotZ;
        targetScale = RECEDE_SCALE;
      } else {
        const fanned = fanState[spec.group];
        target = fanned ? fanPos : restPos;
        targetRotZ = fanned ? fanRotZ : restRotZ;
        targetScale = CATALOGUE_SCALE;
      }
      settledPos.current.lerp(target, 0.12);
      settledRotZ.current = lerp(settledRotZ.current, targetRotZ, 0.12);
      settledScale.current = lerp(settledScale.current, targetScale, 0.12);
      group.position.copy(settledPos.current);
      group.rotation.set(0, 0, settledRotZ.current);
      group.scale.setScalar(settledScale.current);
    }
  });

  const interactive = phase === "catalogue" && closeupGroup === null && fanState[spec.group] && spec.layout.interactiveIndex !== null;

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
        flipped={spec.showsBack}
        interactive={interactive}
        onClick={() => {
          if (phaseRef.current !== "catalogue" || closeupGroupRef.current !== null || !fanState[spec.group]) return;
          onSelectDeck(spec.group);
        }}
      />
    </group>
  );
}

function StackHitArea({ pos, onFan }: { pos: THREE.Vector3; onFan: () => void }) {
  return (
    <mesh
      position={[pos.x, pos.y, pos.z + 0.06]}
      visible={false}
      onClick={(e) => {
        e.stopPropagation();
        onFan();
      }}
    >
      <planeGeometry args={[2.3, 3.5]} />
    </mesh>
  );
}

/** A larger hit-area behind the fanned spread — clicking the deck (not a card) opens the close-up. */
function DeckAreaHitArea({ pos, size, onSelect }: { pos: THREE.Vector3; size: [number, number]; onSelect: () => void }) {
  return (
    <mesh
      position={[pos.x, pos.y, pos.z - 0.3]}
      visible={false}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <planeGeometry args={size} />
    </mesh>
  );
}

function Scene({
  phase,
  phaseRef,
  tRef,
  pressureRef,
  burstRef,
  fanState,
  stackCenters,
  isPortrait,
  closeupGroup,
  closeupGroupRef,
  onToggleFan,
  onSelectDeck,
}: {
  phase: Phase;
  phaseRef: React.RefObject<Phase>;
  tRef: React.RefObject<number>;
  pressureRef: React.RefObject<number>;
  burstRef: React.RefObject<number>;
  fanState: Record<World, boolean>;
  stackCenters: StackCenters;
  isPortrait: boolean;
  closeupGroup: World | null;
  closeupGroupRef: React.RefObject<World | null>;
  onToggleFan: (g: World) => void;
  onSelectDeck: (g: World) => void;
}) {
  const boxWrapperRef = useRef<THREE.Group>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const keyLightRef = useRef<THREE.DirectionalLight>(null);
  const glowTexture = useMemo(() => makeGlowTexture(true), []);
  // Fan spreads horizontally regardless of stacking direction — sized so a
  // portrait deck's own fan never collides with its (vertically offset)
  // neighbor, and a landscape deck's fan never reaches the other deck's.
  const deckAreaSize: [number, number] = isPortrait ? [4.6, 3.4] : [3.0, 4.2];

  useFrame((_state, delta) => {
    if (phaseRef.current !== "closed") {
      tRef.current += delta;
    }
    const t = tRef.current;
    pressureRef.current = pressureLevel(t);
    burstRef.current = burstLevel(t);

    // exposure lift: nearby surfaces and cards read brighter right through the burst
    if (ambientRef.current) ambientRef.current.intensity = 0.65 + burstRef.current * 0.35;
    if (keyLightRef.current) keyLightRef.current.intensity = 1.1 + burstRef.current * 0.7;

    if (boxWrapperRef.current) {
      const fadeT = clamp01((t - OPEN_END) / 0.5);
      boxWrapperRef.current.scale.setScalar(BOX_VISUAL_SCALE * (1 - fadeT));
      boxWrapperRef.current.visible = fadeT < 0.995;
    }
  });

  return (
    <>
      <color attach="background" args={["#0a0908"]} />
      <ambientLight ref={ambientRef} intensity={0.65} />
      <directionalLight ref={keyLightRef} position={[2.5, 3, 4]} intensity={1.1} />
      <directionalLight position={[-3, -1, -2]} intensity={0.35} />

      {/* The box stays one intact object throughout — never split or hinged
          — and simply shrinks away as a whole once the light above it has
          taken over as the focus. */}
      <group ref={boxWrapperRef} position={BOX_POS.toArray()}>
        <AliceBoxGlow deck={ALICE_DECK} interactive={phase === "closed"} pressureRef={pressureRef} burstRef={burstRef} />
      </group>

      <BurstVFX burstRef={burstRef} tRef={tRef} spawnAt={LIGHT_END} position={RELEASE_POS} />

      {FLIGHT_SPECS.map((spec) => (
        <FlightCard
          key={spec.id}
          spec={spec}
          phase={phase}
          phaseRef={phaseRef}
          tRef={tRef}
          glowTexture={glowTexture}
          fanState={fanState}
          stackCenters={stackCenters}
          closeupGroup={closeupGroup}
          closeupGroupRef={closeupGroupRef}
          onSelectDeck={onSelectDeck}
        />
      ))}

      {phase === "catalogue" && closeupGroup === null && !fanState.alice && (
        <StackHitArea pos={stackCenters.alice} onFan={() => onToggleFan("alice")} />
      )}
      {phase === "catalogue" && closeupGroup === null && !fanState.vitraji && (
        <StackHitArea pos={stackCenters.vitraji} onFan={() => onToggleFan("vitraji")} />
      )}
      {phase === "catalogue" && closeupGroup === null && fanState.alice && (
        <DeckAreaHitArea pos={stackCenters.alice} size={deckAreaSize} onSelect={() => onSelectDeck("alice")} />
      )}
      {phase === "catalogue" && closeupGroup === null && fanState.vitraji && (
        <DeckAreaHitArea pos={stackCenters.vitraji} size={deckAreaSize} onSelect={() => onSelectDeck("vitraji")} />
      )}
    </>
  );
}

export function ExperimentC2Transform() {
  const [phase, setPhase] = useState<Phase>("closed");
  const phaseRef = useRef<Phase>("closed");
  const tRef = useRef(0);
  const pressureRef = useRef(0);
  const burstRef = useRef(0);
  const [fanState, setFanState] = useState<Record<World, boolean>>({ alice: false, vitraji: false });
  const [closeupGroup, setCloseupGroup] = useState<World | null>(null);
  const closeupGroupRef = useRef<World | null>(null);
  const [closeupVisible, setCloseupVisible] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    function check() {
      setIsPortrait(window.innerWidth < window.innerHeight);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const stackCenters = useMemo(() => getStackCenters(isPortrait), [isPortrait]);

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
  function selectDeck(group: World) {
    closeupGroupRef.current = group;
    setCloseupGroup(group);
    window.setTimeout(() => setCloseupVisible(true), 650);
  }
  function exitCloseup() {
    setCloseupVisible(false);
    window.setTimeout(() => {
      closeupGroupRef.current = null;
      setCloseupGroup(null);
    }, 500);
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#0a0908]">
      <Canvas camera={{ fov: 45, position: [0, 0, 6] }} dpr={[1, 2]}>
        <Scene
          phase={phase}
          phaseRef={phaseRef}
          tRef={tRef}
          pressureRef={pressureRef}
          burstRef={burstRef}
          fanState={fanState}
          stackCenters={stackCenters}
          isPortrait={isPortrait}
          closeupGroup={closeupGroup}
          closeupGroupRef={closeupGroupRef}
          onToggleFan={toggleFan}
          onSelectDeck={selectDeck}
        />
        <PhaseWatcher phaseRef={phaseRef} tRef={tRef} onCatalogue={() => goPhase("catalogue")} />
        <ResponsiveCamera />
      </Canvas>

      {phase === "closed" && (
        <button
          type="button"
          onClick={handleStart}
          aria-label="Открыть колоду"
          className="absolute left-1/2 top-1/2 z-10 h-[70%] w-[42%] -translate-x-1/2 -translate-y-1/2 cursor-pointer"
        />
      )}

      {phase === "catalogue" && !closeupGroup && (
        <>
          <p
            className={`pointer-events-none absolute z-20 text-[11px] font-medium tracking-[0.35em] text-white/70 ${
              isPortrait ? "left-1/2 top-[49%] -translate-x-1/2" : "bottom-10 left-[28%] -translate-x-1/2"
            }`}
          >
            АЛИСА
          </p>
          <p
            className={`pointer-events-none absolute z-20 text-[11px] font-medium tracking-[0.35em] text-white/70 ${
              isPortrait ? "left-1/2 top-[87%] -translate-x-1/2" : "bottom-10 left-[72%] -translate-x-1/2"
            }`}
          >
            ВИТРАЖИ
          </p>
        </>
      )}

      {closeupGroup && (
        <>
          <div
            className={`pointer-events-none absolute inset-0 z-30 transition-opacity duration-[1200ms] ease-out ${closeupVisible ? "opacity-100" : "opacity-0"}`}
          >
            <Image src={CLOSEUP_IMAGE[closeupGroup]} alt={`Деталь колоды «${DECK_LABEL[closeupGroup]}»`} fill priority className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />
          </div>
          <button
            type="button"
            onClick={exitCloseup}
            className={`pointer-events-auto absolute bottom-10 left-6 z-40 text-[11px] font-medium tracking-[0.3em] text-white/70 transition-opacity duration-500 hover:text-white sm:left-10 ${closeupVisible ? "opacity-100" : "opacity-0"}`}
          >
            ← НАЗАД
          </button>
        </>
      )}
    </div>
  );
}

/**
 * The two decks sit at a fixed world offset from center. Three's `fov` prop
 * is VERTICAL, so on a narrow/tall (portrait) viewport the derived
 * horizontal FOV shrinks well below what's needed to keep a fanned deck's
 * spread in frame — on a phone it would render partly off-screen. This
 * widens the vertical fov on portrait aspects just enough to guarantee a
 * minimum horizontal FOV, leaving desktop/landscape untouched.
 */
function ResponsiveCamera() {
  const size = useThree((s) => s.size);
  const get = useThree((s) => s.get);

  useEffect(() => {
    const { camera } = get();
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const aspect = size.width / size.height;
    const desktopVFovDeg = 45;
    let vFovDeg = desktopVFovDeg;
    if (aspect < 1) {
      // 46° keeps a single fanned deck's spread (cards reach roughly ±2.0
      // world units from its own center) inside frame on a phone.
      const minHFovRad = (46 * Math.PI) / 180;
      const vFovRad = 2 * Math.atan(Math.tan(minHFovRad / 2) / aspect);
      vFovDeg = Math.max(desktopVFovDeg, (vFovRad * 180) / Math.PI);
    }
    camera.fov = vFovDeg;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }, [size, get]);

  return null;
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
