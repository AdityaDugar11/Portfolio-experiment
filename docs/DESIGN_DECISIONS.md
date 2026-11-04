# Design Decisions — The Living Signal

## Master References & Source of Truth

Visual design decisions are governed by:
1. **`docs/reference/act-01-master-storyboard.png`** — Exact visual composition, environment, architectural framing, lighting, floating holographic elements, and 5-stage scroll choreography for Act 01.
2. **`docs/MASTER_CREATIVE_BRIEF.md`** — Comprehensive portfolio vision, aesthetic principles, colour system, chapter narrative, and technical guidelines.

---

## Act 01 Visual Atmosphere & Composition

As established in the master storyboard (`act-01-master-storyboard.png`):
- **Sunset & Atmospheric Environment**: Luminous sunset sky blending peach, soft sky-blue, coral, and warm ivory, radiating serene natural light.
- **Lakeside Skyline & Water Reflections**: Distant architectural skyline across a calm lake, inspired by Udaipur's Lake Pichola palace architecture and Rajasthan havelis, casting soft water reflections.
- **Architectural Framing & Flowering Foreground**: An intricate red-sandstone haveli archway framing the left of the scene, draped with vibrant magenta/pink bougainvillea flowering vines.
- **Realistic Human Portrait**: High-fidelity, transparent portrait of Aditya (`aditya.png`) in natural human form with warm lighting matching the sunset. Fully proportionate; never low-poly, voxel, pixelated, or over-cropped.
- **Floating Technical Elements**: Floating holographic elements orbiting the composition:
  - Glowing AI processor chip (`AI`).
  - Luminous code card (`</>`).
  - Translucent Linux penguin badge (Tux).
  - 3D server rack tower.
- **Glowing Orbital Rings**: Delicate, luminous orbital paths with travelling coral/peach nodes that progressively form around the portrait as scroll advances, without obscuring Aditya's face.
- **Topic Cards as Luminous Information Nodes**: Five refined technical cards connected by 1px glowing vector paths to specific orbital nodes:
  1. `</>` **Software Engineering**
  2. Brain/chip **AI & Local LLMs**
  3. Layered nodes **Autonomous Agents**
  4. CPU chip **Linux & System Design**
  5. Play/cursor **Creative Technology**

---

## Approved Colour System

| Role | Colour Family | Usage |
| :--- | :--- | :--- |
| **Sky & Atmosphere** | Soft sky blue, light aqua, peach, warm ivory | Multi-layered atmospheric sky and lake reflections |
| **Accents & Energy** | Warm coral, saffron-inspired warm accents, champagne gold | Orbital curves, travelling nodes, active indicators, button fills |
| **Architecture & Flora** | Red sandstone, terracotta, vibrant magenta/pink bougainvillea | HAVELI archway framing and foreground floral accents |
| **Card Backplates** | Warm ivory / deep twilight with restrained transparency | Subdued information node backings with subtle coral borders |
| **Text** | Warm ivory, crisp off-white, muted champagne | High-contrast readable typography |

### Disallowed & Rejected Palettes
- ❌ Rose-wine.
- ❌ Muted dull gold.
- ❌ Sage green.
- ❌ Deep corporate blue / generic navy.
- ❌ Blue-violet gradients.
- ❌ Neon-green "hacker" AI styling.
- ❌ Generic purple-blue AI gradients.

---

## Motion & Interaction Language

- **Scroll-Scrubbed Progression**: All animations are driven deterministically by scroll progress via GSAP ScrollTrigger timelines. Slow scroll, fast scroll, and reverse scroll are seamless.
- **No Idle Drift**: No unlinked time-based drift that displaces 3D elements away from scroll state.
- **Custom Cursor**: Custom dot-and-ring cursor with smooth physics, responsive hover states, and touch/reduced-motion fallback.
- **Interaction Inspiration**: [Ameen Abdullah](https://ameen-abdullah.dev/) provides inspiration for interaction polish and camera choreography, while keeping an original visual identity.

---

## Explicitly Rejected Concepts

The following directions must never be reintroduced:
- ❌ Flat beige/ivory canvas or basic CSS gradient as the entire scene.
- ❌ Generic glassmorphism or scattered dashboard widgets.
- ❌ Minecraft, voxel, pixel-art, blocky or low-poly portrait treatments.
- ❌ Large cropped face portrait or cropping that cuts off the body at final state.
- ❌ Duplicate visible HTML and WebGL portrait layers.
- ❌ Grey backing panel, pedestal, shelf, floor shadow, or triangular drop shadow behind portrait.
- ❌ Abstract unrelated glass sculptures, random spheres, or arbitrary fantasy buildings.
- ❌ Autoplay audio or ripped YouTube tracks.
- ❌ Hardcoded project catalogues in Chapter 06.
