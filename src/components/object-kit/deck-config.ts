import type { StaticImageData } from "next/image";

import aliceBoxFrontImg from "../../../assets/product/alice/box-front-texture.png";
import aliceBackImg from "../../../assets/product/alice/back.png";
import aliceCard1Img from "../../../assets/product/alice/card-01.png";
import aliceCard2Img from "../../../assets/product/alice/card-02.png";
import aliceCard3Img from "../../../assets/product/alice/card-03.png";
import vitrajiBackImg from "../../../assets/product/vitraji/back.png";
import vitrajiCard1Img from "../../../assets/product/vitraji/card-01.png";
import vitrajiCard2Img from "../../../assets/product/vitraji/card-02.png";
import vitrajiCard3Img from "../../../assets/product/vitraji/card-03.png";

/**
 * ASSET PROVENANCE — read before touching this file.
 *
 * These are the recovered original LunaLum product assets, unpacked into
 * assets/product/ from a zip the user supplied (2026-09-05), replacing the
 * assets/prototype/-derived crops this file used before. They are clean,
 * isolated product renders (card fronts, card backs, the Alice box) — not
 * AI-generated tabletop/macro comps. Do not substitute prototype crops back
 * in here; see CLAUDE.md / DESIGN.md for why that distinction matters.
 *
 * Known gaps, not filled in by invention:
 * - No Vitraji box asset is wired in here. The supplied zip's README
 *   explicitly states none was found — see deck.box below for the one
 *   placeholder-face exception and its own caveat.
 * - The real files aren't all the same aspect ratio: card fronts and both
 *   decks' card backs are 898×1488 (ratio 0.6035) except Alice's back.png,
 *   which is 1122×1402 (ratio 0.8003) — the same canvas size as Alice's
 *   box.png. Card3D's geometry is sized to the dominant card ratio
 *   (0.6035), so Alice's card back maps onto a slightly different aspect
 *   than it was authored at; a mild stretch is visible on close inspection.
 *   Not cropped or resized to "fix" this, per instruction — flagging it
 *   here and in the report instead.
 */

export type World = "alice" | "vitraji";

export type BoxFaceSource =
  | { kind: "real"; texture: StaticImageData }
  | { kind: "placeholder"; color: string };

export type DeckConfig = {
  id: World;
  label: string;
  /** Three real card-face photos, cycled across a stack's cards. */
  cardFronts: [StaticImageData, StaticImageData, StaticImageData];
  cardBack: StaticImageData;
  /** Subtle multiply-tint on card materials, matching the DOM prototypes' warm/cool grading. */
  tint: string;
  box: {
    /** BoxGeometry material order: [+x, -x, +y, -y, +z, -z] = [right, left, top, bottom, front, back]. */
    faces: [BoxFaceSource, BoxFaceSource, BoxFaceSource, BoxFaceSource, BoxFaceSource, BoxFaceSource];
    /** Human-readable list of which faces are placeholder, for the report — not just a code comment. */
    placeholderFaces: string[];
    size: { w: number; h: number; d: number };
  };
};

// Sampled (mean pixel color, ImageMagick) from the real left-side panel of
// alice/box.png — not an invented/branded color, just this box's own dark
// desaturated background tone.
const ALICE_CARDBOARD = "#403e3e";
// No Vitraji box pixels exist to sample from at all; this is a generic guess.
const NEUTRAL_CARDBOARD = "#2a2723";

export const ALICE_DECK: DeckConfig = {
  id: "alice",
  label: "АЛИСА",
  cardFronts: [aliceCard1Img, aliceCard2Img, aliceCard3Img],
  cardBack: aliceBackImg,
  tint: "#fff3e6",
  box: {
    // box-front-texture.png is the front face ONLY, perspective-corrected
    // (ImageMagick -distort Perspective against 4 manually-identified
    // corner points) out of the original box.png studio photo, then cropped
    // to exactly that quad — flat, rectangular, no white background, no
    // shadow, no invented pixels. See git history for box.png (the original
    // 3/4-angle photo) if the correction ever needs redoing.
    faces: [
      { kind: "placeholder", color: ALICE_CARDBOARD }, // right
      { kind: "placeholder", color: ALICE_CARDBOARD }, // left
      { kind: "placeholder", color: ALICE_CARDBOARD }, // top
      { kind: "placeholder", color: ALICE_CARDBOARD }, // bottom
      { kind: "real", texture: aliceBoxFrontImg }, // front
      { kind: "placeholder", color: ALICE_CARDBOARD }, // back
    ],
    placeholderFaces: ["right", "left", "top", "bottom", "back"],
    size: { w: 0.76, h: 1.35, d: 0.42 }, // w:h matches box-front-texture.png's measured 0.5636 ratio; depth is an unmeasured guess
  },
};

export const VITRAJI_DECK: DeckConfig = {
  id: "vitraji",
  label: "ВИТРАЖИ",
  cardFronts: [vitrajiCard1Img, vitrajiCard2Img, vitrajiCard3Img],
  cardBack: vitrajiBackImg,
  tint: "#eef4ff",
  box: {
    // The recovered zip's README states a clean Vitraji box was not found.
    // (A vitraji/box.PNG file *is* physically present in the zip this
    // config was built from, dated separately from everything else and
    // contradicting that README — deliberately NOT wired in here without
    // the user confirming it's legitimate; see the chat report.) Every
    // face below is a neutral placeholder; nothing about a real Vitraji
    // box design is known yet.
    faces: [
      { kind: "placeholder", color: NEUTRAL_CARDBOARD },
      { kind: "placeholder", color: NEUTRAL_CARDBOARD },
      { kind: "placeholder", color: NEUTRAL_CARDBOARD },
      { kind: "placeholder", color: NEUTRAL_CARDBOARD },
      { kind: "placeholder", color: NEUTRAL_CARDBOARD },
      { kind: "placeholder", color: NEUTRAL_CARDBOARD },
    ],
    placeholderFaces: ["right", "left", "top", "bottom", "front", "back"],
    size: { w: 1.08, h: 1.35, d: 0.42 },
  },
};

export const DECKS: Record<World, DeckConfig> = { alice: ALICE_DECK, vitraji: VITRAJI_DECK };
