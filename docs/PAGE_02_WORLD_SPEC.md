# Page 02 — Cinematically Connected Rajasthan

Status: Phase 01A accepted; Phase 01B visual planning for owner review. The approved creative direction is Option B with Option A's architectural authenticity. The ten chapter texts in [STORY_CONTENT.md](STORY_CONTENT.md) remain canonical. Every later phase requires explicit owner approval. Forts 02–10, placement and chapter associations below are proposals, not approved selections.

## Art direction and journey

A continuous, realistic real-time Three.js interpretation of Rajasthan at the warm sunset established by Page 01. Recognizable forts retain their architectural identity, materials and local environmental character; travel distances and relative geography are artistically compressed, not represented as a literal map. Open with an elevated panorama, approach Junagarh Fort at Bikaner, open its wooden entrance doors with reversible scroll, enter for Chapter 01, then exit and travel onward. Destinations share a horizon, light and paths, with varied terrain concealing streaming boundaries. No portraits, floating cards, orbital rings, abstract objects, cartoon treatment or generic low-poly castles.

### Proposed route and chapter associations

These associations are editorial suggestions, not claims about the forts' history or exact adjacency. Select after owner review and reference research for each monument.

| Chapter | Proposed fort | Compositional cue and narrative relationship |
|---|---|---|
| 01 The Beginning | **Junagarh, Bikaner** (confirmed) | Fort on the plain; entrance and courtyard introduce the journey. |
| 02 Beyond the Interface | Mehrangarh, Jodhpur | Cliff-facing mass and layered gateways suggest what lies within. |
| 03 The Learning Curve | Kumbhalgarh | Winding walls and ascent give learning a spatial rhythm. |
| 04 What Draws My Attention | Amber (Amer) | Courtyards and hillside outlook offer multiple directions. |
| 05 How I Turn Ideas Into Systems | Chittorgarh | Gates and linked precincts suggest connections and assembly. |
| 06 The Work I Choose to Show | Jaisalmer | Golden fort and settlement form a setting for actual projects. |
| 07 Engineering With Others | Gagron | River setting and connected approaches frame collaboration. |
| 08 The Experimental Lab | Ranthambore | Forested ridge gives exploration a distinct setting. |
| 09 Still Becoming | Taragarh, Bundi | Hilltop approach suggests a continuing climb. |
| 10 The Next Connection | Nahargarh, Jaipur | Elevated outlook provides an open ending. |

UNESCO identifies Chittorgarh, Kumbhalgarh, Ranthambore, Gagron, Amber and Jaisalmer as the six Hill Forts of Rajasthan; their particular topographies matter ([UNESCO](https://whc.unesco.org/en/list/247/), [UNESCO maps](https://whc.unesco.org/en/list/247/maps/)). Other proposed associations and all route geometry remain unverified creative choices. Avoid presenting compressed locations as a geographically accurate map.

## Landscape, light and material

Arrange a readable, layered overview with Junagarh near the first approach, distant forts separated by haze and ridgelines, and a visible route that reconnects across desert, dry scrub, Aravalli-inspired hills, water and woodland. Use landforms and bends to preserve continuity without placing every fort simultaneously in the foreground. Transition vegetation and geology gradually; maintain each site's characteristic surroundings in its immediate zone. Avoid claiming these adjacencies exist in reality.

Use a low, warm directional sun, restrained atmospheric depth, cool sky fill and warm sandstone bounce, matched visually to Page 01 without reusing its video as world geometry. Preserve legibility in interiors with plausible indirect light and controlled exposure. Use physically based stone with distinct red, golden and pale variations, locally appropriate weathering, carved detail, worn timber and metal hardware. Source real reference before assigning colors to individual surfaces. Quality, precise palette and light direction remain subject to visual approval.

## Junagarh reference inventory

- [Incredible India: Junagarh Fort](https://www.incredibleindia.gov.in/en/rajasthan/bikaner/junagarh-fort): identifies Suraj Pol's golden sandstone and other elements of the complex. Record actual gate sequence and distinguish Suraj Pol from other entrances before animation design.
- [Centre for Cultural Resources and Training: Forts, Palaces and Havelis of Rajasthan](https://ccrtindia.gov.in/wp-content/uploads/2020/09/Pub_Forts_Rajasthan.pdf): architectural context and Junagarh references.
- Gather independently licensed ground-level and elevated photographs of the entire perimeter, entry approach, gate surround, door leaves and hinges, courtyards, carved screens, parapets and interiors. Cross-check dates and renovations. These are **reference requirements**, not secured assets or confirmed dimensions. Confirm whether entrance doors and their opening mechanism match the intended action before claiming historical accuracy.
- Measurements, complete ground plan, interior access permissions, reliable multiple-angle photography and reference-image reproduction rights remain unverified. Do not infer hidden elevations or declare a reconstruction exact.

## Asset availability and licensing

- A [CGTrader Junagarh listing](https://www.cgtrader.com/3d-models/exterior/historic-exterior/bikaner-junagarh-fort) identifies a paid 3DS/MAX model with textures and possible plugin dependencies. Its geometry, accuracy, license suitability for browser delivery and Blender conversion are **not verified**; it is excluded by the ₹0 policy.
- [Mehrangarh detail scan](https://sketchfab.com/3d-models/mehrangarh-fort-jodhpur-rajasthan-detail-c049e418d19f473486d637fdb28f65bc) exists, listed at approximately 400,800 triangles. It is a detail, not a verified complete fort; download and reuse rights are unverified. Treat as visual reference only until rights are established.
- No suitable free, reusable, complete Junagarh model was verified in this search. This is not proof that none exists. Search heritage institutions and request permission when appropriate; evaluate provenance, dimensional fidelity, topology, textures and rights for each candidate before use.
- [Poly Haven license](https://polyhaven.com/license) and [ambientCG license](https://docs.ambientcg.com/license/) state CC0 for their assets. These are potential sources for generic rock, ground, wood and lighting, **not verified authentic fort models**. Check the individual asset and save source, creator, version, license and retrieval date in an asset ledger. Paid services are excluded by the ₹0 policy.
- If no licensed, accurate model passes review, author the key Junagarh exterior and accessible interior from validated reference, using modular pieces only where they preserve identity; procedural tools can assist terrain and repeated masonry, not invent distinctive monument details. Costs and labor are not yet estimated. Do not download assets or begin production in Phase 01A.

## Blender to Three.js pipeline

Collect licensed references and provenance → block out measured silhouette and camera clearances → owner authenticity review → model individual landmark geometry and separate door leaves with correct pivots → UV unwrap, assign shared PBR materials and bake validated detail → author exterior/interior and distant LODs → export GLB/glTF with named nodes, consistent scale and orientation → validate geometry, normals, textures, transparency, animation and orientation in Blender and Three.js → compress textures with KTX2 plus supported fallback, compare Meshopt/Draco decode cost → test real devices and record asset sizes and rights. Use a single progress value for camera and door pose, with scroll reversal reproducing the same state; avoid baked cinematic video in the primary world.

## Camera and accessibility

Laptop: wide overview and foreground-to-horizon depth, with a legible fort silhouette and architectural approach before entry. Mobile: compose separate vertical-safe views and camera targets, preserve the gate and route in frame, avoid shrinking the desktop panorama and prevent clipping through narrow entrances. Tablet and large screens require explicit framing checks. Exact FOV, path, pacing and text placement await design review and cannot be derived from aspect ratio alone.

Maintain keyboard-accessible HTML narrative, meaningful chapter navigation and focus. Offer a reduced-motion chapter-based route that avoids forced camera travel, plus readable content and navigation when WebGL fails. Touch scroll must remain native and reversible; test with screen readers and real devices.

## Runtime, loading and memory

Start with installed Three.js, GSAP/ScrollTrigger and Lenis; no new dependency is approved. Use one lifecycle-owned renderer and scene, progress-driven camera and independently pivoted doors. Stream an overview first, current destination and its immediate successor next; do not load ten detailed interiors together. Maintain distant representations and unload zones with explicit ownership, disposal and shared-resource reference counting. Cancel stale requests and recover from context loss. Use LOD and instancing where they preserve authenticity, cap device pixel ratio and adjust shadows, texture sizes and visible detail after measurement. Show loading progress, retry and accessible fallback. Frame-rate, draw-call, network and memory budgets are **unmeasured estimates to establish through prototypes**, not commitments; validate physical mobile devices separately from desktop emulation.

## Current application and temporary navigation

Page 01 uses its existing video, GSAP/Lenis choreography and cinematic opening. Work, Systems and Journey currently target the transition runway; Contact opens the modal. The existing Page 01-to-02 WebGL transition source and assets remain detached for later reconnection. No Page 01 redesign is authorized.

## Roadmap and approval gates

Each phase requires explicit owner approval before the next.

- **00 — Cleanup and verification:** preserve Page 01, source transition and archives; document temporary navigation.
- **01A — Art direction:** establish this reference-led plan, selection, rights inventory and visual decisions; no production world.
- **01B — World map and spatial design:** planning diagrams, route, camera framing and loading boundaries only; no production scene.
- **01C — Ten-destination map:** after approval, establish relative placements, landmark silhouettes and route readability; validate authenticity and overview framing.
- **01D — Environment and light:** refine terrain, vegetation, water, lighting and atmospheric continuity within measured budgets.
- **02 — Junagarh architectural asset creation:** only after owner visual approval; reference-led modular assets, doors and validated licensing. Camera implementation requires a subsequent separately approved phase.
- **03 — Junagarh exterior and entrance:** reference-checked architectural model and reversible door mechanics; approve before interior.
- **04 — Chapter 01 interior:** validated interior environment, accessible canonical narrative and entrance/exit continuity.
- **05 — Chapter 02:** destination and narrative integration with its own approval.
- **06 — Chapters 03–10:** implement and approve each individually.
- **07 — Optimization and integration:** device profiling, accessibility, progressive loading, disposal, regression and final transition integration.

## Unresolved decisions

Owner approval is needed for the nine proposed forts and chapter associations, geographic compression and sequence, visual overview framing, exact entry gate, narrative treatment, asset budget and acquisition approach. Authentic reference coverage, permissions, physical-device performance and the quality of any candidate model are unresolved. No image, video, purchase, production scene or chapter was created in Phase 01A.

## Permanent zero-cost policy

Total development and asset acquisition budget is **₹0**. Paid models, textures, add-ons, APIs, services, AI credits, subscriptions and payment-dependent trials are excluded. No Higgsfield. Gemini Veo is only optional if available without payment. Use original or legally reusable free assets whose licenses permit public portfolio deployment; record source, creator, license, modifications and attribution obligations. Reference images are not automatically licensed for reuse.

## Phase 01B visual planning artifacts

These schematics use the Page 01 warm sunset family. They are planning illustrations, not renders, photogrammetry, measured surveys, camera paths or historically verified fort depictions. All placements except Junagarh first are proposed.

1. [Top-down master layout](world-map-planning/01-master-layout.png)
2. [Isometric terrain composition](world-map-planning/02-isometric-relief.png) — symbolic relief; labels 01–07 are route waypoints, not complete fort architecture.
3. [Laptop overview](world-map-planning/03-laptop-overview.png)
4. [Mobile overview](world-map-planning/04-mobile-overview.png)
5. [Overview to Junagarh camera journey](world-map-planning/05-junagarh-camera.png)
6. [Junagarh modular asset inventory](world-map-planning/06-asset-inventory.png)

### Spatial assumptions and zones

Planning coordinates use the top-down diagram's arbitrary coordinate system, **not real geography**. A unit tentatively represents 250 m of virtual world before camera and asset scale tests; straight-line estimates are not travel measurements. Approximate route legs in km, in chapter order: 01–02 0.38, 02–03 0.37, 03–04 0.39, 04–05 0.40, 05–06 0.37, 06–07 0.38, 07–08 0.37, 08–09 0.35, 09–10 0.33. Suggested local elevations above the desert datum: Junagarh 0 m; Mehrangarh +60 m; Kumbhalgarh +120 m; Amber +75 m; Chittorgarh +85 m; Jaisalmer +35 m; Gagron +10 m; Ranthambore +90 m; Taragarh +110 m; Nahargarh +100 m. Values are art-direction estimates only, not survey data or historical fort elevations. An inter-fort path follows the dashed corridor; actual gradients and lengths require a future blockout.

For each stop, reserve an approach gateway, a narrative precinct and a distinct exit corridor connecting to the next numbered destination; gate identity, direction and geometry for all ten are **unverified placeholders**. Junagarh's initial route is overview → desert approach → verified entry gate to be selected → reversible hinged doors → courtyard → later exit. Do not label an invented exit as historical. The overview emphasizes the near desert and first fort, with distant ridge silhouettes and water. Laptop uses a broad horizon and approach axis; mobile keeps Junagarh and the near corridor vertically legible, with distant places partially concealed rather than made miniature.

Split the world into an overview package plus ten destination zones. At a zone boundary preload the next exterior at reduced LOD; maintain current exterior and current interior only when needed, retain previous exterior until reverse traversal is safe, and dispose unloaded owned resources. Use instancing for compatible repeated geometry; separate authored hero features. Define far silhouette / mid exterior / near detail tiers based on measured screen coverage and device capability, with hysteresis to avoid pop. Frustum culling, texture compression, optimized GLBs, adaptive render resolution and shared resources are planned, not measured. Provide accessible HTML narrative, keyboard navigation, reduced motion and WebGL fallback. Physical mobile memory, frame time and network budgets remain unmeasured.

### Modular asset feasibility and provenance

Plan reusable sandstone wall and bastion sections, gateways, independently hinged doors, jharokhas, balconies, pillars, arches, chhatris, jali, courtyard paving, stairs, passages and ornaments. Blender Python can generate repeatable masonry, UV setup, variations and LOD candidates; key silhouettes, gates and ornamental details require manual reference checking. This is reference-based reconstruction, not verified architectural accuracy. Blender was not found on PATH or in the checked common locations; do not install it without permission. Python and Matplotlib are available and produced the diagrams.

Potential free sources: [Poly Haven license](https://polyhaven.com/license) and [ambientCG license](https://docs.ambientcg.com/license/) state CC0. A specific [Poly Haven Rock Face 01](https://polyhaven.com/a/rock_face_01) is listed as CC0, 20k triangles, by Dario Barresi; suitability and device cost remain untested. Vegetation and HDRI candidates have not been individually vetted. Kenney's site was inaccessible to the research tool, so its current terms are not verified here. No external asset has been downloaded or incorporated. Maintain an asset ledger before use, including creator, URL, license/version, retrieval date, proof and attribution. CC0 has no attribution requirement under the cited provider terms, though credit is welcome.

### Effort and decisions

Rough, unvalidated single-experienced-artist estimate: Junagarh reference research and permissions 3–7 working days; authentic modular hero exterior and door 15–35 days; first interior 10–25 days; environment and streaming/camera integration 15–35 days; each additional fort 15–40 days depending on access to references and required interior scope. Estimates overlap poorly and exclude unavailable rights, physical-device testing and review delays; no staffing, geometry, accuracy or performance has been measured. Ten authentic detailed forts are a substantial long-term effort and may need phased delivery.

Owner review is needed for the nine remaining fort associations, route/scale, layout and camera framing, gate/exit selection and realism target. A reliable free Junagarh model, licensed multi-angle reference, measurements, vegetation candidates and Blender availability remain blockers or open checks for later modeling. No production world or architectural asset is created in Phase 01B.
