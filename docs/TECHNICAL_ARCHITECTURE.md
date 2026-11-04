# Technical Architecture and Engineering Constraints

## Overview

*The Living Signal* is a cinematic, scroll-driven personal digital experience built around ten chapters and four major cinematic sequences. It marries real-time Three.js/WebGL 3D rendering with high-performance DOM overlays, deterministic GSAP ScrollTrigger choreography, smooth Lenis scrolling, and secure dynamic API integration.

---

## 1. Core Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework & Build** | Vite + React 19 + TypeScript | High-performance bundling, strict typing, modular component architecture |
| **Styling** | Tailwind CSS | Editorial typography, responsive utility styling, luminous node presentation |
| **3D Rendering** | Three.js (WebGL baseline) | Real-time 3D environments, camera choreography, parametric curves, shaders |
| **Scroll Engine** | GSAP 3 + ScrollTrigger | Deterministic scroll-scrubbed chapter timelines, reversible animations |
| **Smooth Scroll** | Lenis | Smooth scrolling integrated into GSAP ticker (single rAF loop) |
| **Data Integration** | Server-side GitHub GraphQL | Dynamic pinned repository fetching via secure `GITHUB_TOKEN` |
| **Cursor** | Custom Dot-and-Ring Cursor | Spring physics, hover scaling, touch bypass, reduced-motion fallback |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Lenis Smooth Scroll                   │
│                                │                            │
│                 GSAP ScrollTrigger Master Ticker            │
│                 (Single Progress Source per Chapter)        │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                ▼                             ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│      WebGL 3D Layer         │ │     Semantic DOM Layer      │
│         (Three.js)          │ │       (React / CSS)         │
├─────────────────────────────┤ ├─────────────────────────────┤
│ • Multi-sequence Scenes     │ │ • Top Navigation & Logo     │
│ • Sunset Lake & Sky Planes  │ │ • Editorial Typography      │
│ • Sandstone Arch & Vines    │ │ • Stage A Hero Copy & CTAs  │
│ • Realistic Portrait Mesh   │ │ • Luminous Information Nodes│
│ • Floating Tech Meshes      │ │ • Dynamic GitHub Gallery    │
│ • 3D Parametric Orbit Tubes │ │ • Accessible Contact Modal  │
│ • Travelling Glow Nodes     │ │ • Dot-and-Ring Custom Cursor│
│ • Dynamic Vector Connectors │ │ • Screen Reader Support     │
└─────────────────────────────┘ └─────────────────────────────┘
```

---

## 3. Four Major Cinematic Sequences

1. **Sequence 01 — The Introduction (Chapter 01)**:
   - Scenic sunset lake environment with Udaipur-inspired skyline reflections.
   - Red-sandstone haveli archway with bougainvillea framing the left.
   - Realistic human portrait of Aditya, floating holographic tech elements (`AI`, `</>`, Linux Tux, server rack).
   - 5-stage transformation into 3D orbital system and 5 luminous topic cards.
2. **Sequence 02 — From Curiosity to Connected Systems (Chapters 02–05)**:
   - Physical surfaces transitioning to digital code / system wireframes.
   - Spatial learning journey; interconnected 3D domain nodes and interactive architectural diagrams.
3. **Sequence 03 — The Project Gallery & Collaboration (Chapters 06–07)**:
   - Dynamic 3D/DOM gallery populated via live GitHub GraphQL pinned repositories query.
   - GrooveIt collaborative engineering visual narrative.
4. **Sequence 04 — The Future and Closing (Chapters 08–10)**:
   - 3D experimental lab with floating models and interactive particles.
   - Expansive camera journey through sunset-into-twilight skies.
   - Closing synthesis and persistent accessible contact links.

---

## 4. Dynamic GitHub Pinned Repositories Integration

Per the Master Creative Brief, Chapter 06 must query the real public pinned repositories of `AdityaDugar11`:

```graphql
query {
  user(login: "AdityaDugar11") {
    pinnedItems(first: 6, types: [REPOSITORY]) {
      nodes {
        ... on Repository {
          name
          description
          url
          primaryLanguage {
            name
          }
          stargazerCount
          updatedAt
          openGraphImageUrl
        }
      }
    }
  }
}
```

### Security & Integrity Rules:
- The GitHub personal access token (`GITHUB_TOKEN`) must **never** be exposed in client-side code.
- Handled through a server-side route (Vite dev server proxy / serverless API function).
- Pinned order is preserved exactly as returned.
- Exact number of returned items displayed (no hardcoded catalogue fallbacks or injected unpinned repos).
- Robust handling of loading, empty states, and image fallbacks.

---

## 5. Performance, Memory & Resource Management

- **Adaptive DPR**: Clamped to a maximum of 1.5–2.0 on high-DPI desktop screens; 1.0 on mobile to prevent GPU thermal throttling.
- **Resource Disposal**: Explicit cleanup (`geometry.dispose()`, `material.dispose()`, `texture.dispose()`, `renderer.dispose()`) on chapter unmounts and hot reloads.
- **Render Loop Throttling**: Render execution is paused when the page/tab is hidden (`visibilitychange`) or when WebGL scenes are scrolled outside viewport bounds.
- **Reduced Overhead**: Avoid heavy post-processing stacks (e.g. multi-pass SSAO/SSR); use lightweight bloom and depth layering.
- **Graceful WebGL Fallback**: If WebGL is unavailable or fails, display an accessible high-fidelity 2D composition ensuring all story content and links remain accessible.
- **`prefers-reduced-motion`**: Disables heavy camera transitions and orbital rotations; provides clean, static visual compositions with full narrative legibility.

---

## 6. Audio Architecture

- **Silent by Default**: No audio context created or loaded on initial page load.
- **Strict User Activation**: Audio starts only after explicit user interaction on the visible sound toggle.
- **Persistence**: Single audio manager instance that does not reinitialize or change volume across route/chapter changes.
- **Volume Ramping**: Smooth volume fade-in and fade-out to prevent clicks and abrupt cuts.
- **Licensing Constraint**: The audio system will stay inactive until an approved, properly licensed ambient track is supplied by the owner.
