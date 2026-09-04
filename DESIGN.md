# Design

<!-- design-status: SEED / PROTOTYPE-STAGE. Written pre-implementation, before
any code exists, per impeccable's own "seed DESIGN.md" convention for
pre-build projects. This is a directional draft to build a prototype
against, not the finish-time DESIGN.md impeccable normally writes from a
shipped world. Re-document from the real, built prototype once it exists
— do not treat this file as permanent just because it's written down. -->

## Asset fidelity notice (read this before touching any image)

This document was written using two different kinds of source images, and
they are not interchangeable. Getting this distinction wrong is the single
biggest way this project could accidentally ship a fabricated product.

- **ORIGINAL PRODUCT ASSETS** — the real box/back/card-face images the
  client provided directly (Alice: box, back, 3 card faces; Vitraji: box,
  back, 3 card faces). These are the *only* source of truth for what the
  actual product looks like — colors, artwork, proportions, printed text,
  logos.
- **AI-GENERATED ART-DIRECTION COMPS** — images generated to test
  composition, light, camera, rhythm, and transitions for this design.
  They are **prototype-only**. Every single one has at least one confirmed
  or suspected fidelity problem against the real product (see Asset Usage
  below for the specific issue per file). Do not read anything about the
  real product's texture, material, or branding off of them.

Explicitly, do not trust the following from any AI comp unless an
ORIGINAL PRODUCT ASSET confirms it:

1. **Box text** — one comp already misrendered "Стране чудес" as "Стране
   нудес." Any packaging text in a comp needs a byte-for-byte check
   against the original box asset before it's treated as real.
2. **Foil / texture / gilded edges** — comps show gold-fleck shimmer and
   foil-like highlights not present in the flat original artwork files.
   Unconfirmed until real macro photography exists.
3. **Card content that doesn't exist in the original set** — a "XIX
   Солнце" (The Sun) macro comp shows a card that was never among the
   provided Vitraji originals (Рыцарь Жезлов, Туз Жезлов, 2. Жрица). Its
   existence as a real card is unconfirmed; do not use its artwork as
   real content until confirmed.
4. **AI-added props** — a brass key and dried rose petals appear in one
   Alice comp. They are not part of the product and are not part of this
   design; they're an artifact of the generation, not a styling choice.

**Structural requirement:** the visual system specified below (camera
language, lighting logic, typography, spacing, transitions, composition
rules — see Scene System) must survive swapping every prototype image for
a real production photograph without changing site structure or code.
If replacing a comp with a real photo ever requires touching layout,
motion, or component logic — not just the image file — the system
described here has failed its own brief.

## Creative Concept

**Every idea gets a place in this studio — and one place is always left
open.**

LunaLum's site is a single visual space, staged once, revisited per deck:
the same table, the same light, the same way of looking, holding a
different physical world each time. It ends by holding nothing — an open
place, for whichever deck comes next.

## Experience Flow

Sequential, first ~60 seconds:

1. **0–5s** — the site opens directly on one fixed frame: the Alice scene
   (box + cards on the table), full-bleed, completely still. No entrance
   animation. A few seconds of stillness before anything is asked of the
   visitor — the photograph is the opening statement.
2. **5–12s** — on first scroll, a slow camera push-in *within the same
   scene* (not a page change) toward one card, arriving at a macro detail
   of its material.
3. **12–18s** — camera pulls back to the full scene; a small caption
   names the deck ("Алиса"). Minimal text.
4. **18–28s** — the transition to Vitraji happens as one deliberate event
   — the light itself sweeps the frame (see Transition Between Decks) —
   not a cut, not a crossfade.
5. **28–40s** — the Vitraji scene holds the same rhythm: push-in to a
   macro detail, proving this is a system, not a one-off.
6. **40–50s** — pull back from Vitraji. The visitor has now seen the
   pattern twice — enough to read it as the site's language.
7. **50–60s** — a third scene, identically staged, holds an empty box and
   a blank card. The offer is made only now, in the same visual language
   already established — no new UI block, no banner.

## Hero

- **Composition:** box at a ¾ angle, set back; 2 cards in front, one
  noticeably closer to camera. Generous dark negative space to one side.
  Asymmetrical, controlled.
- **Product:** the real Alice box + 2 cards (in production; an AI comp in
  the prototype — see Asset Usage).
- **Scale:** objects occupy the middle portion of the frame; most of the
  frame is negative space.
- **Text:** "LUNALUM" wordmark only. Nothing else on first paint.
- **Light:** one warm directional side light, soft but visible shadows,
  raking across card edges and box surface.
- **Camera angle:** slight ¾, top-down.
- **Motion:** none at first paint — a deliberate held moment before any
  animation.
- **Interaction:** the camera push-in (Experience Flow step 2) begins
  only on the first scroll/input, never automatically.
- **Negative space:** large, intentional, asymmetrical — not centered
  padding.

## Scene System

What stays **constant** across every deck scene — this is what makes
different worlds read as one site:

- Camera language: fixed ¾ top-down angle, same implied focal length,
  same push-in-to-macro move.
- Lighting logic: one warm directional side light, same direction and
  quality in every scene.
- Typography: same family/scale/placement for the deck-name caption and
  the eventual offer line.
- Spacing/composition rules: same negative-space ratio, same object
  placement logic (box behind, cards in front, one nearer camera).
- Transition mechanism: the same light-sweep device every time a deck
  changes.
- UI chrome: same minimal wordmark/nav treatment throughout.

What's allowed to **change**:

- Color (each deck's real palette).
- Artwork/card content.
- Atmosphere (a subtle shift in perceived temperature/depth cued by that
  deck's own colors).
- Material/texture read (foil vs. stained-glass linework vs. whatever a
  future deck's real material turns out to be) — sourced from real
  photography, never from added props.

## Alice Scene

Reference: **PROTOTYPE comp** (Alice tabletop: box + card + back), with
the brass key and rose petals mentally/visually removed — they are not
part of this design (see Asset fidelity notice #4). Box at ¾ in the back,
2 cards in front per the Hero composition. In production, re-shot without
any added prop, on the real table surface, same light rig as Vitraji.

## Vitraji Scene

Reference: **PROTOTYPE comp** (3 cards fanned + back, on the dark table).
This is the cleanest of the available comps — no invented props, good
composition/light reference. Identical camera height/angle/light
direction/table surface/caption typography to the Alice scene; only the
objects and their color/content differ. In production, re-shot on the
same rig, and every card's printed text checked against the original
Vitraji face assets before use.

## Detail / Macro Moments

Not a separate "detail card" or gallery. Each macro appears as a brief
push-in *within* that deck's own scene (Experience Flow steps 2 and 5),
then the camera pulls back out — always embedded in the act of looking at
that one deck, never presented as an isolated product thumbnail.

- Alice detail: **PROTOTYPE comp** (macro corner of the Alice card).
  Framing/light usable as reference; the gold-fleck shimmer visible in it
  is unconfirmed against the original flat artwork (Asset fidelity notice
  #2) and must not be treated as real texture.
- Vitraji detail: **PROTOTYPE comp** (macro of a stained-glass card),
  with a hard caveat — the specific card shown ("XIX Солнце") is not among
  the original Vitraji assets (Asset fidelity notice #3). Use only the
  *lighting/macro treatment* from this comp; its card content must not
  reach production until confirmed to be a real card.

## Transition Between Decks

Three options were considered:

1. **Light sweep** — the scene's single directional light sweeps across
   the frame; where it has passed, the old deck's objects are already
   gone and the new deck's are already in place.
2. **Rack focus through darkness** — camera racks to soft near-black for
   a beat, resolves into the new scene already in place.
3. **Objects lift into shadow / settle from shadow** — old objects recede
   into the dark negative space, new objects settle in from the same
   space.

**Chosen: Light sweep.** It's the only option that reuses the system's
own established constant (the light) as the mechanism of change, instead
of introducing a new device — form and meaning line up. No crossfade.

## Future Deck / CTA Scene

**No comp exists for this yet — flagged as a real gap, not filled with
invention.** Concept: identically staged as every other deck scene (same
light, same camera, same table) but holding an empty box and a blank
card in the positions objects normally occupy. No banner, no colored
rectangle, no separate CTA block. One quiet line of type, same
typographic treatment as the deck-name captions, is the only addition.
**PRODUCTION REQUIRED asset: a real photo of an actual empty box + blank
card**, styled to match the established light/camera rig — there is
nothing to prototype this scene with yet.

## Form Transition

The intake form inherits the same dark charcoal surface, the same warm
directional light, and the same typography as the rest of the site —
fields read as resting on the same table (simple underlined text fields
in the same restrained type), not a generic white modal or card-style
form UI. The visitor never visually leaves "the table."

## Typography

Role relative to the product: quiet and structural — captions and the one
offer line — never competing with the object for attention. Candidates
to test, not a final pick:

- **UI/captions (neutral grotesk):** ABC Diatype (Dinamo) or Suisse Int'l
  (Swiss Typefaces).
- **The rare heavier moment (deck name, final line):** Times Now (Klim)
  or GT Sectra (Grilli Type) — quiet confidence, explicitly not a
  gothic/fantasy-book serif register.

## Color and Lighting Logic

Not a fixed palette — a **behavior**: one warm directional light is a
structural constant across every scene; color itself is carried entirely
by each deck's real objects, never by theming the page or background.
The table surface itself holds one constant dark, warm charcoal tone
throughout — it never changes color between decks; only what's on it
does.

## Composition

Avoids stacked vertical landing-page sections by treating the whole site
as **one continuous camera in one continuous space**: transitions are
camera moves or the light-sweep event within an implied single
environment, not breaks between independent content blocks. No card
grids, no 3-column feature blocks, no section dividers as decoration.

## Motion Language

- **Scroll drives:** the push-in/pull-back camera move within a scene,
  and the light-sweep transition between decks.
- **Pointer reacts:** minimally — a subtle tilt/parallax on the hero
  object only. No hover-glow, no cursor-following light (explicitly
  excluded — see Things We Must Not Drift Into).
- **Never moves on its own:** the table surface, the typography (no
  bouncy/animated text reveals), a scene's exposure/color grade (constant
  within a scene, changes only at a deck transition).

## Interaction Rules

- No free pan across an open table.
- No drag for its own sake.
- No hover-glow or cursor-following light effects.
- No game mechanics (dealing, shuffling, scoring).
- The only non-scroll interaction: a subtle pointer-driven tilt/parallax
  on the hero object, replaced by device-tilt (gyroscope) on mobile.

## Mobile Logic

Not desktop-stacked-vertically. Specifically:

- **Framing:** tighter crop on the hero object per scene (less negative
  margin) rather than a shrunk desktop frame, keeping the object's
  relative size in-frame consistent.
- **Swipe/scroll:** vertical scroll still drives the in-scene push-in/
  pull-back; the deck-to-deck transition is tested as a deliberate
  horizontal swipe instead of continued vertical scroll, since it's a
  change of world, not a continuation.
- **Scale:** the physical object keeps a comparable absolute size
  relative to viewing distance — never shrunk just to fit more chrome.
- **Object position:** shifted toward center/lower-third for one-handed
  reach of the eventual CTA, while the object stays the dominant visual
  weight.
- **Interaction:** cursor-based tilt is replaced by device-tilt
  (gyroscope) on the hero object — a native mobile input, not a
  degraded desktop one.

## Asset Usage

| Scene | Asset | Status | Purpose | Notes |
|---|---|---|---|---|
| Hero (Alice) | Alice tabletop comp, key/rose petals excluded | **PROTOTYPE** | camera/light/composition reference | **PRODUCTION REQUIRED**: re-shoot real photography, no added props |
| Alice detail | Macro Alice corner comp | **PROTOTYPE** | macro framing/light reference only | **PRODUCTION REQUIRED**: real macro shot; gold-fleck texture unconfirmed (fidelity notice #2) |
| Vitraji hero/scene | Vitraji 3-cards + back comp | **PROTOTYPE** | camera/light/composition reference | **PRODUCTION REQUIRED**: re-shoot; verify all card text against original assets |
| Vitraji detail | Macro "XIX Солнце" comp | **PROTOTYPE**, content unverified | lighting/macro treatment reference ONLY | **PRODUCTION REQUIRED**: confirm this card exists at all before using content (fidelity notice #3) |
| Digital → physical moment | Split comp (art file vs. "physical" render) | **PROTOTYPE**, has a confirmed defect | composition/mood reference only | **PRODUCTION REQUIRED**: rebuild with a real photo — comp's box text is misrendered ("нудес") |
| Future deck / CTA | — none — | **missing** | — | **PRODUCTION REQUIRED**: no prototype substitute exists; needs a real empty box + blank card photo |
| Product identity (color/logo/text, all decks) | Original Alice + Vitraji box/back/face assets | **ORIGINAL — source of truth** | fidelity check baseline for everything above | not replaceable, not a comp |

## Things We Must Not Drift Into

- Free pan across an open table.
- Drag interaction added for its own sake.
- Hover-glow or any cursor-following light effect.
- Game mechanics of any kind.
- Cottagecore / handmade-flatlay styling.
- Witchy or esoteric props: candles, crystals, zodiac symbols, mystical
  decoration.
- Excess/invented props not part of the real product (see fidelity
  notice #4).
- Generic Awwwards tricks used for their own sake, disconnected from this
  system's actual rules.
- The site reading as a "desk portfolio website" rather than fashion
  still-life / creative production studio / museum-grade product
  presentation.
- Treating any AI comp's texture, material, or on-image text as proof of
  what the real product looks like.

## Technical Direction

Given B.3's actual mechanics (fixed scenes, scroll-driven push-in/
pull-back within a scene, one light-sweep transition between decks, a
subtle pointer/tilt parallax on the hero object, no free pan/drag/spatial
3D navigation), **React Three Fiber / Three.js / real-time WebGL are not
needed** — nothing here requires true spatial navigation or real-time 3D
geometry.

- Next.js + Tailwind for structure.
- Motion for React for scroll-linked scale/position within a scene, and
  for the light-sweep transition (layered images/video with animated
  opacity/mask, or a short pre-rendered video plate for the sweep
  itself).
- Plain CSS 3D transforms for the subtle pointer/tilt parallax on the
  hero object — no 3D engine required.

Prefer the simplest technology that delivers the art direction without a
visible compromise — do not reach for 3D/WebGL because it looks
technical.
