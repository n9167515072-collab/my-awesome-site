# Taste Profile V2

Synthesized from `references/REFERENCE-ANALYSIS.md` (screenshot-confirmed
where noted) plus client corrections given directly after the V1/V2 chat
analysis. This is the version future work (including `art-director`)
should cite — it supersedes the taste conclusions in earlier chat
discussion, which conflated specific reference mechanics with taste and
over-claimed a light-UI preference from too little evidence.

Three sections, kept strictly separate on purpose: **A** is what we're
fairly confident the client actually likes (a taste property, portable
across products); **B** is a technique that's promising specifically
*because* it fits LunaLum's product, not a confirmed taste; **C** is a
concrete, testable mechanic — not a requirement, not yet a concept.

## A. CONFIRMED TASTE

Each item is a property of visual taste in general — not a specific
reference's mechanic, and not tied to decks/Tarot specifically.

1. **[HIGH]** A physical object must feel real and carry visual weight —
   not read as a flat illustration or icon standing in for a product.
2. **[HIGH]** Strong scale contrast between the central object, its
   typography, and surrounding micro-UI is more interesting than uniform
   scale — evidenced independently in SSSolitaire, Locomotive, Lusion,
   Caeli.
3. **[HIGH]** Decoration by itself does not create a feeling of
   expense — restraint (Locomotive, Caeli) reads as more expensive than
   added ornament.
4. **[HIGH]** Motion is more interesting when it's tied to an object,
   a space, or a user action, rather than existing as its own decorative
   layer.
5. **[HIGH]** Typography can function as an independent compositional
   material in its own right — either as the hero (Locomotive) or as a
   huge-scale background texture (SSSolitaire's ghosted wordmark) — not
   only as a neutral text-delivery layer.
6. **[HIGH]** A page can read as a designed, singular experience rather
   than a sequence of standard landing-page sections.
7. **[HIGH]** Units within one collection/portfolio can each carry a
   distinct visual world while still reading as one system, if a
   consistent underlying structure holds them together (evidenced by both
   Theory11 and Cool Club x FWA — two unrelated contexts, same pattern).
8. **[HIGH]** Real material/physical presentation of a product matters
   at least as much as its digital presentation — not a "nice to have"
   next to a polished render.
9. **[LOW]** Preference for light vs. dark UI. Do not treat this as
   taste. All three references with real screenshots (SSSolitaire,
   Lusion, Caeli) turned out to be light or photographic overall, with
   dark appearing only locally — that's too thin and too consistent
   with one explanation to call it a light-mode preference *or* rule out
   a dark one.
   The stronger, better-supported claim instead: **[HIGH]** a complex
   visual object or scene works best inside a tightly controlled overall
   composition, where contrast is introduced locally and deliberately
   (e.g. a dark object-stage inside a light page) rather than by theming
   the entire page dark or light.

## B. PRODUCT-SPECIFIC OPPORTUNITIES

Promising specifically for LunaLum's actual product (physical Tarot/Oracle
decks, a multi-deck portfolio, a service offer) — not confirmed taste, and
not yet a design decision.

- Each LunaLum deck could carry its own distinct visual world (per taste
  property A7) while a consistent underlying system keeps them one brand
  — direct precedent in Theory11 (each release its own identity) and
  Cool Club x FWA (each card its own world).
- The brief's own "digital artwork → real photograph of the card"
  transition is a stronger, more literal version of what Caeli does with
  a pure render — LunaLum actually has the real object to show, which
  Caeli doesn't need to (its whole site is renders).
- Macro material detail (foil, embossing, edge gilding) as a wordless
  proof of production value, per Theory11's photography — directly serves
  the "production proof" requirement already in `PRODUCT.md`.
- Multiple decks/cards coexisting in one controlled space as the
  portfolio's navigation metaphor, rather than a list or grid — precedent
  in Cool Club x FWA.
- Koto's **business architecture** (not its visual style, which we
  haven't seen): portfolio → impression of skill level → understanding
  it's a service → wanting one's own → inquiry, feeling like a
  continuation of browsing rather than a hard switch into a sales pitch —
  matches `PRODUCT.md`'s "show the result before the service" principle
  and is worth studying structurally.
- Type-as-texture (SSSolitaire's ghosted wordmark) as a way to keep the
  LunaLum name/brand present on screen without it competing with a card
  for attention.

## C. CONCEPT HYPOTHESES

Concrete, testable mechanics. Not requirements, not a committed concept,
not to be treated as more validated than `concepts/INITIAL-HYPOTHESIS.md`
— any of these could turn out not to fit once actually tried.

- A card as an interactive object with real physics (drag, tilt response
  to cursor/device orientation) rather than a static image.
- One object (a card or a deck) living inside a dark, contained "stage"
  set within an otherwise lighter/neutral page — testing local contrast
  rather than a page-wide dark theme.
- Scroll driving an object's state (rotation, opening, material reveal)
  instead of triggering standard block-by-block content reveals.
- Cards arranged in a fanned/spatial field as the primary navigation
  device for browsing multiple decks.
- Device tilt (mobile accelerometer) as an alternative input to cursor
  movement on small screens.
- Real environmental photography (not a studio void) as backdrop for an
  individual deck's scene.
- An emptied/blank deck or card as a final, meaning-carrying object
  (already present in the client's own brief) — untested against the
  taste properties above, worth prototyping rather than assuming it
  works.

---

*Do not average these references into a single collage, and do not treat
any one reference's mechanic as a rule for the whole site — see
`references/REFERENCE-NOTES.md`'s own note on this. `PRODUCT.md` and
`concepts/INITIAL-HYPOTHESIS.md` are unchanged by this document.*
