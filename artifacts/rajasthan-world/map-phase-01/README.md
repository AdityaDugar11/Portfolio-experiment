# Map Phase 01 — Rajasthan Terrain Map Package

Offline terrain and composition checkpoint for Page 02 (`artifacts/rajasthan-world/map-phase-01/`).
Production website integration and fort architectural modeling are paused pending owner approval of this visual checkpoint.

## 1. Deliverables

- **Editable Blender scene:** `rajasthan-terrain-map.blend` (packed textures and HDRI, 5 timeline cameras, `1 Blender unit = 1 km` in Lambert Conformal Conic projection, `3.2×` vertical exaggeration).
- **Reproducible scripts:**
  - `scripts/prepare_sources.py` — Acquires Natural Earth 10m state/river/lake vectors, Wikidata fort coordinates, supplementary DEM tile `N26E078`, and ESA WorldCover Sentinel-2 2021 RGBNIR overviews.
  - `scripts/project_map.py` — Projects terrain, co-registered Sentinel-2 albedo (`4800×4304`), hydrography/state/vegetation masks, world-space relief normals, state/river/lake guide traces, and `data/chapters.json`.
  - `scripts/mewar_detail.py` — Builds the nested native-DEM Mewar/Kumbhalgarh patch (`native-mesh.npz`), high-resolution Sentinel-2 crop (`mewar-surface.jpg`), and `mewar-normal.png`, and caches the Poly Haven sunset HDRI.
  - `scripts/build_map.py` — Constructs the Blender scene, materials, lighting, screen-space chapter markers, saves `rajasthan-terrain-map.blend`, and renders all five review cameras.
- **Renders (`renders/`):**
  1. `01-wide-aerial.png` (`1920×1080`) — Wide sunset aerial across the Aravalli front toward the Thar desert.
  2. `02-rajsamand-approach.png` (`1600×1000`) — Terrain detail render over Rajsamand Lake and the Mewar Aravalli foothills.
  3. `03-geographic-verification.png` (`1400×1400`) — North-up orthographic verification with Rajasthan state boundary, rivers, lakes, and all 10 fort anchors.
  4. `04-desktop.png` (`1440×900`) — Elevated desktop atlas composition with all 10 chapter markers and `01 Junagarh Fort / THE BEGINNING` callout.
  5. `05-mobile.png` (`390×844`) — Vertical mobile composition framed from the eastern plains toward the Thar desert with all 10 chapter markers.

## 2. Chapter Anchor Positions (`data/chapters.json`)

Coordinates are representative Wikidata site points (`P625`) projected to `+proj=lcc +lat_1=24 +lat_2=29.5 +lat_0=26.5 +lon_0=74 +datum=WGS84 +units=m +no_defs` (km, `3.2×` Z exaggeration):

| Ch | Fort | Title | Lat | Lon | DSM (m) | Blender XYZ (km) |
|---|---|---|---|---|---|---|
| 01 | Junagarh Fort | THE BEGINNING | 28.02201 | 73.31772 | 227.59 | `[-67.03571, 168.64825, 0.72828]` |
| 02 | Mehrangarh Fort | BEYOND THE INTERFACE | 26.29806 | 73.01889 | 320.82 | `[-97.86738, -21.97179, 1.02663]` |
| 03 | Kumbhalgarh Fort | THE LEARNING CURVE | 25.14917 | 73.58111 | 1025.62 | `[-42.20375, -149.43487, 3.28199]` |
| 04 | Amber Fort | WHAT DRAWS MY ATTENTION | 26.98590 | 75.85070 | 459.42 | `[183.49841, 55.11041, 1.47014]` |
| 05 | Chittorgarh Fort | HOW I TURN IDEAS INTO SYSTEMS | 24.88722 | 74.64694 | 532.20 | `[65.32799, -178.33474, 1.70303]` |
| 06 | Jaisalmer Fort | THE WORK I CHOOSE TO SHOW | 26.91270 | 70.91260 | 263.85 | `[-306.29553, 49.39049, 0.84431]` |
| 07 | Gagron Fort | ENGINEERING WITH OTHERS | 24.62800 | 76.18300 | 311.15 | `[220.92024, -205.30409, 0.99568]` |
| 08 | Ranthambore Fort | THE EXPERIMENTAL LAB | 26.02038 | 76.45500 | 455.87 | `[245.46989, -50.71154, 1.45878]` |
| 09 | Taragarh Fort, Bundi | STILL BECOMING | 25.45075 | 75.63738 | 424.06 | `[164.53487, -115.06437, 1.35700]` |
| 10 | Nahargarh Fort | THE NEXT CONNECTION | 26.93750 | 75.81583 | 559.37 | `[180.11803, 49.70440, 1.78998]` |

## 3. Data Attribution & Licensing (₹0 Budget)

- **Elevation:** Copernicus GLO-90 Digital Surface Model (`Copernicus_DSM_COG_30_*_DEM.tif`, 72 cached tiles + `N26E078`).
- **Surface Imagery:** ESA WorldCover 2021 Sentinel-2 RGBNIR composite (`ESA_WorldCover_10m_2021_v200_*_S2RGBNIR.tif`).
- **Vectors:** Natural Earth 10m cultural (`ne_10m_admin_1_states_provinces`) and physical (`ne_10m_rivers_lake_centerlines`, `ne_10m_lakes`) datasets (public domain).
- **Coordinates:** Wikidata `P625` statements (CC0).
- **Sky HDRI:** Poly Haven `industrial_sunset_02_puresky_2k.hdr` (CC0).

## 4. Camera Treatments & Reproduction

- `build_map.py` sets up 5 timeline frames (`1`–`5`) with per-frame camera binding, vertical exaggeration keyframes (`2.5×` aerial, `1.65×` Rajsamand detail, `3.2×` atlas/verification), and view-distance atmospheric scattering matched to the sunset horizon.
- **Flatpak Blender 5.1.1 OCIO note:** The system Flatpak `org.blender.Blender` 5.1.1 bundles OpenColorIO 2.4.2 alongside a `2.5` `config.ocio`, which causes color management to fall back to disabled unless `OCIO` points to a `2.4`-compatible config. Full AgX renders were produced using `.cache/ocio/config.ocio` (`ocio_profile_version: 2.4`):

```bash
flatpak run \
  --env=OCIO=/home/adityadugar/Documents/Projects/Portfolio-experiment/artifacts/rajasthan-world/map-phase-01/.cache/ocio/config.ocio \
  org.blender.Blender --background --python artifacts/rajasthan-world/map-phase-01/scripts/build_map.py
```

## 5. Known Limitations & Proposed Web Delivery Notes

- **Representative points:** `chapters.json` coordinates are Wikidata monument points, not exact fort entrance gates.
- **Mesh resolution:** Regional terrain uses `1.25 km` spacing (`805×723`), Mewar mid-tier uses `250 m` (`511×606`), and only the Kumbhalgarh/Rajsamand approach patch uses `100 m` native spacing. Other fort approaches will need localized detail patches or authored terrain when fort modeling begins.
- **No 3D fort geometry:** Chapter markers are screen-space annotations; fort silhouettes and gateways belong to a later approved phase.
- **Web delivery (unmeasured estimates):** For Three.js runtime delivery, export a decimated glTF terrain mesh (target `< 150k` triangles for overview), KTX2/BasisU albedo + normal maps (`2048×2048` or tiled), and stream per-fort detail patches on demand.
