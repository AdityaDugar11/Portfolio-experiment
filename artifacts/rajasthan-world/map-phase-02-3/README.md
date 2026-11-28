# Phase 02.3 — Cinematic Rajasthan map

[Open the local preview](http://localhost:5173/?preview=rajasthan-cinematic). From the overview, scroll toward the red fort or activate the `01` marker. Reverse scroll returns to the overview. At the endpoint, the marker also returns to the overview.

[Rendering comparison, transition workflow, and next-phase asset list](RENDERING_RESEARCH.md)

## Prototype

The second supplied reference is the temporary color plate. Its more overhead composition leaves room to retain the complete relief map on desktop and fit its width on a phone. The first reference informed the relief and lighting assessment. The preview preserves the image's dunes, sandstone, ridges, vegetation, lakes, settlements, and roads. The overview is an artistic illustration. The visible `01` marker is tied to the depicted red fort's courtyard. The supplied art cannot verify the other nine landmarks or establish a surveyed geography. The canonical coordinates remain in the earlier map package. [Canonical coordinates](../map-phase-01/data/chapters.json)

Offline monocular depth produces a relative relief field. Three.js back-projects the color plate along the original camera rays onto a 29,376-triangle surface. The opening recreates the source perspective. A bounded camera dolly, small lateral translation, lens shift, and change of field of view then bring the Junagarh region closer. The projected courtyard anchor defines the marker position. The low-resolution WebP paints first, followed by depth and a viewport-appropriate detail texture. Native document scroll supplies the only progression input. The renderer updates on input, resizing and asset changes. The fallback uses an overview still and a regional still, including under reduced motion.

## Browser captures

| State | Desktop, 1440 × 900 | Mobile emulation, 390 × 844 |
| --- | --- | --- |
| Overview | [Screenshot](private/screens/desktop-opening.png) | [Screenshot](private/screens/mobile-opening.png) |
| 55% scroll | [Screenshot](private/screens/desktop-approach.png) | [Screenshot](private/screens/mobile-approach.png) |
| Regional Junagarh endpoint | [Screenshot](private/screens/desktop-junagarh.png) | [Screenshot](private/screens/mobile-junagarh.png) |
| Reverse to overview | [Screenshot](private/screens/desktop-return.png) | [Screenshot](private/screens/mobile-return.png) |
| Forward and reverse in one recording | [Wheel, 5.80 s](private/desktop-forward-reverse.mp4) | [Native touch, 6.48 s](private/mobile-forward-reverse.mp4) |

The silent recordings use Chrome's captured viewport at 25 fps. Performance was measured in a separate run without recording.

## Camera range

The sweep varied the forward dolly from 0.53 to 1.95 scene units with the same marker framing and the same depth and lens-shift settings. It sampled 50%, 75%, and 100% progress. A flat-plane control used the same projected scale and chapter anchor. At the selected 0.82 endpoint, a point on the foreground citadel moves 10.8 px right and 20.3 px down relative to the control on desktop. The southern ridge moves 8.1 px right and 23.1 px down in the mobile endpoint. These are projected mesh coordinates in CSS pixels. [Mobile sweep and flat control](private/screens/camera-range.jpg) · [Projection analysis](private/motion-analysis.json)

The 1.30 sample was the farthest that remained visually usable in both tested endpoint crops. At 1.55, the mobile foreground walls and trees began to stretch visibly. At 1.95, foreground distortion and the compression of distant features were unmistakable. The selected cap uses 0.82 of the 2.65-unit starting camera distance, about 31%, retaining margin before the visible distortion. The mesh covers hidden surfaces with stretched source pixels when pushed past this range. It has no imagery for the reverse side of buildings, a low aerial descent, or a street view.

## Performance

Chrome 158.0.8127.88, NVIDIA RTX 5060 Laptop GPU via ANGLE. The four-second warm benchmark drove native scroll forward and back and counted actual indexed WebGL submissions. The p95 values summarize browser animation-frame intervals. The mobile viewport used touch and DPR emulation on the same workstation.

| Metric | Desktop | Emulated mobile |
| --- | ---: | ---: |
| WebGL drawing buffer | 1430 × 900 | 585 × 1267 |
| WebGL draws per second during scrub | 239.5 | 239.0 |
| p95 animation frame interval | 4.3 ms | 4.3 ms |
| Draw calls per rendered frame | 1 | 1 |
| Triangles per render | 29,376 | 29,376 |
| Used JS heap after GC | 9.83 MB | 9.87 MB |
| Tracked backing storage after GC | 5.93 MB | 5.93 MB |
| Active color texture with mipmaps, calculated from observed allocations | 11.21 MB | 5.40 MB |
| Encoded scene assets | 617,146 bytes | 295,432 bytes |
| Browser transfer for scene assets, with HTTP overhead | 618,046 bytes | 296,332 bytes |
| All measured cold development navigation and resources | 5,814,586 bytes | 5,492,872 bytes |

The encoded assets are the 55,552-byte poster, 11,350-byte depth field, and either the 550,244-byte desktop plate or the 228,530-byte mobile plate. The depth field becomes mesh vertices on the CPU. It is never uploaded as a GPU texture. The memory columns report Chrome counters for JS and backing storage and a separate estimate for the active color texture. Driver allocation, decoded image caches and compositor buffers are outside those counters. The near-240 Hz result describes this workstation. Physical-phone and Safari performance remain unverified. [Raw browser measurements](private/results.json)

## Verification and file report

- `npm run build` passed. Vite emitted the existing warning for the 881.58 kB main JavaScript chunk. The build contains neither Rajasthan preview assets nor preview route strings. Sending the new query to the built app rendered Page 01 and made zero cinematic asset requests.
- `git diff --check` and Python compilation passed. `npm run lint` exited 127 because this checkout has no ESLint executable.
- Browser checks covered slow and fast wheel input, native touch, keyboard focus, the marker toggle, live motion preference changes, disabled WebGL, context loss, and depth request failure. Seven viewport sizes kept the 48 × 48 CSS pixel marker on screen with zero horizontal overflow. Midpoint and overview screenshots matched pixel for pixel when traversed in reverse on both recorded viewports.
- The existing `?preview=rajasthan-world` route opened separately. The local asset route returned WebP on loopback, denied the LAN address and cross-site browser requests, and Vite denied direct workspace access to the private files.
- [src/main.tsx](../../../src/main.tsx) adds the opt-in development route. [vite.config.ts](../../../vite.config.ts) serves an allowlist of four artwork files on loopback. The new [preview component](../../../src/components/RajasthanCinematicPreview.tsx), [stylesheet](../../../src/components/RajasthanCinematicPreview.css), and [Three.js scene](../../../src/components/rajasthanCinematicScene.ts) own the composition, scroll controls, and GPU lifecycle.
- This folder contains [asset preparation](prepare_assets.py), [browser verification](verify_preview.py), [research](RENDERING_RESEARCH.md), this report, and Git-ignored assets, recordings and measurements in `private/`.
- Page 01 source and behavior, the Phase 02.2 scene and navigation, terrain assets, Blender sources, canonical chapter coordinates, and story content were preserved.
- The Git reflog records a concurrent commit and push of `f0741c5` from a separate process during this work. That commit includes an earlier preview code snapshot. The private artwork and media are absent from the commit, and the final camera calibration remains in the working tree.

## Local setup and provenance

Run `npm run dev -- --port 5173` from the repository root if the development server is stopped. To regenerate the already prepared private WebPs, pass the original 1536 × 1024 second reference to `python artifacts/rajasthan-world/map-phase-02-3/prepare_assets.py /path/to/reference.png`. The script uses Pillow, NumPy, SciPy, PyTorch and Transformers from the local environment. It downloads the pinned Small model weights if they are absent from the local cache. Inference runs on this machine.

The source PNG SHA-256 is `c37ff1cdca09f7752490b64b8ff60280cd274d16ef91c1f92cc445cb12f97925`. It was supplied for private experimentation and its public reuse rights are unverified. Derived artwork and media stay under the ignored `private/` folder outside `public/`. The independently licensed depth model is Depth Anything V2 Small, Apache-2.0, pinned at `5426e4f0f36572d16453bbda7a8389317b1bef99`. Runtime dependencies were already installed. Asset acquisition cost was ₹0. [Pinned model card](https://huggingface.co/depth-anything/Depth-Anything-V2-Small-hf/tree/5426e4f0f36572d16453bbda7a8389317b1bef99)

To rerun the browser capture and benchmark, start the development server above and a local `npm run preview -- --host 127.0.0.1 --port 5184 --strictPort` after building. Run `python artifacts/rajasthan-world/map-phase-02-3/verify_preview.py` with Python Playwright, Chrome, Pillow, and FFmpeg available.

## Review gate

The miniature approach is ready for visual review. The artwork's geography is provisional. Its single baked perspective limits both depth and the portrait opening, which fits the full outline across the screen and leaves open space above and below. A matched aerial-to-street transition requires registered, reuse-cleared views of the same Junagarh exterior. The next decision is approval of the miniature direction and the calibrated camera motion. Work stopped at the regional map endpoint.
