"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";

import { Card3D } from "./Card3D";
import type { DeckConfig } from "./deck-config";

export type CardLayout = {
  id: number;
  interactiveIndex: number | null;
  frontIndex: number;
  rest: { pos: [number, number, number]; rot: [number, number, number] };
  fan: { pos: [number, number, number]; rot: [number, number, number] };
};

/** Exported so other consumers (e.g. the C2 intro) can arrive at exactly this resting/fan layout. */
export function buildStackLayout(cardCount: number, interactiveCount: number): CardLayout[] {
  const mid = (interactiveCount - 1) / 2;
  return Array.from({ length: cardCount }, (_, i) => {
    const interactiveIndex = i < interactiveCount ? i : null;
    // Z gaps tuned for Card3D's thin (0.010) cardstock thickness — tight enough
    // to read as a pressed pile rather than a fanned-open deck.
    const rest: CardLayout["rest"] =
      interactiveIndex !== null
        ? {
            pos: [(interactiveIndex - mid) * 0.02, (interactiveIndex - mid) * -0.015, interactiveIndex * 0.0025],
            rot: [0, 0, (interactiveIndex - mid) * 0.05],
          }
        : {
            pos: [-0.06, -0.02, -0.005 - (i - interactiveCount) * 0.0025],
            rot: [0, 0, 0.14],
          };
    const fan: CardLayout["fan"] =
      interactiveIndex !== null
        ? {
            pos: [(interactiveIndex - mid) * 0.5, Math.abs(interactiveIndex - mid) * 0.08 + 0.03, interactiveIndex * 0.01],
            rot: [0, 0, (interactiveIndex - mid) * 0.32],
          }
        : rest;
    return { id: i, interactiveIndex, frontIndex: i % 3, rest, fan };
  });
}

function AnimatedCard({
  layout,
  deck,
  fanned,
  flipped,
  onToggle,
}: {
  layout: CardLayout;
  deck: DeckConfig;
  fanned: boolean;
  flipped: boolean;
  onToggle: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const current = useRef(new THREE.Vector3(...layout.rest.pos));
  const currentRot = useRef(new THREE.Euler(...layout.rest.rot));

  useFrame(() => {
    const target = fanned ? layout.fan : layout.rest;
    current.current.x = THREE.MathUtils.lerp(current.current.x, target.pos[0], 0.14);
    current.current.y = THREE.MathUtils.lerp(current.current.y, target.pos[1], 0.14);
    current.current.z = THREE.MathUtils.lerp(current.current.z, target.pos[2], 0.14);
    currentRot.current.z = THREE.MathUtils.lerp(currentRot.current.z, target.rot[2], 0.14);
    if (ref.current) {
      ref.current.position.copy(current.current);
      ref.current.rotation.z = currentRot.current.z;
    }
  });

  return (
    <group ref={ref}>
      <Card3D
        frontTexture={deck.cardFronts[layout.frontIndex]}
        backTexture={deck.cardBack}
        tint={deck.tint}
        flipped={flipped}
        interactive={layout.interactiveIndex !== null}
        onClick={() => {
          if (!fanned) return; // clicking any card while closed is handled by the stack hit-area
          onToggle();
        }}
      />
    </group>
  );
}

export type DeckStack3DProps = {
  deck: DeckConfig;
  cardCount?: number;
  interactiveCount?: number;
  fanned?: boolean;
  onFannedChange?: (fanned: boolean) => void;
} & Omit<ThreeElements["group"], "onClick">;

/**
 * A reusable stack of physical cards for one deck. States: idle (tight
 * pile), fan (top cards spread into a hand), and per-card hover — which
 * serves as the "selected / lifted" reaction (Card3D lifts+scales toward
 * the pointer). Only the top `interactiveCount` cards are individually
 * addressable; the rest are static bulk forming the stack's visible
 * thickness, matching the DOM prototype in Experiment A.
 */
export function DeckStack3D({ deck, cardCount = 12, interactiveCount = 3, fanned: fannedProp, onFannedChange, ...groupProps }: DeckStack3DProps) {
  const [internalFanned, setInternalFanned] = useState(false);
  const fanned = fannedProp ?? internalFanned;
  const [flipped, setFlipped] = useState<Set<number>>(new Set());

  const layout = useMemo(() => buildStackLayout(cardCount, interactiveCount), [cardCount, interactiveCount]);

  function setFanned(next: boolean) {
    setInternalFanned(next);
    onFannedChange?.(next);
  }

  function toggleFlip(id: number) {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <group {...groupProps}>
      {!fanned && (
        <mesh
          position={[0, 0, 0.05]}
          onClick={(e) => {
            e.stopPropagation();
            setFanned(true);
          }}
          visible={false}
        >
          <planeGeometry args={[1.1, 1.5]} />
        </mesh>
      )}
      {layout.map((cardLayout) => (
        <AnimatedCard
          key={cardLayout.id}
          layout={cardLayout}
          deck={deck}
          fanned={fanned}
          flipped={flipped.has(cardLayout.id)}
          onToggle={() => toggleFlip(cardLayout.id)}
        />
      ))}
    </group>
  );
}
