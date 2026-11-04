# Act 01 — The Beginning: Detailed Specification

## Purpose & Master Reference

Act 01 introduces Aditya Dugar, then transforms the opening composition through a 5-stage scroll sequence into a visual map of five connected technical topics.

The master reference is:
**[`docs/reference/act-01-master-storyboard.png`](reference/act-01-master-storyboard.png)**

---

## The 5-Stage Scroll Sequence

### Stage A — Initial View (0–20% Scroll Progress)
- **Visual Composition**:
  - Full scenic composition: sunset over a serene lake, lakeside palace skyline, reflections in the water, and birds in flight.
  - Red-sandstone haveli archway on the left draped with blooming pink/magenta bougainvillea vines.
  - Realistic human portrait of Aditya in a black shirt, warm sunset lighting, positioned at center-right.
  - Floating holographic technical elements: glowing `AI` processor chip, luminous `</>` code card, translucent Linux penguin badge, and 3D server rack tower.
  - Subtle initial orbital curves with warm coral/peach glow.
- **UI & Typography Layer**:
  - **Top Navigation Bar**: Logo `AD` with warm orange accent line; navigation links `WORK`, `SYSTEMS`, `JOURNEY`, `CONTACT`; sound toggle icon (muted by default); action button `GET IN TOUCH ↗`.
  - **Hero Editorial Block**:
    - Eyebrow: `SOFTWARE ENGINEERING · AI · INTELLIGENT SYSTEMS`
    - Display Headline: **Aditya Dugar** (expressive serif typography)
    - Quote: *“I follow questions until they become something I can build.”*
    - Narrative Copy: *“Exploring intelligent systems, software engineering, automation and creative technology.”*
    - Primary CTA: `Explore My Work →` (smoothly navigates to Chapter 06 Selected Work gallery)
    - Secondary CTA: `The Journey ↗` (smoothly initiates narrative scroll into Stage B)
  - **Right Scroll Indicator**: `01 THE BEGINNING`, vertical timeline progress bar, mouse scroll indicator.

### Stage B — Scrolling Begins (20–40% Scroll Progress)
- Hero editorial text, action buttons, and header smoothly fade and exit the viewport.
- Complete cleanup: zero text ghosting behind subsequent visual layers.
- Portrait smoothly translates towards center and scales to become the central anchor of the composition.
- The first faint orbital ring begins to trace its path around Aditya.

### Stage C — Transformation (40–60% Scroll Progress)
- Additional 3D elliptical and curved orbital paths progressively draw into view at varied orientations and depths.
- Small luminous connection nodes travel along the paths with restrained coral and peach illumination.
- The orbital rings form an integrated, harmonious system that highlights the portrait without obscuring Aditya's face.

### Stage D — Connections (60–80% Scroll Progress)
- Five topic cards appear sequentially around the orbital structure:
  1. `</>` **Software Engineering** — Building software, architecture and practical applications.
  2. Brain/chip **AI & Local LLMs** — Local inference, model experimentation and intelligent systems.
  3. Layered nodes **Autonomous Agents** — Agents, tool use, automation and multi-agent workflows.
  4. CPU chip **Linux & System Design** — Linux environments, infrastructure and system-level experimentation.
  5. Play/cursor **Creative Technology** — ComfyUI, generative workflows, GPU computing and interactive experiences.
- Animated 1px glowing vector connectors progressively draw from travelling orbital nodes to dock into their respective topic cards.
- Cards are styled as refined luminous information nodes (subdued backplates, subtle coral edge glow, crisp typography) rather than generic glass widgets.

### Stage E — Discovery State (80–100% Scroll Progress)
- All five topic cards are visible, fully connected, and balanced cleanly around the central portrait.
- The complete portrait remains visible and proportionate (not over-cropped).
- Background sunset lake atmosphere and haveli archway remain visible with soft atmospheric depth.
- Header remains hidden; text is high-contrast and fully readable.
- Seamless reverse scrolling restores earlier states deterministically.

---

## Action & Button Specifications

| Control | Target / Action | Implementation Detail |
| :--- | :--- | :--- |
| **`Explore My Work →`** | Chapter 06 (Selected Work) | Smooth scroll to the dynamic GitHub pinned repository showcase |
| **`The Journey ↗`** | Act 01 Stage B (Narrative) | Smooth scroll initiating Stage B transition and orbital formation |
| **`Get in Touch ↗` / `Initiate Inquiry`** | Contact Modal | Opens accessible modal dialog; traps focus, locks background scroll |
| **Sound Toggle** | Audio Controller | Toggles audio state; default MUTED; smooth volume fade |

---

## Modal Requirements

- Accessible HTML `<dialog>` or ARIA-compliant modal overlay.
- Closes via `Escape` key, visible close `✕` button, or backdrop click.
- Focus is trapped within modal while open and restored to triggering button on close.
- Background scroll locked while open.
- Contact endpoints: `adityadugar7@gmail.com` and `https://www.linkedin.com/in/adityadugar11/`.

---

## Acceptance Criteria

Act 01 milestone review requires:
1. Browser screen captures at 0%, 20%, 40%, 60%, 80%, and 100% scroll progress.
2. Reverse scroll demonstration (100% → 0%).
3. Contact modal keyboard/focus verification.
4. Mobile and tablet responsive validation.
5. Explicit owner approval before proceeding to Chapter 02.
