# Vendoring notes

Vendored verbatim from [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines).

- **Source commit:** `063bee94c3f4df8453406c830b0a7df0f2860278` (main, 2026-09-04)
- **License:** MIT (per upstream repo)

This skill does not bundle a ruleset — at review time it fetches the current
guidelines live from `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`
via `WebFetch`, so it always reviews against Vercel's latest published rules
rather than a snapshot.
