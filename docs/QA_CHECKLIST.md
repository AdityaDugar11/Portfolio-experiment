# QA and Acceptance Checklist — The Living Signal

## 1. Pre-Implementation Verification
- [ ] Working directory confirmed: `/home/adityadugar/Documents/Projects/Portfolio-experiment`.
- [ ] Git remote and branch clean and synchronized with GitHub.
- [ ] `docs/reference/act-01-master-storyboard.png` verified and inspected.
- [ ] Original portrait verified at `/home/adityadugar/Downloads/Portfolio/frontend/public/images/aditya.png` (copied, never moved or modified).
- [ ] No application code, dependencies, or destructive operations executed before owner approval.

---

## 2. Act 01 Visual Fidelity (Master Storyboard Verification)
- [ ] **Sunset Lake Atmosphere**: Realistic sunset sky blending peach, soft sky-blue, coral, and ivory; serene lake with soft palace reflections.
- [ ] **Architectural Framing**: Red-sandstone haveli archway on the left draped with blooming pink/magenta bougainvillea vines.
- [ ] **Portrait Quality**: Realistic human portrait of Aditya in a black shirt, warm sunset lighting, preserved proportions, transparent background (no low-poly, voxel, pixelation, or cropping).
- [ ] **Floating Holographic Tech Elements**:
  - [ ] Glowing `AI` processor chip.
  - [ ] Luminous code card (`</>`).
  - [ ] Translucent Linux penguin badge (Tux).
  - [ ] 3D server rack tower.
- [ ] **Orbital Ring System**: Multi-angle 3D elliptical curves with travelling glowing peach/coral nodes that draw in progressively without obscuring the face.
- [ ] **5-Stage Choreography**:
  - [ ] Stage 1 (0%): Initial View (text + portrait + scenic background).
  - [ ] Stage 2 (20%): Scrolling Begins (text fades, portrait moves to center cleanly with zero ghosting).
  - [ ] Stage 3 (40%): Transformation (rings and connection lines form).
  - [ ] Stage 4 (60%): Connections (topic cards appear one by one with animated connectors).
  - [ ] Stage 5 (80–100%): Discovery (all 5 cards connected and balanced around central portrait).
- [ ] **Five Luminous Topic Cards**:
  - [ ] `</>` Software Engineering
  - [ ] AI & Local LLMs
  - [ ] Autonomous Agents
  - [ ] Linux & System Design
  - [ ] Creative Technology
  - [ ] Styled as refined luminous nodes (no generic glassmorphism or dashboard widgets).
- [ ] **Reverse Scroll**: Deterministically reverses all stages back to initial state without jitter or state desync.

---

## 3. Navigation & Interactive Controls
- [ ] **`Explore My Work →`**: Smoothly navigates to Chapter 06 (Selected Work / GitHub pinned repositories gallery).
- [ ] **`The Journey ↗`**: Smoothly initiates narrative scroll into Stage B and orbital transformation.
- [ ] **`GET IN TOUCH ↗` / `Initiate Inquiry`**: Opens the accessible Contact Modal.
- [ ] **Contact Modal**:
  - [ ] `Escape` key closes modal.
  - [ ] Visible `✕` close button works.
  - [ ] Backdrop click closes modal.
  - [ ] Background body scroll locked while modal is active.
  - [ ] Keyboard focus trapped inside dialog; restored to opener upon close.
  - [ ] Contact links: `mailto:adityadugar7@gmail.com` and `https://www.linkedin.com/in/adityadugar11/`.
- [ ] **Custom Cursor**:
  - [ ] Dot-and-ring cursor tracks pointer smoothly.
  - [ ] Scales/transforms appropriately on clickable elements.
  - [ ] Native cursor restored on touch devices.
  - [ ] Bypassed under `prefers-reduced-motion`.

---

## 4. Audio Governance
- [ ] Site is 100% silent on initial load.
- [ ] No audio files loaded before explicit user opt-in.
- [ ] Sound toggle rendered in muted state in navigation bar.
- [ ] Page scrolling, navigation, and rerenders never activate sound.
- [ ] Unapproved or ripped tracks are completely absent.

---

## 5. Sequence 02, 03 & 04 Validation (Full Experience)
- [ ] **Sequence 02 (Ch 02–05)**: Surface-to-digital transformations, spatial learning path, 3D domain network, interactive architecture diagrams.
- [ ] **Sequence 03 (Ch 06–07)**:
  - [ ] GitHub GraphQL queries real public pinned repos for `AdityaDugar11`.
  - [ ] `GITHUB_TOKEN` secret handled server-side; zero token leakage in client bundle.
  - [ ] Pinned order preserved; displays exact returned count; no hardcoded project fallbacks.
  - [ ] GrooveIt collaborative engineering narrative presented honestly without inflated claims.
- [ ] **Sequence 04 (Ch 08–10)**:
  - [ ] Experimental lab with floating 3D objects and particles.
  - [ ] Expanding camera journey.
  - [ ] Final connection synthesis with direct contact links.

---

## 6. Performance, Responsiveness & Accessibility
- [ ] Adaptive DPR: clamped to 1.5–2.0 max; 1.0 on mobile.
- [ ] Mobile (375px/414px) and tablet (768px) layouts intentionally recomposed.
- [ ] Zero horizontal scroll or layout shift.
- [ ] Geometries, materials, and textures disposed cleanly on unmount.
- [ ] WebGL rendering paused when tab is inactive.
- [ ] Graceful fallback when WebGL is unavailable.
- [ ] `prefers-reduced-motion` provides accessible static layouts.
- [ ] High-contrast, readable text across all viewports.
