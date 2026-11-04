# Technical Architecture and Engineering Constraints

## First rule: inspect the repository

Do not assume the project has been scaffolded. Inspect the actual files first. The previous experiment used React, TypeScript, Vite, Three.js, GSAP/ScrollTrigger and Lenis; these are useful context, not permission to reinstall or duplicate dependencies blindly.

## Suggested responsibilities

Use a persistent scene layer for environment and scroll-controlled visuals, with semantic HTML for text, buttons, cards, navigation and contact UI. Separate application/chapter orchestration, persistent canvas, environment, portrait rendering, orbital geometry, scroll timelines, HTML overlays, modal, and asset loading/responsive quality management. Avoid a monolithic component.

## 3D and scroll

- Use Three.js for actual geometry, depth, lighting and orbital curves where appropriate.
- Use GSAP/ScrollTrigger for deterministic scroll choreography.
- If Lenis is used, integrate updates correctly and avoid duplicate animation-frame loops.
- Maintain one source of truth for scroll progress.
- Make animation reversible.
- Avoid expensive layout reads/writes on every frame.
- Reveal curves progressively instead of creating unnecessary objects.

## Portrait and background

- Preserve the original portrait aspect ratio and transparency.
- Preload critical imagery.
- Use a suitable cloud/sky image or texture with layers and subtle parallax if this provides better quality than expensive procedural volumetrics.
- Do not describe a 2D portrait texture on a plane as a volumetric 3D person.
- Keep accessible text available outside the canvas.

## Performance

The owner has an RTX 5060 Laptop GPU with 8GB VRAM, but the website must also work on ordinary laptops and phones.
- Adaptive device pixel ratio and reasonable canvas resolution.
- Limit transparent overdraw and costly post-processing.
- Avoid unnecessary shadow maps and volumetrics.
- Pause or reduce rendering when the scene is not visible.
- Dispose geometries, materials, textures and render targets correctly.
- Provide lower quality on mobile/weak devices.
- Provide static/simplified fallback if WebGL is unavailable.
- Respect `prefers-reduced-motion`.

## Accessibility

Use semantic headings/buttons, accessible HTML topic information, keyboard navigation, modal Escape/focus handling, adequate contrast, and a reduced-motion experience that still communicates the narrative.

## Audio

No audio implementation should be active until the owner selects a licensed track. See `AUDIO_DECISION.md`.

## Quality gates

Build/lint/type checks are necessary but insufficient. Browser testing and actual visual inspection are mandatory. Report exactly what was tested.
