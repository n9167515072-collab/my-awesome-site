import type { StaticImageData } from "next/image";

import aliceBoxImg from "../../../assets/experiments/cards/alice-box.png";
import aliceCard1Img from "../../../assets/experiments/cards/alice-card-1.png";
import aliceCard2Img from "../../../assets/experiments/cards/alice-card-2.png";
import aliceCard3Img from "../../../assets/experiments/cards/alice-card-3.png";
import aliceBackImg from "../../../assets/experiments/cards/alice-deck-back.png";
import vitrajiCard1Img from "../../../assets/experiments/cards/vitraji-card-1.png";
import vitrajiCard2Img from "../../../assets/experiments/cards/vitraji-card-2.png";
import vitrajiCard3Img from "../../../assets/experiments/cards/vitraji-card-3.png";
import vitrajiBackImg from "../../../assets/experiments/cards/vitraji-deck-back.png";

/**
 * ASSET PROVENANCE — read before touching this file.
 *
 * None of the images below are photographs of the physical LunaLum decks.
 * They are crops (made with sharp, see assets/experiments/cards/README-less
 * history in git) taken from assets/prototype/01-alice-tabletop-prototype.png
 * and 02-vitraji-tabletop-prototype.png — the AI-generated "art-direction
 * comp" tabletop scenes already flagged as non-production-truth in
 * DESIGN.md's asset fidelity notice.
 *
 * The real per-item product photos (box alone, card backs alone, individual
 * card faces alone) that were reviewed earlier in this project's ASSET AUDIT
 * conversation were never saved into this repository as files — they only
 * ever existed as inline chat attachments, and that part of the
 * conversation has since been summarized, so those originals are not
 * reachable from this session. The user confirmed (2026-09-05) that
 * assets/prototype/ should stand in as the source for this object-kit stage
 * given nothing else is available yet. Swap these imports for real product
 * photography before this kit is used for anything beyond prototyping.
 */

export type World = "alice" | "vitraji";

export type BoxFaceSource =
  | { kind: "real"; texture: StaticImageData }
  | { kind: "placeholder"; color: string };

export type DeckConfig = {
  id: World;
  label: string;
  /** Three card-face crops, cycled across a stack's cards. */
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

const NEUTRAL_CARDBOARD = "#2a2723";

export const ALICE_DECK: DeckConfig = {
  id: "alice",
  label: "АЛИСА",
  cardFronts: [aliceCard1Img, aliceCard2Img, aliceCard3Img],
  cardBack: aliceBackImg,
  tint: "#fff3e6",
  box: {
    // Only the front-ish face is a real (prototype-sourced) product image —
    // it's a foreshortened crop from a 3/4-angle tabletop photo, not a
    // straight-on product shot, so even this "real" face is a stand-in.
    // Every other face of this box has never been photographed at all.
    faces: [
      { kind: "placeholder", color: NEUTRAL_CARDBOARD }, // right
      { kind: "placeholder", color: NEUTRAL_CARDBOARD }, // left
      { kind: "placeholder", color: NEUTRAL_CARDBOARD }, // top
      { kind: "placeholder", color: NEUTRAL_CARDBOARD }, // bottom
      { kind: "real", texture: aliceBoxImg }, // front
      { kind: "placeholder", color: NEUTRAL_CARDBOARD }, // back
    ],
    placeholderFaces: ["right", "left", "top", "bottom", "back"],
    size: { w: 1.05, h: 1.35, d: 0.42 },
  },
};

export const VITRAJI_DECK: DeckConfig = {
  id: "vitraji",
  label: "ВИТРАЖИ",
  cardFronts: [vitrajiCard1Img, vitrajiCard2Img, vitrajiCard3Img],
  cardBack: vitrajiBackImg,
  tint: "#eef4ff",
  box: {
    // No Vitraji box was ever photographed or captured in any tabletop
    // comp — the Vitraji tabletop scene shows only loose cards and the
    // deck-back stack, never a box. Every face here is a neutral
    // placeholder; nothing about this box's real design is known.
    faces: [
      { kind: "placeholder", color: NEUTRAL_CARDBOARD },
      { kind: "placeholder", color: NEUTRAL_CARDBOARD },
      { kind: "placeholder", color: NEUTRAL_CARDBOARD },
      { kind: "placeholder", color: NEUTRAL_CARDBOARD },
      { kind: "placeholder", color: NEUTRAL_CARDBOARD },
      { kind: "placeholder", color: NEUTRAL_CARDBOARD },
    ],
    placeholderFaces: ["right", "left", "top", "bottom", "front", "back"],
    size: { w: 1.05, h: 1.35, d: 0.42 },
  },
};

export const DECKS: Record<World, DeckConfig> = { alice: ALICE_DECK, vitraji: VITRAJI_DECK };
