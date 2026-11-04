# AGENT INSTRUCTIONS — READ FIRST

These instructions apply to every coding agent and every conversation working in this repository. Read this file, `README.md`, and all files under `docs/` before making changes.

## 1. Source of Truth & Governance Hierarchy

When resolving requirements or priorities, strictly follow this hierarchy:
1. **Latest explicit directives from the owner.**
2. [`docs/MASTER_CREATIVE_BRIEF.md`](docs/MASTER_CREATIVE_BRIEF.md) — Overarching vision, complete ten-chapter narrative, four cinematic sequences, aesthetic philosophy, and technical architecture for the entire portfolio.
3. [`docs/reference/act-01-master-storyboard.png`](docs/reference/act-01-master-storyboard.png) — Authoritative visual reference for Act 01 composition, sunset-lakeside environment, architectural framing, realistic human portrait, floating holographic tech elements, and 5-stage scroll choreography.
4. [`docs/DESIGN_DECISIONS.md`](docs/DESIGN_DECISIONS.md) and [`docs/ACT_01_SPEC.md`](docs/ACT_01_SPEC.md) — Detailed design specifications, interaction tokens, and stage-by-stage implementation specifications.
5. Supporting visual references — Supplementary inspiration translated into contemporary 3D elements.
6. Existing portfolio (`https://adityadugar.vercel.app/`) — Content, personal details, project links, assets, and functionality source ONLY (never visual design).

Do not make changes to the approved visual composition, themes, or layouts without the owner's explicit permission.

## 2. Non-Negotiable Design & Visual Decisions

- Project title: **THE LIVING SIGNAL**.
- The authoritative visual reference for Act 01 is [`docs/reference/act-01-master-storyboard.png`](docs/reference/act-01-master-storyboard.png).
- **Scenic Sunset Lakeside Environment**: Faithful reproduction of the sunset sky, lake palace reflections, sandstone haveli archway with blooming bougainvillea framing the left, floating holographic elements (`AI` chip, code card, Linux Tux badge, 3D server rack tower), and glowing orbital rings.
- **Realistic Human Portrait**: Use Aditya's realistic portrait (`aditya.png`) with clean alpha transparency, warm sunset lighting, and preserved proportions. Fully visible and proportionate in both initial and final discovery states.
- Maintain the approved colour family: warm ivory, peach, soft sky-blue, warm coral, champagne gold, and soft terracotta.
- The scenic environment is an authentic layered 3D world with depth and reflections; a flat CSS gradient is strictly unacceptable.
- **5-Stage Scroll Choreography**:
  - Stage 1 (0%): Initial View (hero text, portrait, scenic environment, floating tech elements).
  - Stage 2 (20%): Scrolling Begins (hero text fades cleanly with zero ghosting; portrait glides to center).
  - Stage 3 (40%): Transformation (orbital rings and connection lines form with peach/coral glow).
  - Stage 4 (60%): Connections (5 topic cards appear sequentially with animated vector connectors).
  - Stage 5 (80–100%): Discovery (all 5 cards connected and balanced around central portrait).
- **The Complete Experience**: The finished site contains all ten chapters across the four major cinematic sequences defined in `docs/MASTER_CREATIVE_BRIEF.md`:
  - Sequence 01: The Introduction (Chapter 01)
  - Sequence 02: From Curiosity to Connected Systems (Chapters 02–05)
  - Sequence 03: The Project Gallery & Collaboration (Chapters 06–07)
  - Sequence 04: The Future and Closing (Chapters 08–10)
- Natural, deterministic reverse scrolling that unwinds the scene back to Stage A.

## 3. Explicitly Rejected Directions

Never introduce or reintroduce:
- ❌ Flat beige/ivory canvas or basic CSS gradient as the environment.
- ❌ Minecraft, voxel, pixel-art, blocky, or low-poly portrait/character styling.
- ❌ Oversized face crop or cropping that cuts off the body at final state.
- ❌ Duplicate visible HTML and WebGL portraits.
- ❌ Grey portrait backing, pedestal, shelf, floor shadow, or triangular drop shadow.
- ❌ Generic glassmorphism or scattered dashboard widgets.
- ❌ Abstract unrelated glass sculptures, random spheres, arbitrary particles, or unrelated fantasy buildings.
- ❌ Dark-dominant styling, deep blue, blue-violet, dominant teal, rose-wine, muted gold, or neon-green AI stereotypes.
- ❌ Invented biography, accomplishments, metrics, clients, expertise, or work history.
- ❌ Location labels (e.g. Bikaner, Udaipur) added to website text.
- ❌ Autoplay audio or ripped YouTube tracks.

## 4. Protect Existing Work and Data

- Never delete the project directory or bulk-delete files as a shortcut.
- Never run destructive commands such as `rm -rf`, `git clean -fdx`, or forced resets without explicit, specific approval.
- Before replacing files, inspect their contents and preserve anything user-authored or reusable.
- Never overwrite or modify original reference assets or the master storyboard (`docs/reference/act-01-master-storyboard.png`).
- Never modify the original portrait source file (`aditya.png`). Copy it non-destructively to `public/assets/aditya.png`.
- Keep changes strictly scoped to the currently approved milestone.
- Never store secrets or API keys in client-side code or public repositories.

## 5. Content and Identity Constraints

- [`docs/STORY_CONTENT.md`](docs/STORY_CONTENT.md) and [`docs/MASTER_CREATIVE_BRIEF.md`](docs/MASTER_CREATIVE_BRIEF.md) are the content sources of truth.
- The owner is a Software Engineering student at Jain University; represent experience and learning honestly.
- Never use the phrase “I'm a passionate developer”.
- Do not add Bikaner, hometown, or location references to the text copy.
- Use the exact contact details in `docs/PROJECT_BRIEF.md`.
- Use actual public pinned repositories for the Chapter 06 work gallery via dynamic GitHub GraphQL query; verify data rather than inventing or hardcoding it.

## 6. Audio Constraints

- The site remains **100% silent** by default.
- No background soundtrack is loaded or played until the owner selects a licensed track and explicitly approves integration.
- Sound toggle rendered in muted state in navigation bar.
- Scrolling, navigation, page load, and React rerenders must never enable audio.
- Never use unlicensed music or rip from streaming platforms.

## 7. Implementation Discipline

- Implement one approved milestone at a time.
- **Act 01 must be reviewed and explicitly approved before any work begins on Act 02 / Chapters 02–10.**
- Do not redesign the website or change global theme tokens while working on a milestone.
- Do not claim functionality based only on compilation or type checks; validate in real browsers across slow scroll, fast scroll, reverse scroll, and mobile.
- Clean up event listeners, animation contexts, observers, and WebGL resources (`dispose()`).
- Respect reduced-motion preferences (`prefers-reduced-motion`) and provide a graceful WebGL fallback.

## 8. Required Report After Each Milestone

Report:
1. Files changed.
2. What changed and why.
3. What was deliberately left untouched.
4. Commands/tests run and their actual results.
5. Browser validation performed (screenshots at key scroll positions).
6. Known limitations.
7. Next steps awaiting owner approval.

Do not proceed to the next milestone until the owner explicitly approves the report.
