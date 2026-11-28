# Phase 03.3 — Dune and sandstone benchmark

[Editable Blender scene](Dune%20and%20Sandstone.blend) · [Elevated view](renders/01-elevated.png) · [Ground-level view](renders/02-ground-level.png) · [Research and production plan](RESEARCH.md)

A metre-scale desert study with USGS-measured dune geometry, weathered photogrammetry, dry scrub, thin modeled bunchgrass and a sandstone chhatri sourced from the existing Junagarh street elevation. The staged area covers roughly 80 × 90 m of the 320 × 960 m survey crop. The scene uses the dune shape of White Sands and geological and vegetation proxies from Namaqualand. The chhatri is shown in an illustrative setting. Total asset cost was ₹0.

## Visual assessment

The same scene supplies both Cycles views. Compared directly with the original high and low isometric images and frames from both Gemini clips, the ground camera shows the strongest improvement. Rock fractures have depth, plants cast fine shadows, carved stone reads at its actual scale and the sand can accumulate against a rough rock face. The elevated view still falls short of the references. The broad smooth slopes and isolated outcrop make the arrangement look staged, and the ripple pattern remains discernible on some wide slopes. The ground-level view still shows a faint straight horizon at the far left. The references have more continuous transitions between sand, talus, exposed bedding and denser vegetation, with deeper architectural context. The prototype has **not achieved the full visual target**. The study isolates asset quality and leaves statewide composition for a later approved phase.

## Files

| File | Purpose |
| --- | --- |
| `Dune and Sandstone.blend` | Editable scene with five named collections, 30 packed image maps and two cameras. Frame 1 switches to the elevated view, frame 2 to the camera 1.66 m above the terrain. |
| `renders/01-elevated.png`, `renders/02-ground-level.png` | The two 1600 × 1000 RGB review images. The final Blender run completed both renders in about 79 seconds. |
| `data/white-sands-3dep.tif` | Public-domain terrain crop in NAD83 / UTM zone 13N, EPSG:26913, with NAVD88 source heights. USGS 3DEP, NM_WhiteSandsNM_2020_D20. |
| `asset-sources.json`, `fetch_assets.py` | Sources, creators, licenses, original download URLs, checksums and cache preparation. |
| `build_scene.py`, `.gitignore` | Scene build and camera renders. Local downloads and Blender save backups are ignored. |
| `RESEARCH.md` | Previous pipeline assessment, reusable resources, Junagarh investigation and scale-up estimates. |

The source photographs and Gemini clips were used for visual comparison. The editable scene contains packed PBR textures and a computed sky. The sampled survey cells supply the dune shapes with one Blender unit per metre and a 1,211.55 m vertical offset. A flat sand continuation below the cropped survey is visible only in the far distance, where it closes the horizon. The survey's full rectangle is an editable landform mesh.

## Rebuild

Open the packed Blender file directly in Blender 5.1.1. For an exact source rebuild, run from the repository root with host Python 3.11, NumPy and Pillow. Tested with NumPy 2.2.6 and Pillow 11.3.0. The download step uses the pinned assets in the manifest and the included USGS GeoTIFF. The rebuild uses the existing tracked Junagarh Blender source and its material inventory. Save a separate copy of any edits to the delivered Blender file before rebuilding, since the build replaces it and the two renders.

```bash
world="$PWD/artifacts/rajasthan-world"
phase="$world/environment-phase-03-3"
python "$phase/fetch_assets.py"
blender -b --factory-startup --threads 12 --python-exit-code 1 \
  --python "$phase/build_scene.py"
```

The workstation has Flatpak Blender. Use its existing Phase 01 compatible OCIO configuration to work around the installed 2.5-config/2.4-runtime mismatch.

```bash
flatpak run --filesystem="$PWD" \
  --env=OCIO="$world/map-phase-01/.cache/ocio/config.ocio" \
  org.blender.Blender -b --factory-startup --threads 12 --python-exit-code 1 \
  --python "$phase/build_scene.py"
```

The render settings are Cycles CPU, up to 48 samples, adaptive threshold 0.022, denoising and AgX Medium High Contrast. For an economical draft, set `PHASE033_DRAFT_DIR` to a scratch directory and append `-- --draft`. For Flatpak, pass that variable with `--env=PHASE033_DRAFT_DIR=...` and grant filesystem access to the scratch directory. Drafts are 800 × 500 at up to 10 samples. They write to the scratch path and keep the review files intact.

## Verification and scope

- `python "$phase/fetch_assets.py"` verified 38 downloads and 307,200 finite source elevation samples. Both Python files compiled, the asset manifest parsed and `git diff --check` passed.
- Blender 5.1.1 opened a copy outside the prototype folder. Both camera markers selected the expected cameras and passed terrain clearance checks. All 30 used textures were packed and both shrub opacity inputs were linked. The geometry includes 611,842 terrain triangles, about 1.13M unique source triangles and 7.51M evaluated triangles including all linked repetitions. Those figures describe the offline scene. The dense talus scans need dedicated low-detail meshes for browser use.
- Both review PNGs were opened and compared with the two original stills and sampled frames from both videos. This offline milestone was validated in Blender. The document records prospective browser budgets and the tests that would establish them.
- Work is confined to this directory. Pre/post SHA-256 checks matched the three earlier diorama Blender checkpoints, the original Junagarh file, the Rajasthan boundary and the chapter/anchor manifest. Website source and all other tracked files retain their working-tree state. The package is local and uncommitted.

Awaiting explicit visual approval before building a Rajasthan world with this pipeline.
