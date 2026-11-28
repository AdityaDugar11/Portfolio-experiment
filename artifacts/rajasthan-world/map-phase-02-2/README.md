# Phase 02.2 cinematic Rajasthan checkpoint

[Open the development preview](http://localhost:5173/?preview=rajasthan-world). Run `npm run dev -- --port 5173` from the project root to restart it.

## Browser captures

| State | Evidence |
| --- | --- |
| Matched-camera opening comparison | [Desktop](screens/01-desktop-terrain-comparison.jpg) · [Mobile](screens/02-mobile-terrain-comparison.jpg) |
| Ten-destination atlas | [Desktop](screens/03-desktop-overview.jpg) · [Mobile](screens/04-mobile-overview.jpg) |
| Mid-descent | [Desktop](screens/05-mid-descent.jpg) |
| Junagarh approach | [Desktop](screens/06-junagarh-exterior-approach.jpg) |
| Gateway threshold | [Desktop](screens/07-gateway-threshold.jpg) · [Mobile](screens/07b-mobile-gateway-threshold.jpg) |
| Reverse to overview | [Desktop](screens/08-reverse-to-overview.jpg) |
| Complete forward and reverse scroll | [Desktop wheel, 8.08 s](09-desktop-scroll.mp4) · [Emulated mobile touch, 9.40 s](10-mobile-scroll.mp4) |

The before/after pairs use the original opening camera positions, look targets and fields of view at 1440 × 900 and 390 × 844. The captures use the same local Chrome hardware renderer. The labels are below the original browser frames.

## Architecture and findings

- Native scroll progress is the camera input across opening, lift, atlas, descent, exterior approach, and threshold. A short atlas interval keeps the markers stable. The regional dolly uses a logarithmic range and eased spherical orientation during the scale transition. Centripetal Catmull–Rom curves shape the final street-scale camera and look target. Full scroll distance is 2.24 viewport heights on desktop and 2.06 on mobile. Chapter 01 and the map controls seek on this same timeline. Chapters 02–10 can be selected and announced in the atlas.
- The previous grade combined a strong luminance remix, bright hemisphere fill, a light atmospheric blend and white CSS overlays. The revised renderer retains the albedo and sky as sRGB, reads the masks and normals as linear data, lowers the ACES exposure and sky fill, and removes the CSS overlays. Stronger normal shading preserves relief. The water mask reduces terrain normals and adds dark blue-green color. The atmospheric blend softens the actual DEM mesh perimeter.
- The scene renders on scroll, resize and asset completion. Desktop requests the existing Mewar mesh during the lift and hides it near Junagarh. Mobile uses the regional mesh. Junagarh’s atlas mass and metric exterior are separate Meshopt GLBs. The exterior and surface textures stream before the approach, and local shadow casting begins near the forecourt.
- The EverSwap study recorded public desktop wheel behavior, a separate mobile touch attempt, and a bounded REA browser capture. The research note separates observed behavior from architecture inferred from it. [EverSwap findings](everswap-notes.md)

## Junagarh fidelity and provenance

The atlas mass preserves the documented contrast between the curved rampart and drum, taller western ranges, stepped pavilions, and pale pointed portal. It is enlarged for regional readability. The close exterior uses the existing reference-derived geometry in metres at the unchanged anchor longitude and latitude, with the base fitted to the rendered DEM. The street enclosure and its opening also come from the study. The study leaves façade-to-map registration, dimensions, roofline details and exact gate identity provisional. The west tree is approximated with instanced canopy clusters, and the sparse stones are illustrative. The dark aperture is a preview backstop for the exterior. [Existing Blender study and architectural references](../documentation/junagarh/exterior-v01/README.md)

The export contains static project-authored architecture and simple palette materials. The reference photo, OSM guides, doors, and passage collection were excluded. The two new textures are downsampled from previously verified CC0 sources, [Dry Ground 01 by Rob Tuytel](https://polyhaven.com/a/dry_ground_01) and [Old Sandstone 02 by Dimitrios Savva](https://polyhaven.com/a/old_sandstone_02). Existing sky, elevation, imagery, and texture provenance is recorded in the [Phase 01 terrain package](../map-phase-01/README.md) and the [Phase 02.1 checkpoint](../map-phase-02-1/README.md). No new elevation or imagery datasets were acquired.

The atlas records all ten destinations. Junagarh is the only modeled fort in this checkpoint. The nine other locations are numbered anchors pending reliable reference review. The low regional pass still shows the limits of the coarse terrain texture before the street-scale model takes over. The source coverage fade is visible at the periphery of the narrow atlas. Neither phase represents a surveyed streetscape.

## Verification

- `npm run build` and `git diff --check` passed. Vite emitted the existing main-chunk warning at 881.58 kB before gzip. The built directory contains no Rajasthan preview code or assets. Chrome loaded Page 01 when the preview query was sent to the built app and requested no Rajasthan files.
- `npm run lint` exits 127 because ESLint is absent. There is no repository test script. Playwright browser checks covered slow wheel, touch swipe, all ten mobile markers, Chapter 01 seek, map return, keyboard focus restoration, reduced motion, disabled WebGL, and forced exterior-load failure followed by retry.
- At 360 × 800, 390 × 844, 430 × 932, 1280 × 720, 1440 × 900 and 1920 × 1080, all ten 44 × 44 CSS pixel targets were on screen, with zero target intersections and zero horizontal overflow. The nearest measured Amber/Nahargarh gap was 7.14 CSS pixels. Forward and reverse samples at identical progress had equal camera position, quaternion and field of view.
- Camera positions collected during the warm sweeps were checked against the original DEM triangle diagonal. Minimum sampled vertical clearance above rendered regional ground was 2.87 m on desktop and 2.89 m during mobile emulation. The local path stops outside the portal, and passes the modeled forecourt opening. This was a sampled check and scene inspection, rather than a surveyed or continuous collision certification.

## Performance and payload

Chrome 158.0.8127.88. The four-second warm forward/reverse sweep counted actual Three.js submissions and measured browser animation-frame intervals. The NVIDIA runs use the RTX 5060 Laptop GPU and its local display. They describe this workstation, including the emulated phone viewport. Physical phone performance remains unverified. Memory figures are browser JS heap, as exposed by Chrome. Precise GPU memory was unavailable.

| Renderer | Viewport | Canvas buffer | Render FPS | p95 animation frame | JS heap |
| --- | --- | --- | ---: | ---: | ---: |
| NVIDIA hardware | 1440 × 900 | 1440 × 900 | 235.25 | 4.3 ms | 39.3 MB |
| NVIDIA hardware, mobile emulation | 390 × 844 | 526 × 1140 | 239 | 4.3 ms | 30.1 MB |
| SwiftShader software | 1440 × 900 | 1440 × 900 | 3.75 | 700 ms | 35.2 MB |

| Stage | Desktop draws / triangles | Emulated mobile draws / triangles |
| --- | ---: | ---: |
| Opening | 2 / 63,764 | 2 / 63,764 |
| Atlas | 7 / 146,892 | 6 / 78,552 |
| Descent sample | 2 / 63,764 | 2 / 63,764 |
| Exterior approach | 15 / 147,822 | 13 / 145,454 |
| Threshold | 13 / 145,454 | 13 / 145,454 |

The opening asset bodies total 2,502,471 bytes. The atlas mesh adds 106,168 bytes, and the deferred exterior and its two textures add 613,082 bytes. Desktop Mewar adds 1,516,364 bytes. These are encoded body sizes from browser timing, excluding Vite development modules and HTTP overhead. A cold exterior phase showed a roughly 30 ms desktop submission in the sampled run. The software renderer was visibly slow.

## File report and review gate

- `src/components/RajasthanWorldPreview.tsx` and `RajasthanWorldPreview.css` implement the scroll path, sparse controls, accessible markers, and fallback.
- `src/components/rajasthanTerrain.ts` updates the color pipeline, terrain perimeter treatment, LOD visibility and local sunlight.
- `src/components/junagarhScene.ts` manages Junagarh assets, instanced landscape details, exterior shadowing and lifecycle.
- `public/preview/rajasthan-world/junagarh-{atlas,exterior}.glb` and `junagarh-{ground,stone}.webp` are the new preview assets. [Blender export script](export-junagarh.py)
- This checkpoint folder contains the report, public reference notes, stills and two silent recordings.

The existing Page 01 source, navigation, contact behavior, transition, production isolation, terrain meshes, geographic manifest, canonical content, Blender sources, and previous prototypes were preserved. The checkpoint is awaiting owner visual approval before work on the gateway or interior.
