import * as THREE from "three";

/**
 * A rounded-rect card silhouette, extruded to a real thickness with a
 * beveled edge. ExtrudeGeometry puts both caps in ONE material group
 * (materialIndex 0) and the side walls in another (materialIndex 1) —
 * verified empirically for this three.js version, since it's easy to
 * assume the opposite. The two caps are a contiguous, equal-sized block
 * (back cap — the lower-z face — first, front cap second), so splitting
 * that group in half gives independent front/back materials. Side walls
 * (materialIndex 1) are left untouched and become the visible edge.
 *
 * Resulting material slots: [0] = back cap, [1] = side wall / edge,
 * [2] = front cap.
 */
export function createRoundedCardGeometry(width: number, height: number, thickness: number, radius: number) {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x, y + radius);
  shape.lineTo(x, y + height - radius);
  shape.quadraticCurveTo(x, y + height, x + radius, y + height);
  shape.lineTo(x + width - radius, y + height);
  shape.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
  shape.lineTo(x + width, y + radius);
  shape.quadraticCurveTo(x + width, y, x + width - radius, y);
  shape.lineTo(x + radius, y);
  shape.quadraticCurveTo(x, y, x, y + radius);

  const bevelSize = thickness * 0.18;
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: bevelSize,
    bevelSize,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geometry.center();

  const capGroup = geometry.groups.find((g) => g.materialIndex === 0);
  if (capGroup) {
    const half = capGroup.count / 2;
    geometry.groups = geometry.groups.filter((g) => g !== capGroup);
    geometry.groups.push({ start: capGroup.start, count: half, materialIndex: 0 }); // back cap (lower z)
    geometry.groups.push({ start: capGroup.start + half, count: half, materialIndex: 2 }); // front cap (higher z)

    // ExtrudeGeometry's default cap UVs (WorldUVGenerator) come out sheared
    // for a curved shape like this — fine for a flat color, but visibly
    // diagonal-streaked with a photographic texture. Replace them with a
    // plain linear remap of each cap's own X/Y bounding box, independently
    // per cap (back and front are mirrored in X, so each needs its own
    // bounds) — a guaranteed-undistorted planar mapping.
    const position = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    for (const [start, count] of [
      [capGroup.start, half],
      [capGroup.start + half, half],
    ] as const) {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (let i = start; i < start + count; i++) {
        const px = position.getX(i);
        const py = position.getY(i);
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
      const spanX = maxX - minX || 1;
      const spanY = maxY - minY || 1;
      for (let i = start; i < start + count; i++) {
        const u = (position.getX(i) - minX) / spanX;
        const v = (position.getY(i) - minY) / spanY;
        uv.setXY(i, u, v);
      }
    }
    uv.needsUpdate = true;
  }

  return geometry;
}
