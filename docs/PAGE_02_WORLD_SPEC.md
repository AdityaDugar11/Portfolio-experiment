# Page 02 — Connected World Specification

Status: Phase 00 discovery. This specification supersedes earlier Page 02 visual directions; the ten chapters in STORY_CONTENT.md remain canonical. Every subsequent phase requires owner approval.

## Direction

One fictional real-time landscape inspired by Rajasthan's sandstone forts, Aravalli hills, water and roads. Begin with an elevated overview; approach a fort, open its doors, enter Chapter 01, exit and travel onward. Ten destinations form a continuous spatial journey, each with a distinct environment. No portrait, constellation cards or dashboard. Do not copy reference compositions or assets.

## Architecture proposal

Use the installed Three.js, React, GSAP/ScrollTrigger and Lenis initially; add dependencies only when a measured need emerges. Own one renderer and camera in a React lifecycle with explicit resize, context-loss and cleanup handling. Separate world coordinates, asset ownership, chapter state and camera paths. Map normalized scroll to a deterministic timeline: camera splines and orientation targets, door hinges and environment state must derive from the same progress so reverse scroll is reproducible. Segment paths into overview, approach, entrance, interior and exit, with camera clearance tested at boundaries.

Create terrain as authored modular meshes with simplified distant silhouettes, shared materials and instancing where appropriate. Divide the world into destination zones; load the current and next zone progressively and unload distant zones only after disposing owned geometries, materials and textures. Keep a lightweight overview representation available. Build fort doors as separate pivoted meshes, with animation progress tied to scroll. Interior and exterior lighting must be art-directed together and tested for clipping and exposure changes.

Use glTF/GLB with texture compression (KTX2 where supported, fallback supplied) and geometry compression (Meshopt or Draco after testing decode tradeoffs). Set explicit budgets only after device profiling; cap pixel ratio, texture sizes, shadow resolution and visible object counts, with lower quality tiers selected from measurements, not user-agent alone. Preload essential overview assets; show honest loading progress and a retry path. Dispose renderer resources on unmount and handle context loss.

Mobile uses native touch scrolling with the same narrative and separately composed camera framing. Reduced motion offers a chapter-based, low-motion route with no forced camera travel. A readable HTML chapter navigation and narrative fallback must work without WebGL; keyboard navigation and focus must remain available. Test physical mobile hardware, heat and memory as well as laptop browsers before accepting performance.

## Asset strategy

Block out the original terrain and fort with simple authored geometry before commissioning or authoring modular sandstone architecture, road, landscape and water assets. Use legally licensed or original materials, record provenance, and preserve source files. Prototype door pivots and camera clearances before detailed modeling. No asset generation is authorized in Phase 00.

## Temporary navigation

While Page 02 is absent, Work, Systems and Journey point to the existing transition runway. Contact continues to open the contact modal. The Page 01-to-02 WebGL transition source and assets are retained but detached; the existing Page 01 scroll exit continues and the destination is currently empty.

## Phase roadmap

Every phase requires explicit owner approval before proceeding to the next.

- Phase 00: Repository cleanup and verification.
- Phase 01A: World art direction and visual composition, established separately by the owner and ChatGPT.
- Phase 01B: Three.js terrain foundation.
- Phase 01C: Ten-destination world map composition.
- Phase 01D: Environmental detailing and lighting.
- Phase 02: Scroll-controlled camera engine.
- Phase 03: Chapter 01 fort exterior and animated entrance.
- Phase 04: Chapter 01 interior storytelling.
- Phase 05: Chapter 02.
- Phase 06: Remaining chapters individually.
- Phase 07: Final optimization and integration.
