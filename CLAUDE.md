# CLAUDE.md

Project guidance for Claude Code when working in this repository.

This site must read as the work of an excellent independent digital
design studio — not as AI-generated output. Design quality is a hard
requirement here, not a nice-to-have.

## Stack

- **Next.js** (App Router) — framework
- **React** — UI library
- **TypeScript** — language
- **Tailwind CSS** (v4) — styling
- **Motion for React** (`motion/react`) — animation

## Project structure

```
src/
  app/            Next.js App Router routes, layouts, and global styles
  components/
    ui/           Small, reusable, presentational UI primitives
    layout/       Structural components shared across pages (header, footer, shell)
  lib/            Framework-agnostic utilities and helpers
  hooks/          Custom React hooks
  types/          Shared TypeScript types
public/           Static assets
references/       Reference material to consult while building the site
.claude/
  agents/         Custom subagent definitions (the design studio, see below)
  skills/         Custom skills
  rules/          Project-specific rules and conventions
```

## The design studio

Four subagents in `.claude/agents/` act as an independent studio. Use them
— don't just design solo and skip straight to code:

- `art-director` (Opus) — sets and defends creative direction before
  build; judges originality, typography, composition, brand fit.
- `visual-critic` (Opus) — reviews implemented UI for typography,
  spacing, hierarchy, composition, rhythm, production value, and generic
  AI patterns.
- `ux-critic` (Sonnet) — reviews IA, comprehension, interaction,
  navigation, conversion flow, mobile UX.
- `qa-reviewer` (Sonnet) — reviews responsive behavior, accessibility,
  rendering, console errors, interactions, overflow, performance.

The three critics analyze and report; they don't implement fixes
themselves. Treat their findings as input, not as optional commentary.

## Skills

Project-scoped skills live in `.claude/skills/` (see its `README.md` for
sources/licenses). Use them:

- `frontend-design` (Anthropic) — distinctive visual design guidance;
  reach for this before/while building new UI.
- `web-design-guidelines` (Vercel) — reviews code against Vercel's Web
  Interface Guidelines (accessibility, forms, performance, etc.).
- `react-best-practices` (Vercel) — React/Next.js performance rules;
  apply when writing or reviewing components and data fetching.
- `impeccable` (community) — design critique/audit/polish commands
  (`/impeccable audit`, `critique`, `polish`, etc.); its in-browser "live"
  variant mode was intentionally not vendored, everything else works.

## Design principles (permanent)

- Originality over speed. Never default to generic SaaS design.
- Avoid hero + three cards + testimonials structures unless genuinely
  appropriate to the content.
- Avoid unnecessary cards, generic gradients, excessive rounded
  rectangles, and arbitrary glassmorphism.
- Typography is a major visual element, not an afterthought.
- Use scale, whitespace, rhythm, asymmetry, and composition deliberately.
- Every page needs a strong central visual idea.
- Every major page should contain at least one memorable signature
  element.
- Mobile must be intentionally designed, not just reflowed.
- Motion should communicate hierarchy, narrative, or interaction — never
  decoration for its own sake.
- Prefer real assets over placeholders.

## Design process (for major visual work)

brief → references → competing creative directions → art director review
→ selected direction → hero prototype → browser inspection → visual
critique → iteration → full page → motion pass → independent reviews
(`visual-critic`, `ux-critic`, `qa-reviewer`) → responsive QA →
accessibility → performance → final polish

Small, well-scoped tweaks to existing, already-reviewed work don't need
the full pipeline — use judgment. New pages, new sections, and any hero
or landmark surface do.

## Verification requirement

**Never consider a visual implementation finished by reading source code
alone.** After any major frontend change, actually render it and look:
run the dev server, view it in a browser (or headless browser tooling)
across desktop and mobile widths, and check the console. Source code
that "looks right" can still render broken, misaligned, or unreadable.

## Conventions

- Use the App Router (`src/app`) — no `pages/` directory.
- Use TypeScript for all source files (`.ts` / `.tsx`); no plain `.js`.
- Use Tailwind utility classes for styling; avoid separate CSS files
  unless a utility can't express what's needed.
- Import animation primitives from `motion/react`, not the legacy
  `framer-motion` package.
- Use the `@/*` import alias (maps to `src/*`) instead of relative
  `../../..` paths.
- Path aliases and compiler options are defined in `tsconfig.json` —
  check it before adding new ones.

## Commands

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — run a production build
- `npm run lint` — lint with ESLint

## Notes

- No homepage or page designs exist yet — `src/app/page.tsx` is a
  placeholder. Do not treat it as a design reference.
