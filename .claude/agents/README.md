# agents

Custom subagent definitions for this project — a small virtual design
studio used to direct and review the site's design and implementation.

| Agent | Role | Model |
|---|---|---|
| `art-director` | Sets and defends creative direction: originality, typography, composition, visual concept, brand distinctiveness, avoiding AI-looking design. | Opus |
| `visual-critic` | Independently reviews implemented UI for typography, spacing, hierarchy, composition, visual rhythm, production value, and generic AI design patterns. | Opus |
| `ux-critic` | Reviews information architecture, comprehension, interaction, navigation, conversion flow, and mobile UX. | Sonnet |
| `qa-reviewer` | Reviews responsive behavior, accessibility, browser rendering, console errors, interactions, overflow, and performance. | Sonnet |

`visual-critic`, `ux-critic`, and `qa-reviewer` analyze and report; they do
not edit implementation files by default. `art-director` sets direction
and critiques concepts but does not implement the design itself.
