"use client";

import Image from "next/image";
import { useRef } from "react";
import {
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  motion,
} from "motion/react";

import aliceHero from "../../../assets/prototype/01-alice-tabletop-prototype.png";
import aliceMacro from "../../../assets/prototype/03-alice-macro-prototype.png";
import vitrajiHero from "../../../assets/prototype/02-vitraji-tabletop-prototype.png";

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/** Local, clamped 0-1 progress between two points of the overall scroll progress. */
function segment(p: number, start: number, end: number) {
  return clamp01((p - start) / (end - start));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/**
 * The whole sequence is one continuous scroll track: a single sticky
 * viewport with layered photographs, not separate "sections" that swap.
 * Scroll progress (0-1) drives every transform below.
 *
 * 0.00–0.35  hold on the Alice scene (hero)
 * 0.35–0.65  push in toward the macro detail
 * 0.65–1.00  the light sweep begins toward Vitraji (stops at a partial
 *            reveal — the full Vitraji scene is a later build)
 *
 * Note: every scroll-linked value here is driven manually (via
 * useMotionValueEvent + useMotionValue.set), not motion/react's
 * useTransform. useTransform in the installed motion version (13.2.0)
 * does not clamp correctly past a keyframe range under scroll — verified
 * directly against a hand-clamped equivalent, which behaves correctly.
 * This is a library-level issue, not a design choice.
 */
export function AliceHeroExperience() {
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  const heroOpacity = useMotionValue(1);
  const heroScale = useMotionValue(1);
  const macroOpacity = useMotionValue(0);
  const macroScale = useMotionValue(1.06);
  const captionOpacity = useMotionValue(0);
  const sweepOpacity = useMotionValue(0);
  const sweepX = useMotionValue("-30%");
  const vitrajiClipRight = useMotionValue(100);
  const macroClipLeft = useMotionValue(0);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    heroOpacity.set(lerp(1, 0, segment(p, 0.35, 0.62)));
    heroScale.set(lerp(1, 1.18, segment(p, 0.35, 0.65)));

    macroOpacity.set(lerp(0, 1, segment(p, 0.42, 0.6)));
    const macroT = segment(p, 0.42, 1);
    macroScale.set(macroT < 0.5 ? lerp(1.06, 1, macroT / 0.5) : lerp(1, 1.03, (macroT - 0.5) / 0.5));

    const capIn = segment(p, 0, 0.06);
    const capOut = 1 - segment(p, 0.28, 0.35);
    captionOpacity.set(Math.min(capIn, capOut));

    sweepOpacity.set(lerp(0, 1, segment(p, 0.68, 0.78)));
    sweepX.set(`${lerp(-30, 130, segment(p, 0.68, 1))}%`);

    // Vitraji reveals from the left as the sweep passes; macro recedes from
    // the same left edge by the same amount, so the two tile together with
    // no double-cover and no gap — this is what makes the reveal visible.
    const revealRight = lerp(100, 62, segment(p, 0.72, 1));
    vitrajiClipRight.set(revealRight);
    macroClipLeft.set(100 - revealRight);
  });

  const vitrajiClip = useTransform(vitrajiClipRight, (r) => `inset(0% ${r}% 0% 0%)`);
  const macroClip = useTransform(macroClipLeft, (l) => `inset(0% 0% 0% ${l}%)`);

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const tiltX = useSpring(useTransform(pointerY, [-0.5, 0.5], [2.2, -2.2]), {
    stiffness: 120,
    damping: 20,
  });
  const tiltY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-2.2, 2.2]), {
    stiffness: 120,
    damping: 20,
  });

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
    pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
  }

  function handlePointerLeave() {
    pointerX.set(0);
    pointerY.set(0);
  }

  return (
    <div ref={trackRef} className="relative h-[320vh] w-full bg-[#0c0b09]">
      <div
        className="sticky top-0 h-screen w-full overflow-hidden"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{ perspective: 1200 }}
      >
        {/* Vitraji: revealed only partially, from behind everything else */}
        <motion.div className="absolute inset-0" style={{ clipPath: vitrajiClip }}>
          <Image
            src={vitrajiHero}
            alt=""
            fill
            priority={false}
            className="object-cover object-[70%_45%] max-md:object-[80%_40%]"
          />
        </motion.div>

        {/* Alice macro / detail */}
        <motion.div
          className="absolute inset-0"
          style={{ opacity: macroOpacity, scale: macroScale, clipPath: macroClip }}
        >
          <Image
            src={aliceMacro}
            alt="Деталь карты «Алиса»: тиснение и материал."
            fill
            className="object-cover object-[55%_45%] max-md:object-[50%_35%]"
          />
        </motion.div>

        {/* Alice hero scene */}
        <motion.div
          className="absolute inset-0"
          style={{ opacity: heroOpacity, scale: heroScale, rotateX: tiltX, rotateY: tiltY }}
        >
          <Image
            src={aliceHero}
            alt="Колода «Алиса»: коробка и карты на студийном столе."
            fill
            priority
            className="object-cover object-[40%_45%] max-md:object-[62%_40%]"
          />
        </motion.div>

        {/* light sweep */}
        <motion.div
          className="pointer-events-none absolute inset-y-0 w-[60%]"
          style={{
            opacity: sweepOpacity,
            left: sweepX,
            background:
              "linear-gradient(100deg, transparent 0%, rgba(255,226,180,0.35) 45%, rgba(255,244,222,0.55) 50%, rgba(255,226,180,0.35) 55%, transparent 100%)",
            mixBlendMode: "screen",
          }}
        />

        {/* deck caption */}
        <motion.p
          style={{ opacity: captionOpacity }}
          className="absolute bottom-10 left-6 text-[11px] font-medium tracking-[0.25em] text-white/70 sm:bottom-14 sm:left-10"
        >
          АЛИСА
        </motion.p>

        {/* scroll cue, hero-only */}
        <motion.p
          style={{ opacity: captionOpacity }}
          className="absolute bottom-10 right-6 text-[11px] font-medium tracking-[0.2em] text-white/50 sm:bottom-14 sm:right-10"
        >
          ↓ SCROLL
        </motion.p>
      </div>
    </div>
  );
}
