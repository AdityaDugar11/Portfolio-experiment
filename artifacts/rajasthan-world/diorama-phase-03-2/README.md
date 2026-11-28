# Phase 03.2 — Rajasthan environment art

## A · Audit and checkpoint

Clean local and remote `main` at `7e02daf`. Phase 03.1 sources and four PNGs are tracked. The local Blender file, sculpt cache, downloaded rock assets and working renders are ignored. A local copy of the baseline Blender file, Antigravity handoff, commit ID and input hashes is in `work/checkpoint/`.

The four baseline renders show rounded hills under a nearly continuous canopy, isolated sand mounds and scattered rocks, repetitive building rows, and a studio background that suppresses the cutaway silhouette. Camera 04's dark foreground area lies around local XY (−20, −190), between the named Phase 03.1 lake basins. Rays sampled through its canopy hit the woodland there. Camera 04 therefore needs a clear view of an actual water body and its bank, while the dry hollow needs legible terrain and lower canopy coverage. The dune code applied neither its stated inside-state filter nor its stated minimum spacing.

Both owner-supplied Gemini clips were recovered in Downloads and sampled every two seconds. Their strongest cues are the continuous dune crests, exposed folded slopes, dark turquoise inlets in lighter rock, small settlement clusters, and one unbroken, warmly lit tabletop silhouette. The committed Act 01 storyboard and world planning stills were available. Both original diorama stills were recovered from the prior Codex chat’s clipboard attachment paths and copied to the ignored `work/references/` folder. The high and low isometrics emphasize the cutaway rim, winding roads, warm sand and exposed bedrock. The later pass used these references to check the relationship between the dry open west and the wooded eastern slopes. The clips and stills are visual references only.

The work starts with measured relief and source-derived shorelines, then tests desert and mountain/water close-ups before refining the integration, lighting and approach camera. The boundary and ten chapter positions come from the existing map cache.

## B · Isolated environment studies

The first desert and Aravalli/water studies were rendered and inspected at 864 × 576. Dunes had defined lee slopes, but low terrain and cold fill made the sand read as clay. The Aravalli DEM pass produced spikes and Rajsamand occupied too little of the frame. First corrections broadened the measured relief, lengthened dune crests, warmed the sun, reduced studio fill and moved the water close-up to Jaisamand. The images are in `work/review-v1/`.

## C · Integration checkpoint

The second round showed a coherent west-to-east biome transition, a clear state outline, and more varied settlements. The new sand crests read under raking light. The Jaisamand shoreline in the draft was still too close to frame edge, several steep extrema remained by the state cut, and a visible seam between studio and sky affected the first approach draft. The corrected approach draft removed the seam and established the landscape-first camera distance. The second-round images are in `work/review-v2/`.

## D · Cinematic draft checkpoint

The third full draft was opened camera by camera. Crest broadening and a slope limit removed the narrow spires. The desert settled into long asymmetric crests. The Jaisamand shot was then moved to the southwest so the lake and bedrock share the frame without exposing the studio edge. A second approach draft revealed a need for a readable track, so its final foreground relief uses a longer authored trail. The low camera uses a packed sky, a warmer horizon, and a small dust volume. The fort remains the inherited study. Draft checkpoints are in `work/review-v3/` and `work/drafts/`.

## E · Review package

All five final plates and four matching-camera pairs were opened and reviewed. The comparison views show longer dune faces, a more open canopy, and bedrock visible through the Aravalli slopes. The original stills retain warmer sand and more sharply fractured rock, especially beside water. The shallow edges and crest detail remain priorities if the framing is approved.

| View | Artifact |
| --- | --- |
| Full Rajasthan outline and major regions | [01 · Overview](renders/01-overview.png) |
| Isometric from the southwest | [02 · Alternate](renders/02-alternate.png) |
| Sand crests, lee faces, scrub, and settlement | [03 · Thar Desert](renders/03-desert.png) |
| Exposed Aravalli flanks and Jaisamand shoreline | [04 · Aravalli and water](renders/04-aravalli-water.png) |
| Low view along the approach to the existing Junagarh study | [05 · Junagarh approach](renders/05-junagarh-approach.png) |
| Matching location, orientation and focal length | [Overview](renders/comparisons/01-overview.jpg) · [Alternate](renders/comparisons/02-alternate.jpg) · [Desert](renders/comparisons/03-desert.jpg) · [Mountains](renders/comparisons/04-mountains.jpg) |
| Editable scene, 30 MB, with packed sky | [Rajasthan.blend](Rajasthan.blend) |

### Changed files and decisions

- `sculpt.py` builds the closed terrain from the existing Rajasthan perimeter. It preserves the measured southwest–northeast structure, limits extreme slopes, adds exposed bedding, and places 69 dune centers using an inside-state test and an elliptical minimum separation of 28 × 22 km along the lattice axes. Three source-derived shorelines replace the Phase 03.1 radial basins. Sambhar has an interpreted dry-season salt flat.
- `build_scene.py` meshes the lake surfaces to the bed and shades them by depth, groups limewashed buildings around clearings and terrain-following tracks, and instances dry woodland, khejri, scrub and grass. The existing Junagarh geometry and materials are imported as a temporary scale reference. Its chhatri copies are reseated. The state and landmark XY coordinates retain their existing project projection and chapter associations. The global site and every Phase 03.1 artifact were preserved.
- `render.py` renders the five compositions and four historical camera matches. `compare.py` pairs them with the original Phase 03.1 renders. `validate_scene.py` opens and checks the editable asset. `ASSETS.md` carries the rights ledger and attribution. The local ignore rules keep the Blender file, source cache backups and draft artifacts out of Git.

### Rebuild from repository root

The tested setup was host Python 3.11 with existing NumPy 2.2.6, SciPy 1.15.3, Shapely 2.1.2, scikit-image 0.26.0 and Pillow 11.3.0, and Flatpak Blender 5.1.1 with its bundled Python/NumPy. The scripts expect the existing Phase 01 cache and the tracked Junagarh source scene. No credentials or new project dependencies are needed.

```bash
world="$PWD/artifacts/rajasthan-world"
phase="$world/diorama-phase-03-2"
blender_phase() {
  flatpak run --filesystem="$PWD" \
    --env=OCIO="$world/map-phase-01/.cache/ocio/config.ocio" \
    org.blender.Blender --background --python-exit-code 1 "$@"
}

OPENBLAS_NUM_THREADS=2 python "$phase/sculpt.py"
blender_phase --python "$phase/build_scene.py"
blender_phase "$phase/Rajasthan.blend" --python "$phase/validate_scene.py"
blender_phase "$phase/Rajasthan.blend" --python "$phase/render.py"
blender_phase "$phase/Rajasthan.blend" --python "$phase/render.py" -- --matches
python "$phase/compare.py"
```

Use `-- --studies` for the two close-ups or `-- --draft` for the five-camera draft. Append frame numbers to select views, for example `-- --draft 4 5`. Native Blender may use its own working AgX config. The Flatpak build's default configuration fails to load under its OCIO runtime. The command above points to the locally proven compatible config, which emits warnings for newer interop metadata but retains AgX color management.

Final and matching plates use Blender Cycles CPU, 1800 × 1200 RGB PNG, up to 40 samples, adaptive threshold 0.035, denoising, 5 maximum bounces, and AgX Medium High Contrast at +0.28 exposure. Drafts use 864 × 576 at 8 samples. The matched pairs are 1740 × 613 JPEGs. The Phase 03.2 frames are downsized to the original Phase 03.1 panel dimensions of 864 × 576.

### Local backup and recovery

- Back up `Rajasthan.blend` and `work/checkpoint/phase-03-2-inputs.tar`. The tar holds the minimal build inputs needed from the ignored Phase 01 cache. Restore missing inputs with `tar -xf "$phase/work/checkpoint/phase-03-2-inputs.tar" -C "$world/map-phase-01"` in a checkout where the files are absent.
- `work/sculpt.npz` and `work/placement.json` can be regenerated. Keep `work/matches/` if you want the full-resolution matching frames. `work/checkpoint/` also contains a baseline scene copy, the recovered Antigravity handoff, and the baseline/input checksums.
- Keep the private references locally. The two stills are under `work/references/`. Both source clips are in Downloads as `gemini_generated_video_30058c3e.mp4` and `gemini_generated_video_39df4448.mp4`.

### Validation and known limitations

- Reopened the Blender file and verified all ten anchor identities, XY coordinates and terrain heights. The Phase 03.1 and 03.2 perimeter polygons have zero measured difference. Verified four matching camera transforms and lenses and verified the original four PNG hashes.
- Validated the closed terrain mesh, three water surfaces, 5,408 road points, 1,180 building foundation corners, and 8,355 instances across 20 source meshes. Every sampled vegetation point agreed with the rendered surface to within 0.002 local units. The approach camera clears the terrain by 16.15 local units. The world sky is packed.
- `npm run build` passed with Vite's existing large-bundle warning. `npm run lint` could not start because ESLint is absent from the existing install and manifest. Python bytecode compilation and Git whitespace checks passed.
- The existing website was exercised in Chrome at 1440 × 900 and mobile emulation at 390 × 844. Slow scroll faded the intro, a fast scroll reached the end, and reverse scroll restored the intro. Zero page errors were observed. [Screenshot sheet](work/browser/contact-sheet.jpg). The regression smoke test used a returning session to skip the one-time opening.
- The diorama exaggerates heights, shorelines, architecture and plant scale. The roads and villages are illustrative, and the lake appearances represent a selected seasonal impression. The high and low references retain denser, sharper rock detail and much more architectural depth. The current bedrock is still soft in close views, the shallow-water transition sometimes reads as a resin miniature, and the reused Junagarh study lacks the detail required for a ground-level hero shot.
- The terrain is 787,454 triangles, including the base and sidewalls. The 20 vegetation and stone prototypes total 33,924 triangles. Realizing every instance would expand them to about 13.67 million triangles. A future browser build needs tiled terrain LODs, baked bedrock and sand normals, instance batches and lower-detail foliage. Browser performance of this scene remains unmeasured.

After owner visual approval, choose the approach framing and silhouette, then build localized terrain and architecture detail around the approved path before browser export.
