# Design Decisions — The Living Signal

This document preserves the approved visual direction and prevents repeated, unwanted redesigns.

## Approved reference

The approved Act 01 reference is the **second five-stage storyboard** supplied by the owner on 4 November 2026. It depicts the initial introduction, scroll transition, ring formation, sequential topic cards and final connected discovery state.

The storyboard is a design reference, not a production asset. Recreate it with a responsive scene and real UI.

## Visual atmosphere

Target: a luminous, atmospheric, premium technology-film aesthetic.
- Expansive peach and soft sky-blue cloud environment.
- Warm ivory light and coral accents.
- Atmospheric depth and natural cloud gradients.
- Delicate luminous orbital curves.
- Controlled bloom and glowing connection points.
- Elegant typography with strong contrast and readable body copy.
- Translucent cards integrated into the environment, not generic dashboard widgets.

The cloud/sky environment must be recognisable as an environment. A flat pale CSS gradient is not an acceptable substitute.

## Palette

Keep the existing warm palette where available: warm ivory, peach, soft sky blue, coral and soft white illumination. Do not introduce a global theme replacement. Compare any proposed tokens against the approved reference before changing them.

## Composition

- Portrait is the primary visual anchor.
- Preserve natural aspect ratio; keep the portrait fully visible at the final state.
- Initial text and portrait form a balanced composition.
- During scroll, text leaves the stage and the portrait moves to the centre while scaling to fit.
- Rings form around the portrait without obscuring the face.
- Five topic cards occupy deliberate positions around the orbital structure.
- Cards remain legible and do not overlap the portrait or one another.

## Motion language

Calm, controlled, fluid and cinematic. Motion is driven by scroll progress. Curves progressively draw into view, connection nodes travel along paths, and cards reveal sequentially with restrained opacity/position/scale changes. Forward and reverse scroll both work. Avoid jitter, random movement, sudden jumps and constant distracting animation.

## Rejected concepts

The owner has already rejected giant name typography colliding with the portrait, duplicate HTML/WebGL portrait, flat grey backing panel, oversized face crop, huge floor/triangular shadow, pedestal/shelf, abstract glass sculpture, random spheres and particles, unrelated architecture, dark glass fins, flat muted beige with arbitrary orbit lines, and scattered generic dashboard cards.

## Design review rule

A code change is not design approval. The owner judges the actual browser output. Every milestone must include captures at meaningful scroll positions.
