"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Canvas, useFrame, extend, type ThreeElement } from "@react-three/fiber";
import { useTexture, shaderMaterial } from "@react-three/drei";
import * as THREE from "three";

import aliceTable from "../../../assets/prototype/01-alice-tabletop-prototype.png";
import vitrajiTable from "../../../assets/prototype/02-vitraji-tabletop-prototype.png";
import aliceCard from "../../../assets/experiments/cards/alice-card-2.png";
import vitrajiCard from "../../../assets/experiments/cards/vitraji-card-2.png";

const PortalMaterial = shaderMaterial(
  { uFrom: null, uTo: null, uProgress: 0, uOrigin: new THREE.Vector2(0.5, 0.5), uAspect: 1 },
  /* vertex */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  /* fragment */ `
    uniform sampler2D uFrom;
    uniform sampler2D uTo;
    uniform float uProgress;
    uniform vec2 uOrigin;
    uniform float uAspect;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      vec2 diff = uv - uOrigin;
      diff.x *= uAspect;
      float dist = length(diff);
      vec2 dir = diff / max(dist, 0.0001);

      float wave = sin(dist * 24.0 - uProgress * 16.0) * 0.025 * (1.0 - uProgress);
      vec2 warped = uv + dir * wave;

      float radius = uProgress * 1.65;
      float edge = smoothstep(radius - 0.14, radius + 0.02, dist);

      vec3 colFrom = texture2D(uFrom, clamp(warped, 0.0, 1.0)).rgb;
      vec3 colTo = texture2D(uTo, clamp(warped, 0.0, 1.0)).rgb;
      vec3 color = mix(colTo, colFrom, edge);

      float rim = smoothstep(radius - 0.03, radius, dist) - smoothstep(radius, radius + 0.06, dist);
      color += rim * vec3(1.0, 0.9, 0.72) * 1.5;

      gl_FragColor = vec4(color, 1.0);
    }
  `,
);
extend({ PortalMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    portalMaterial: ThreeElement<typeof PortalMaterial>;
  }
}

type Phase = "idle-alice" | "opening" | "idle-vitraji";

function PortalPlane({
  phaseRef,
  progressRef,
  originRef,
  onSettled,
}: {
  phaseRef: React.RefObject<Phase>;
  progressRef: React.RefObject<number>;
  originRef: React.RefObject<{ x: number; y: number }>;
  onSettled: () => void;
}) {
  const fromTex = useTexture(aliceTable.src);
  const toTex = useTexture(vitrajiTable.src);
  const matRef = useRef<InstanceType<typeof PortalMaterial>>(null);

  useFrame((state, delta) => {
    if (phaseRef.current === "opening") {
      progressRef.current = Math.min(1, progressRef.current + delta / 1.15);
      if (progressRef.current >= 1) onSettled();
    }
    const mat = matRef.current;
    if (mat) {
      mat.uProgress = progressRef.current;
      mat.uOrigin.set(originRef.current.x, originRef.current.y);
      mat.uAspect = state.size.width / state.size.height;
    }
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      {/* @ts-expect-error -- custom shaderMaterial JSX tag registered via extend() */}
      <portalMaterial ref={matRef} uFrom={fromTex} uTo={toTex} transparent={false} depthTest={false} />
    </mesh>
  );
}

export function ExperimentCPortal() {
  const [phase, setPhase] = useState<Phase>("idle-alice");
  const phaseRef = useRef<Phase>("idle-alice");
  const progressRef = useRef(0);
  const originRef = useRef({ x: 0.5, y: 0.5 });

  function goToPhase(next: Phase) {
    phaseRef.current = next;
    setPhase(next);
  }

  function handlePortalClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (phaseRef.current !== "idle-alice") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = (rect.left + rect.width / 2) / window.innerWidth;
    const cy = 1 - (rect.top + rect.height / 2) / window.innerHeight;
    originRef.current = { x: cx, y: cy };
    progressRef.current = 0;
    goToPhase("opening");
  }

  const showVitrajiDom = phase === "idle-vitraji";
  const canvasOpacity = phase === "opening" ? 1 : 0;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#0a0908]">
      <div className="absolute inset-0" style={{ opacity: showVitrajiDom ? 0 : 1 }}>
        <Image src={aliceTable} alt="" fill priority className="object-cover brightness-[0.55] blur-[1px]" />
      </div>
      <div className="absolute inset-0" style={{ opacity: showVitrajiDom ? 1 : 0 }}>
        <Image src={vitrajiTable} alt="" fill className="object-cover brightness-[0.55] blur-[1px]" />
      </div>

      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{ opacity: canvasOpacity, zIndex: 20 }}
      >
        <Canvas gl={{ antialias: true }} dpr={[1, 2]} style={{ pointerEvents: "none" }}>
          <PortalPlane
            phaseRef={phaseRef}
            progressRef={progressRef}
            originRef={originRef}
            onSettled={() => goToPhase("idle-vitraji")}
          />
        </Canvas>
      </div>

      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <button
          type="button"
          onClick={handlePortalClick}
          disabled={phase !== "idle-alice"}
          aria-label="Открыть портал в мир «Витражи»"
          className="group relative h-[280px] w-[196px] sm:h-[380px] sm:w-[266px]"
          style={{
            opacity: showVitrajiDom ? 0 : 1,
            transition: "opacity 0.3s ease",
            animation: phase === "idle-alice" ? "portal-float 4.5s ease-in-out infinite" : undefined,
          }}
        >
          <div
            className="absolute -inset-6 rounded-[24px] opacity-70 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
            style={{ background: "radial-gradient(circle, rgba(255,214,160,0.55), transparent 65%)" }}
          />
          <div className="relative h-full w-full overflow-hidden rounded-[12px] shadow-[0_30px_70px_rgba(0,0,0,0.65)] ring-1 ring-white/20">
            <Image src={aliceCard} alt="" fill sizes="266px" className="object-cover" />
          </div>
        </button>

        <div
          className="pointer-events-none relative h-[280px] w-[196px] sm:h-[380px] sm:w-[266px]"
          style={{ opacity: showVitrajiDom ? 1 : 0, transition: "opacity 0.6s ease 0.2s", position: "absolute" }}
        >
          <div className="relative h-full w-full overflow-hidden rounded-[12px] shadow-[0_30px_70px_rgba(0,0,0,0.65)] ring-1 ring-white/20">
            <Image src={vitrajiCard} alt="" fill sizes="266px" className="object-cover" />
          </div>
        </div>
      </div>

      <p className="pointer-events-none absolute left-6 top-6 z-30 text-[10px] font-medium tracking-[0.3em] text-white/40 sm:left-10 sm:top-8">
        EXPERIMENT C — WORLDS
      </p>
      <p className="pointer-events-none absolute bottom-6 left-1/2 z-30 -translate-x-1/2 text-[11px] font-medium tracking-[0.35em] text-white/70">
        {showVitrajiDom ? "ВИТРАЖИ" : "АЛИСА"}
      </p>
      {phase === "idle-alice" && (
        <p className="pointer-events-none absolute bottom-6 right-6 z-30 text-[10px] font-medium tracking-[0.2em] text-white/30 sm:bottom-8 sm:right-10">
          КЛИКНИТЕ НА КАРТУ
        </p>
      )}

      <style>{`
        @keyframes portal-float {
          0%, 100% { transform: translateY(0px) rotate(-1.5deg); }
          50% { transform: translateY(-14px) rotate(1.5deg); }
        }
      `}</style>
    </div>
  );
}
