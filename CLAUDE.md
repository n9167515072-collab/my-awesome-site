# CLAUDE.md

Project guidance for Claude Code when working in this repository.

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
  agents/         Custom subagent definitions
  skills/         Custom skills
  rules/          Project-specific rules and conventions
```

## Conventions

- Use the App Router (`src/app`) — no `pages/` directory.
- Use TypeScript for all source files (`.ts` / `.tsx`); no plain `.js`.
- Use Tailwind utility classes for styling; avoid separate CSS files unless
  a utility can't express what's needed.
- Import animation primitives from `motion/react`, not the legacy
  `framer-motion` package.
- Use the `@/*` import alias (maps to `src/*`) instead of relative
  `../../..` paths.
- Path aliases and compiler options are defined in `tsconfig.json` — check
  it before adding new ones.

## Commands

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — run a production build
- `npm run lint` — lint with ESLint

## Notes

- No homepage or page designs exist yet — `src/app/page.tsx` is a
  placeholder. Do not treat it as a design reference.
