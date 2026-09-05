"use client";

import { useState } from "react";
import { Canvas } from "@react-three/fiber";

import { Card3D } from "./Card3D";
import { DeckStack3D } from "./DeckStack3D";
import { TarotBox3D } from "./TarotBox3D";
import { ALICE_DECK, VITRAJI_DECK, type DeckConfig } from "./deck-config";

function CellLights() {
  return (
    <>
      <color attach="background" args={["#141210"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 2.5, 3]} intensity={1.15} />
      <directionalLight position={[-2, -1, -1.5]} intensity={0.35} />
    </>
  );
}

function TestCell({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-sm border border-white/10 bg-[#141210]">
      <Canvas camera={{ fov: 40, position: [0, 0, 3.4] }} dpr={[1, 2]}>
        {children}
      </Canvas>
      <p className="pointer-events-none absolute left-2 top-2 text-[9px] font-medium tracking-[0.2em] text-white/50">
        {label}
      </p>
      {note && (
        <p className="pointer-events-none absolute bottom-2 left-2 right-2 text-[8px] font-medium leading-tight tracking-[0.08em] text-amber-200/60">
          {note}
        </p>
      )}
    </div>
  );
}

function SingleCardCell({ deck, startFlipped }: { deck: DeckConfig; startFlipped: boolean }) {
  const [flipped, setFlipped] = useState(startFlipped);
  return (
    <>
      <CellLights />
      <Card3D
        frontTexture={deck.cardFronts[0]}
        backTexture={deck.cardBack}
        tint={deck.tint}
        flipped={flipped}
        onClick={() => setFlipped((f) => !f)}
      />
    </>
  );
}

function StackCell({ deck }: { deck: DeckConfig }) {
  return (
    <>
      <CellLights />
      <DeckStack3D deck={deck} />
    </>
  );
}

function BoxCell({ deck }: { deck: DeckConfig }) {
  const note = `PLACEHOLDER: ${deck.box.placeholderFaces.join(", ")}`;
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-sm border border-white/10 bg-[#141210]">
      <Canvas camera={{ fov: 40, position: [0, 0, 3.4] }} dpr={[1, 2]}>
        <CellLights />
        <TarotBox3D deck={deck} />
      </Canvas>
      <p className="pointer-events-none absolute left-2 top-2 text-[9px] font-medium tracking-[0.2em] text-white/50">
        {deck.label} — BOX
      </p>
      <p className="pointer-events-none absolute bottom-2 left-2 right-2 text-[8px] font-medium leading-tight tracking-[0.08em] text-amber-200/70">
        {note}
      </p>
    </div>
  );
}

function DeckRow({ deck }: { deck: DeckConfig }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <TestCell label={`${deck.label} — CARD (CLICK TO FLIP)`}>
        <SingleCardCell deck={deck} startFlipped={false} />
      </TestCell>
      <TestCell label={`${deck.label} — CARD (FLIPPED)`}>
        <SingleCardCell deck={deck} startFlipped={true} />
      </TestCell>
      <TestCell label={`${deck.label} — STACK (CLICK TO FAN)`}>
        <StackCell deck={deck} />
      </TestCell>
      <BoxCell deck={deck} />
    </div>
  );
}

export function ObjectTestScene() {
  return (
    <div className="min-h-dvh w-full bg-[#0a0908] px-4 py-8 sm:px-8 sm:py-10">
      <p className="mb-1 text-[10px] font-medium tracking-[0.3em] text-white/50">OBJECT-TEST — INFRASTRUCTURE ONLY</p>
      <p className="mb-6 max-w-2xl text-[10px] font-medium leading-relaxed tracking-[0.05em] text-white/30">
        Card3D / DeckStack3D / TarotBox3D — reusable object kit for the future C2 intro + A-style
        catalogue. Sources are prototype tabletop-comp crops, not real product photography — see
        report. Interactions: hover a stack card (lift), click a stack (fan), click a fanned card
        (flip), hover a box (tilt).
      </p>

      <div className="mb-10">
        <p className="mb-3 text-[10px] font-medium tracking-[0.35em] text-white/70">АЛИСА</p>
        <DeckRow deck={ALICE_DECK} />
      </div>

      <div>
        <p className="mb-3 text-[10px] font-medium tracking-[0.35em] text-white/70">ВИТРАЖИ</p>
        <DeckRow deck={VITRAJI_DECK} />
      </div>
    </div>
  );
}
