# Vendoring notes

This directory is a manually vendored (not `npx impeccable install`-managed)
copy of the Claude-relevant subtree from [pbakaus/impeccable](https://github.com/pbakaus/impeccable).

- **Source commit:** `695df68a5860da4d25cd629fc3727ec8f3c0991b` (main, 2026-09-04)
- **Skill version:** 4.1.3 (per `SKILL.md` frontmatter)
- **License:** Apache 2.0 (full text included as `LICENSE` in this directory)
- **Vendored path:** `.claude/skills/impeccable/` only, i.e. exactly what
  upstream ships at that same path. Nothing was installed into any other
  tool's config directory (`.cursor/`, `.gemini/`, `.kiro/`, etc.) — those
  aren't relevant to this project.

## Why manual vendoring instead of `npx impeccable install`

The documented installer writes configuration for ~20 different AI coding
tools across the repo root, most of which this project doesn't use. Copying
just the `.claude/skills/impeccable/` subtree keeps the footprint scoped to
Claude Code and fully visible/reviewable in git, with no CLI install step
required — this also makes it work the same way in Claude Code on the web.

## What was intentionally excluded: the "live" subsystem

Upstream's `live` command (in-browser visual variant iteration) was left out.
It's a separate, much larger subsystem: a local HTTP server, browser
DOM-injection scripts, a Svelte-component synthesizer, and per-framework
adapters (Next.js, Nuxt, Astro, SvelteKit, etc.) — roughly 1.3MB across
`scripts/live/`, root-level `live-*.mjs`/`live-browser*.js` files, and
`modern-screenshot.umd.js`. It's independent of everything else (verified: no
non-live script imports anything from it), so removing it doesn't affect
`init`, `shape`, `audit`, `critique`, `polish`, and the rest of the commands
in `SKILL.md`.

Removing it required small edits (kept minimal and clearly marked) to:
- `SKILL.md` — dropped the `live` row from the Commands table and the `live`
  mention from `argument-hint`/`description`; added a note pointing here.
- `scripts/command-metadata.json` — removed the `"live"` entry.
- `reference/routing.md` — the no-argument menu no longer suggests `live`.
- `reference/init.md` — dropped the live-mode setup step and its mention in
  the "what to do next" list.
- `reference/typeset.md`, `reference/colorize.md`, `reference/layout.md` —
  each had one sentence pointing at `live.md`'s parameter contract; replaced
  with a note that it doesn't apply here.

If a future re-sync from upstream is done, re-check these same spots.

## Runtime dependencies

The kept scripts only import Node built-ins, except `scripts/font-match.mjs`,
which optionally uses `playwright` (not installed in this project) purely to
measure rendered text metrics for font matching. It probes for a Playwright
install and silently falls back (returns `null`) if not found — this is not
a hard requirement, and no `playwright` devDependency was added on its
account. Add it later if that specific feature is wanted.

## Network calls made by the retained commands

- `reference` docs route review commands (`web-design-guidelines` skill
  aside) largely offline, but the `new-work` / concept-seeding flow
  (`scripts/concept-seed.mjs`) fetches a curated "concept catalog" from
  `https://impeccable.style/api` and, on a dealt (non-local) round, sends a
  small anonymous ping (which card class was chosen — no project content,
  per the script's own comments: "Grounded candidates' names never leave the
  machine"). Set `IMPECCABLE_NO_TELEMETRY=1` or the standard `DO_NOT_TRACK=1`
  env var to disable the ping entirely; neither is set by default here.
- `scripts/generate-image.mjs` only calls the OpenAI Images API if
  `OPENAI_API_KEY` is set in the environment; otherwise it says so and
  defers to Claude Code's own native image generation instead. No key is
  configured in this project, so this path is inactive by default.

## Third-party attribution

`reference/ios.md` and `reference/android.md` are, per upstream's own
`NOTICE.md`, distilled from [ehmo/platform-design-skills](https://github.com/ehmo/platform-design-skills)
(MIT licensed), rewritten in Impeccable's voice.
