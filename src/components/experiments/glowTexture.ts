import * as THREE from "three";

/** Soft radial gradient (no ring/hole) — reads as a light bloom, shared by every glow/haze decal in the intro. */
export function makeGlowTexture(warm = true) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    if (warm) {
      gradient.addColorStop(0, "rgba(255,241,212,0.95)");
      gradient.addColorStop(0.4, "rgba(255,226,172,0.4)");
      gradient.addColorStop(1, "rgba(255,226,172,0)");
    } else {
      gradient.addColorStop(0, "rgba(255,255,255,0.9)");
      gradient.addColorStop(0.4, "rgba(255,255,255,0.35)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
