# Implementation Plan and Approval Gates — The Living Signal

## Master Roadmap Overview

The final goal is a complete ten-chapter personal digital experience structured into four major cinematic sequences. To ensure engineering rigor and visual fidelity, development is strictly staged into controlled milestones with formal approval gates.

```
Stage 0: Master Specification Reconciliation (Current)
   │
   ▼ [Owner Approval Required]
Milestone 1: Act 01 Foundation & Scenic Environment (Stages A & B)
   │
   ▼
Milestone 2: Act 01 Orbital System, Nodes & Connectors (Stages C, D, E)
   │
   ▼
Milestone 3: Act 01 Polish, Contact Modal, Custom Cursor & Responsive QA
   │
   ▼ [MANDATORY GATE: Act 01 Visual & Functional Review]
Milestone 4: Sequence 02 — From Curiosity to Connected Systems (Ch 02–05)
   │
   ▼ [Review Gate]
Milestone 5: Sequence 03 — Project Gallery & Collaboration (Ch 06–07)
   │
   ▼ [Review Gate]
Milestone 6: Sequence 04 — The Future & Closing (Ch 08–10)
   │
   ▼ [Review Gate]
Milestone 7: Audio Integration, Global Optimization & Production Launch
```

---

## Detailed Milestone Breakdown

### Stage 0 — Master Specification Reconciliation (Completed)
- Reconcile all project documentation with `docs/MASTER_CREATIVE_BRIEF.md` and `docs/reference/act-01-master-storyboard.png`.
- Verify working directory, git remotes, and asset paths (`aditya.png`).
- Define architecture, button mappings, and full 10-chapter structure.
- **GATE**: Await owner approval before writing any application code or installing dependencies.

---

### Milestone 1 — Act 01 Foundation & Scenic Environment
- Initialize clean Vite + React 19 + TypeScript + Tailwind CSS application.
- Safely copy `aditya.png` from local backup to `public/assets/aditya.png`.
- Establish Three.js canvas layer, camera, and responsive resize listener.
- Build the scenic sunset lake environment with Udaipur-inspired palace skyline reflections.
- Construct the left red-sandstone haveli archway with blooming bougainvillea vines.
- Integrate the realistic human portrait with perspective matching and warm lighting.
- Render Stage A hero typography, nav bar, and action buttons (`Explore My Work →`, `The Journey ↗`, `GET IN TOUCH ↗`).
- Implement Stage B GSAP ScrollTrigger timeline: fade out hero text/header cleanly (zero ghosting), translate portrait to center and scale to fit.

---

### Milestone 2 — Act 01 Orbital System, Nodes & Connectors
- Construct 3D parametric elliptical curves around the portrait at varied orientations and depths.
- Add travelling glowing peach/coral nodes along orbital paths.
- Add floating holographic tech elements: glowing `AI` chip, code card (`</>`), Linux penguin badge (Tux), 3D server rack tower.
- Build the 5 topic cards as refined luminous information nodes in the DOM.
- Draw dynamic 1px glowing vector connectors from orbital nodes to card anchors.
- Orchestrate sequential card reveals (Stage D: 60–80%) and final Discovery state (Stage E: 80–100%).
- Verify seamless, deterministic reverse scroll behavior (100% → 0%).

---

### Milestone 3 — Act 01 Polish, Contact Modal & Custom Cursor
- Implement accessible Contact Modal:
  - Triggered by `GET IN TOUCH ↗` and `Initiate Inquiry`.
  - Accessible `<dialog>` with focus trap, `Escape` key support, outside click handling, and background scroll locking.
  - Wire exact email and LinkedIn links.
- Implement classic dot-and-ring custom cursor:
  - Smooth spring physics, hover scaling over interactive elements, touch device bypass.
- Wire `Explore My Work →` to scroll smoothly down to Chapter 06.
- Wire `The Journey ↗` to smoothly initiate Stage B transition.
- Ensure site remains 100% silent (sound toggle rendered muted).
- Responsive adaptation for tablet (768px) and mobile (375px/414px).
- `prefers-reduced-motion` accessible static layout.

---

### Milestone 4 — Act 01 Formal Owner Review & Approval Gate
- Execute full browser validation across slow, fast, and reverse scroll.
- Capture browser screenshots at 0%, 20%, 40%, 60%, 80%, and 100% scroll progress.
- Record reverse-scroll demonstration and modal interaction.
- Deliver comprehensive milestone report.
- **STRICT GATE**: Stop and wait for explicit owner approval. **No work on Chapter 02 begins until Act 01 is approved.**

---

### Milestone 5 — Sequence 02: From Curiosity to Connected Systems (Chapters 02–05)
- **Chapter 02 (Beyond the Interface)**: Physical architectural surfaces transitioning into digital code and wireframe layers.
- **Chapter 03 (The Learning Curve)**: Dynamic spatial journey through engineering fundamentals, experiments, and debugging.
- **Chapter 04 (What Draws My Attention)**: 3D interconnected network visualization of the six core technical domains.
- **Chapter 05 (How I Turn Ideas into Systems)**: Interactive software architecture diagram and connected technology nodes.

---

### Milestone 6 — Sequence 03: Project Gallery & Collaboration (Chapters 06–07)
- **Chapter 06 (The Work I Choose to Show)**:
  - Implement secure server-side endpoint fetching public pinned repos for `AdityaDugar11` via GitHub GraphQL.
  - Secure `GITHUB_TOKEN` environment variable handling.
  - Display exact returned pinned repos in preserved order with rich metadata, tags, and link handling.
  - Graceful handling of loading, empty states, and errors.
- **Chapter 07 (Engineering with Others)**:
  - Contemporary collaborative digital workspace highlighting GrooveIt internship engineering contributions.

---

### Milestone 7 — Sequence 04: The Future & Closing (Chapters 08–10)
- **Chapter 08 (The Experimental Lab)**: Floating 3D experimental objects, local LLM/agent visualizer, interactive particles.
- **Chapter 09 (Still Becoming)**: Spacious cinematic camera journey into expanding frontiers.
- **Chapter 10 (The Next Connection)**: Memorable final visual composition connecting back to opening themes, closing summary, and contact actions.

---

### Milestone 8 — Audio Integration & Global Polish
- Present three vetted, properly licensed instrumental lo-fi / ambient tracks for owner selection.
- Integrate chosen audio track: default MUTED, user-triggered via nav toggle, smooth volume fade in/out, persistent across transitions.
- Global memory audit: confirm WebGL geometries, textures, and listeners dispose cleanly.
- End-to-end QA checklist execution across desktop, tablet, and mobile.
