# skills

Project-scoped skills, vendored directly into the repo so they work the same
way in Claude Code on the web as locally (no marketplace/CLI install step
required). Each has a `VENDORING.md` with source commit, license, and any
modifications made.

| Skill | Source | License | Notes |
|---|---|---|---|
| `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | see `LICENSE.txt` | Official Anthropic skill. Verbatim, unmodified. |
| `web-design-guidelines` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | MIT | Official Vercel skill. Fetches Vercel's Web Interface Guidelines live at review time (always current, no bundled ruleset). |
| `react-best-practices` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices) | MIT | Official Vercel skill. React/Next.js performance rules (`SKILL.md` + the fully-expanded `AGENTS.md`). |
| `impeccable` | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | Apache 2.0 | Independent (not first-party) design-critique/design-system skill. Manually vendored subset — the in-browser "live" visual-iteration subsystem (local preview server, DOM injection) was deliberately excluded; everything else (`init`, `shape`, `audit`, `critique`, `polish`, etc.) is intact. See its `VENDORING.md` for what was cut and why, plus network/telemetry notes. |
