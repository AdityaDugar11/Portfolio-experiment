# Phase 04.1 · Suraj Pol

[Live Three.js preview](http://127.0.0.1:4071/) · [Elevated](review/01-elevated.png) · [Ground](review/02-ground.png) · [Sandstone detail](review/03-sandstone.png) · [Silent HyperFrames preview](review/04-hyperframes.mp4)

This isolated study builds Suraj Pol's nested pointed arches, recessed niche, rosette moldings, blind upper panels and studded timber leaves in TypeScript. The left elevation uses the photographed Junagarh jharokha vocabulary. The right return and the courtyard behind the vault are authored interpretations. Both leaves have their own hinges and swing into a widened stone bay. The passage control travels along the centreline and reverses.

The close Suraj Pol photograph and door photograph support the gateway details. The wider India Cine Hub photograph guides the material contrast and exterior setting, because the identity of its visible gate remains unconfirmed. The two Rajasthan diorama stills and the extracted frames from both Gemini clips guided the landscape palette and scale. The original Gemini MP4s were unavailable at the recorded local paths. Reference imagery served as a modeling aid. The render uses authored geometry, scanned material maps and a licensed sky HDRI. [Junagarh reference inventory](../research/junagarh/references/inventory.json) · [Exterior analysis](../research/junagarh/PRIMARY_EXTERIOR_ANALYSIS.md)

## Files and local use

- `junagarh.ts` and `geometry.ts` build the masonry, architectural profiles, jharokhas, hardware and door assemblies. `landscape.ts` builds the graded approach, paving, scrub and layered rocks.
- `materials.ts` and `scene.ts` own texture color spaces, roughness, normals, ambient occlusion, rock displacement, localized stone weathering, environment lighting, shadows and disposal.
- `index.html`, `preview.ts` and `vite.config.mts` serve the loopback-only interactive preview. `camera.ts`, `cinematic.html`, `cinematic.ts` and `prepare-cinematic.mjs` use the same scene for a 12-second HyperFrames seek timeline. `package.json`, `package-lock.json`, `tsconfig.json`, `.gitignore` and `verify-browser.mjs` support the local workflow.
- `sand/`, `stone/` and `landscape/` contain the local CC0 assets. `review/` contains three browser screenshots and the cinematic MP4.

From this directory, after installing the root portfolio dependencies:

```sh
npm ci
npm run dev
```

In a second shell in this directory:

```sh
npm run typecheck
node verify-browser.mjs
npm run prepare:cinematic
HYPERFRAMES_NO_TELEMETRY=1 npm run hyperframes -- check .cinematic --samples 5 --no-contrast --no-craft --timeout 30s
HYPERFRAMES_NO_TELEMETRY=1 npm run hyperframes -- render .cinematic --strict --quality looks --workers 2 -o review/04-hyperframes.mp4
```

The Apache-2.0 HyperFrames 0.9.104 package is pinned here. Node 26.7.0, FFmpeg/FFprobe 9.0.2 and HyperFrames' free Chrome Headless Shell 158 were used locally. The doctor command flags optional transcription, voice and music backends. System Chrome also works for the check and snapshots with screenshot capture. `puppeteer-core` for the Chrome checks is supplied through the pinned HyperFrames package. [HyperFrames quickstart](https://github.com/heygen-com/hyperframes/blob/v0.9.104/docs/quickstart.mdx) · [Three.js adapter source](https://github.com/heygen-com/hyperframes/blob/v0.9.104/packages/core/src/runtime/adapters/three.ts)

Reused the installed official HyperFrames, HyperFrames CLI and HyperFrames Registry bundles, along with Ponytail, graphify, agent-reach and skill-installer. Installed `threejs-fundamentals`, `threejs-geometry`, `threejs-materials`, `threejs-textures`, `threejs-shaders`, `threejs-lighting`, `threejs-animation` and `playwright-cli` in the Codex skill directory. The Three.js skills target a later revision, so the implementation uses only WebGL APIs available in the project's r174. [Three.js skills, MIT](https://github.com/emiliodominguez/threejs-skills/tree/ac4464c88ea395fc7df938de8db912b81d18c768) · [Playwright CLI skill, Apache-2.0](https://github.com/microsoft/playwright-cli/tree/dc5f4d5616ab5a28ded12fd7101a4d49bd59a820/skills/playwright-cli)

## Asset provenance

All runtime scan maps are [Poly Haven CC0 1.0](https://polyhaven.com/license). CC0 permits portfolio deployment and has no mandatory credit.

| Source | Creator | Use |
| --- | --- | --- |
| [Old Sandstone 02](https://polyhaven.com/a/old_sandstone_02), [Red Sandstone Wall](https://polyhaven.com/a/red_sandstone_wall), [Fine Grained Wood](https://polyhaven.com/a/fine_grained_wood) | Dimitrios Savva, Amal Kumar, Rob Tuytel respectively | Existing 1K color, OpenGL normal and roughness maps for paving, plinth and doors. [Original checksums](../research/junagarh/materials/inventory.json) |
| [Sand 03](https://polyhaven.com/a/sand_03), [Sandy Gravel 02](https://polyhaven.com/a/sandy_gravel_02) | Charlotte Baglioni and Dario Barresi | Existing 1K color, normal and roughness maps copied from Phase 03.3. [Original checksums](../environment-phase-03-3/asset-sources.json) |
| [Industrial Sunset 02](https://polyhaven.com/a/industrial_sunset_02) | Sergej Majboroda | Existing 2K Pure Sky HDRI for background and reflected light. [Exact source file](https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/industrial_sunset_02_puresky_2k.hdr) |
| [Worn Rock Natural 01](https://polyhaven.com/a/worn_rock_natural_01) | Dimitrios Savva and Rob Tuytel | New 1K color, OpenGL normal, roughness, AO and displacement maps for the sandstone facades and authored rocks. Each file matched the provider's MD5. [Provider's map manifest](https://api.polyhaven.com/files/worn_rock_natural_01) |

## Validation and review limits

- Chrome exercised orbit, wheel zoom, three view presets, opening and closing, forward/reverse passage, touch controls at 390 × 844 and reduced-motion mode. Nine sampled rays passed the open gate, and the independently opened poses blocked six or three rays as expected. The screenshots are from this live WebGL preview.
- HyperFrames lint and browser runtime/layout check passed with zero warnings or errors. Six seek frames were inspected. Seeking 5.2 → 10.2 → 5.2 seconds reproduced the same first canvas byte for byte. One full MP4 was rendered. FFprobe confirmed 1280 × 720, 24 fps, 288 frames, 12 seconds and a video-only stream. Decoded frames show the descent, both doors opening, and passage into the court. The HyperFrames editor's sandbox blocked the local ES module. The CLI snapshot and render paths succeeded.
- The root production build succeeded with its pre-existing bundle size warning. All seven production output files matched pre-change SHA-256 checksums. Chrome exercised Page 01 with slow, fast and reverse desktop scroll and a 390 × 844 mobile hero check. The background video stayed muted. The production source, navigation, reference files and previous phase artifacts remain intact. The Rajasthan border, elevation data and ten anchors remain in their existing world packages.
- Dimensions, historical hinge details, adjacent elevations and unseen depths are estimates. The elephant guardians are omitted. At elevated scale the sand remains sparse and the surroundings read as an architectural section. The materials and carvings remain more uniform than the photographs. Mobile was tested in Chrome emulation.

Phase 04.1 ends at this review. Further visual refinement or journey integration awaits owner approval.
