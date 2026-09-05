"use client";

import Image, { type StaticImageData } from "next/image";
import { useState, useSyncExternalStore } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

import aliceBox from "../../../assets/experiments/cards/alice-box.png";
import aliceCard1 from "../../../assets/experiments/cards/alice-card-1.png";
import aliceCard2 from "../../../assets/experiments/cards/alice-card-2.png";
import aliceCard3 from "../../../assets/experiments/cards/alice-card-3.png";
import aliceBack from "../../../assets/experiments/cards/alice-deck-back.png";
import vitrajiCard1 from "../../../assets/experiments/cards/vitraji-card-1.png";
import vitrajiCard2 from "../../../assets/experiments/cards/vitraji-card-2.png";
import vitrajiCard3 from "../../../assets/experiments/cards/vitraji-card-3.png";
import vitrajiBack from "../../../assets/experiments/cards/vitraji-deck-back.png";

type World = "alice" | "vitraji";

type CardDef = {
  id: string;
  front: StaticImageData;
};

const DECKS: Record<World, { label: string; cards: CardDef[]; back: StaticImageData; tint: string }> = {
  alice: {
    label: "АЛИСА",
    back: aliceBack,
    tint: "saturate-[1.05] sepia-[0.12] hue-rotate-[-6deg]",
    cards: [
      { id: "a1", front: aliceCard1 },
      { id: "a2", front: aliceCard2 },
      { id: "a3", front: aliceCard3 },
    ],
  },
  vitraji: {
    label: "ВИТРАЖИ",
    back: vitrajiBack,
    tint: "saturate-[1.1] hue-rotate-[3deg] brightness-[0.98]",
    cards: [
      { id: "v1", front: vitrajiCard1 },
      { id: "v2", front: vitrajiCard2 },
      { id: "v3", front: vitrajiCard3 },
    ],
  },
};

const spring = { stiffness: 240, damping: 22, mass: 0.6 };

function subscribeCompact(callback: () => void) {
  const mq = window.matchMedia("(max-width: 639px)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}
function getCompactSnapshot() {
  return window.matchMedia("(max-width: 639px)").matches;
}
function getCompactServerSnapshot() {
  return false;
}
function useCompact() {
  return useSyncExternalStore(subscribeCompact, getCompactSnapshot, getCompactServerSnapshot);
}

function PlayingCard({
  card,
  back,
  index,
  total,
  fanned,
  flipped,
  tint,
  compact,
  onFlip,
}: {
  card: CardDef;
  back: StaticImageData;
  index: number;
  total: number;
  fanned: boolean;
  flipped: boolean;
  tint: string;
  compact: boolean;
  onFlip: () => void;
}) {
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const tiltX = useSpring(useTransform(py, [0, 1], [9, -9]), spring);
  const tiltY = useSpring(useTransform(px, [0, 1], [-9, 9]), spring);

  const mid = (total - 1) / 2;
  const restX = (index - mid) * (compact ? 3 : 5);
  const restY = (index - mid) * -4;
  const restRotate = (index - mid) * 3;

  const fanX = (index - mid) * (compact ? 52 : 96);
  const fanY = Math.abs(index - mid) * (compact ? 12 : 20) + (compact ? 4 : 8);
  const fanRotate = (index - mid) * 11;

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const b = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - b.left) / b.width);
    py.set((e.clientY - b.top) / b.height);
  }
  function handlePointerLeave() {
    px.set(0.5);
    py.set(0.5);
  }

  return (
    <motion.div
      drag={fanned}
      dragElastic={0.15}
      dragSnapToOrigin
      dragTransition={{ bounceStiffness: 320, bounceDamping: 24 }}
      onClick={onFlip}
      onPointerMove={fanned ? handlePointerMove : undefined}
      onPointerLeave={fanned ? handlePointerLeave : undefined}
      initial={false}
      animate={{
        x: fanned ? fanX : restX,
        y: fanned ? fanY : restY,
        rotate: fanned ? fanRotate : restRotate,
      }}
      transition={{ ...spring, delay: fanned ? index * 0.05 : 0 }}
      data-card-id={card.id}
      data-flipped={flipped}
      className="absolute left-1/2 top-1/2 h-[240px] w-[168px] -translate-x-1/2 -translate-y-1/2 touch-none sm:h-[300px] sm:w-[210px]"
      style={{ zIndex: 10 + index, cursor: fanned ? "grab" : "pointer" }}
      whileTap={fanned ? { cursor: "grabbing", scale: 1.02 } : { scale: 0.99 }}
    >
      <motion.div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
          rotateX: fanned ? tiltX : 0,
          rotateY: fanned ? tiltY : 0,
        }}
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: "100%", height: "100%", position: "relative", transformStyle: "preserve-3d" }}
        >
          <div
            className={`absolute inset-0 overflow-hidden rounded-[10px] shadow-[0_20px_50px_rgba(0,0,0,0.55)] ring-1 ring-white/10 ${tint}`}
            style={{ backfaceVisibility: "hidden" }}
          >
            <Image src={card.front} alt="" fill sizes="210px" className="object-cover" />
          </div>
          <div
            className={`absolute inset-0 overflow-hidden rounded-[10px] shadow-[0_20px_50px_rgba(0,0,0,0.55)] ring-1 ring-white/10 ${tint}`}
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <Image src={back} alt="" fill sizes="210px" className="object-cover" />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function DeckGroup({ world, side, compact }: { world: World; side: "left" | "right"; compact: boolean }) {
  const deck = DECKS[world];
  const [fanned, setFanned] = useState(false);
  const boxOffset = compact ? 52 : 110;
  const backOffset = compact ? 44 : 74;
  const [flipped, setFlipped] = useState<Set<string>>(new Set());

  function toggleFlip(id: string) {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="relative flex h-full w-1/2 flex-col items-center justify-center">
      {world === "alice" && (
        <div
          className={`pointer-events-none absolute h-[200px] w-[154px] translate-y-2 rotate-[-14deg] overflow-hidden rounded-[8px] shadow-[0_30px_60px_rgba(0,0,0,0.6)] ring-1 ring-white/10 transition-opacity duration-500 sm:h-[320px] sm:w-[250px] ${deck.tint} ${fanned ? "opacity-35" : "opacity-90"}`}
          style={{ transform: `translateX(-${boxOffset}px)` }}
        >
          <Image src={aliceBox} alt="" fill sizes="250px" className="object-cover" />
        </div>
      )}

      {/* unopened deck: a few resting backs, offset to suggest thickness */}
      <div
        className={`pointer-events-none absolute h-[240px] w-[168px] overflow-hidden rounded-[10px] shadow-[0_16px_40px_rgba(0,0,0,0.5)] ring-1 ring-white/10 transition-all duration-500 sm:h-[300px] sm:w-[210px] ${deck.tint}`}
        style={{
          transform: `translate(${side === "left" ? backOffset : -backOffset}px, -6px) rotate(${side === "left" ? 8 : -8}deg)`,
          opacity: fanned ? 0.55 : 0.85,
        }}
      >
        <Image src={deck.back} alt="" fill sizes="210px" className="object-cover" />
      </div>

      <button
        type="button"
        aria-label={fanned ? undefined : `Раскрыть колоду «${deck.label}»`}
        onClick={() => setFanned(true)}
        className="absolute inset-0 z-30"
        style={{ cursor: fanned ? "default" : "pointer", pointerEvents: fanned ? "none" : "auto" }}
      />

      {deck.cards.map((card, i) => (
        <PlayingCard
          key={card.id}
          card={card}
          back={deck.back}
          index={i}
          total={deck.cards.length}
          fanned={fanned}
          flipped={flipped.has(card.id)}
          tint={deck.tint}
          compact={compact}
          onFlip={() => toggleFlip(card.id)}
        />
      ))}

      <motion.p
        animate={{ opacity: fanned ? 0 : 1 }}
        transition={{ duration: 0.4 }}
        className="pointer-events-none absolute bottom-[18%] text-[10px] font-medium tracking-[0.3em] text-white/50"
      >
        НАЖМИТЕ
      </motion.p>
      <p className="pointer-events-none absolute bottom-[9%] text-[11px] font-medium tracking-[0.35em] text-white/80">
        {deck.label}
      </p>
    </div>
  );
}

export function ExperimentACards() {
  const compact = useCompact();
  return (
    <div className="relative flex h-dvh w-full items-center justify-center overflow-hidden bg-[#0a0908]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, rgba(255,255,255,0.05), transparent 60%), radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.6), transparent 60%)",
        }}
      />
      <div className="relative flex h-full w-full max-w-6xl" style={{ perspective: 1600 }}>
        <DeckGroup world="alice" side="left" compact={compact} />
        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/[0.04]" />
        <DeckGroup world="vitraji" side="right" compact={compact} />
      </div>

      <p className="pointer-events-none absolute left-6 top-6 text-[10px] font-medium tracking-[0.3em] text-white/40 sm:left-10 sm:top-8">
        EXPERIMENT A — CARDS ARE THE INTERFACE
      </p>
      <p className="pointer-events-none absolute bottom-6 right-6 text-[10px] font-medium tracking-[0.25em] text-white/30 sm:bottom-8 sm:right-10">
        DRAG · TAP TO FLIP
      </p>
    </div>
  );
}
