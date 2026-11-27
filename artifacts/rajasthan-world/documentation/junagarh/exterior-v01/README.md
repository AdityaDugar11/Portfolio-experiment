# Junagarh street elevation

Editable entrance-facing section for architectural review, reconstructed from the India Cine Hub exterior photograph. The same camera sees the separate street enclosure, sloping approach wall, continuous curved curtain, pale pointed portal, near drum and two palace ranges. The western gallery has recessed bays, projecting jharokhas, corbelled eaves, pierced lattice and rooftop pavilions. View 03 shows the open gateway at pedestrian eye level. View 04 looks into its reveals from inside the street enclosure.

## Review files

- [Editable scene](../../../blender/junagarh-exterior-v01.blend)
- [Six rendered views](../../../renders/junagarh/exterior-v01/)
- [Private photographic comparison on this workstation](../../../research/junagarh/references/primary-exterior/07-reference-comparison.png)
- [Construction script](../../../scripts/reconstruct_street_elevation.py)
- [Previous scene](../../../blender/junagarh-exterior-v01-initial.blend) and [previous renders](../../../renders/junagarh/exterior-v01-initial/)

## Architectural evidence

The camera uses an estimated 31.5 mm lens on a 36 mm sensor with vertical shift. In the 800 × 500 reference frame the estimated horizon is at y = 339 and the street wall recedes toward x ≈ −370. The approach projects the gate centre to x ≈ 550 and its arch apex near y ≈ 281. The tower positions and palace returns were estimated by intersecting sight lines with provisional façade planes. The reference image is attached as an external camera background. Toggle its eye in the camera's background-image settings to compare the geometry. The image is unpacked, disabled by default and absent from all material nodes.

The map collection contains the enclosing OSM way 126998139 and all 26 selected building outlines in local metre coordinates. It is hidden by default. The southern frontage provides a provisional orientation, origin and site-scale envelope. Individual palace wings have no verified footprint IDs. A reliable camera bearing and façade-to-footprint registration require a second identifiable exterior view or a measured control point. © OpenStreetMap contributors, ODbL. [Map extract and attribution](../../../research/junagarh/geodata/)

The side-by-side comparison supports the position of the gate, western palace corner, inclined wall and separate enclosure opening. The eastern terrace roofline is too continuous, the small pavilions and parapet openings repeat more regularly than in the photograph, and the position and curvature of the western bastion remain estimates. The street and rampart appear cleaner than the photographed surfaces. Close views expose the interpreted joint pattern, repeated screens, and limited carving variation. The alternate cameras test actual depth. There is no matching independent photograph for those viewpoints. The Meshy screenshots informed the desired density of detail. The primary photograph governs the visible relationships.

Supporting photographs 01 and 08 informed the nested entrance treatment and studded timber. Photographs 02–05 informed the gallery and balcony vocabulary. Photographs 06–07 depict guards at a named gate elsewhere in the reference set. Gate identity remains open. The modeled portal, leaf operation, hidden passage, tree form and unseen palace returns are interpretations. The scene covers the street elevation and a traversable gate section. It is incomplete around the rest of the perimeter and inside the palace. [Photo analysis](../../../research/junagarh/PRIMARY_EXTERIOR_ANALYSIS.md) · [Supporting image credits and licenses](../../../research/junagarh/references/inventory.json)

## Materials and lighting

| Surfaces | Construction |
| --- | --- |
| Red rampart, darker palace sandstone, pale entrance stone | Poly Haven old_sandstone_02. Diffuse variation remapped separately for each stone, with roughness and tangent-space normal maps. |
| Cut rose stone, mouldings and surrounds | Poly Haven red_sandstone_wall with metre-based UVs. Projecting profiles and arch joints are modeled. |
| Door boards and recessed shutters | Poly Haven fine_grained_wood. Each door has individual boards and attached ironwork. |
| Passage, courtyard paving and curb | Poly Haven dry_ground_01 as a subdued surface texture. |
| Street asphalt, iron, lime edging, sheltered stone, flag and tree | Original procedural materials. The iron uses metallic shading. The source photograph supplies no surface textures. |

All twelve external texture files were resolved after reopening the scene. These four generic texture sets are CC0. The material inventory records creators, individual files, source URLs and licenses. [Material inventory](../../../research/junagarh/materials/inventory.json)

The saved scene uses daylight and opens in the reference camera at frame 61. Render 06 uses a separate camera, a low warm sun and adjusted sky illumination. The construction script applies this lighting for that render. Scene color management works in the tested launch configuration below. The installed Flatpak still pairs an OCIO 2.5 default file with a 2.4.2 runtime. Its built-in 2.4 ACES CG configuration supplies a working scene-to-display transform. The saved scene reopened with “sRGB - Display” and “ACES 1.0 - SDR Video”, with diffuse maps decoded as sRGB and normal and roughness maps as Raw. The workstation display and source photograph have no measured color calibration.

## Door operation and geometry verification

Each leaf has its origin at its hinge. Frame 1 is closed and frame 61 is open at 86°. The wall behind the arch contains a barrel vault, transverse ribs, a squared door pocket for the swing and an open rear portal below the eastern terrace. The gate, door fitting geometry and camera clearances are design estimates. A Blender BVH intersection check sampled both moving leaf assemblies against one another and the surrounding passage and terrace masonry at every integer frame from 1 through 61. All samples passed. With both leaves open, nine longitudinal rays through the central lane at x = −0.55, 0 and +0.55 m and z = 0.85, 1.70 and 2.35 m reached y = 17 from y = −7. This tests the modeled approach corridor. A future camera rig with its own swept volume will need its own clearance check.

| Collection | Objects |
| --- | ---: |
| Rampart and bastions | 7 |
| Gateway and reveals | 16 |
| Passage and doors | 11 |
| Palace wings and galleries | 52 |
| Roofline | 15 |
| Street enclosure and context | 16 |
| Cameras and light | 7 |
| Map guides | 27 |

After reopening, Blender reported 141 mesh datablocks, 99,668 base faces across the unique meshes, and 14 materials. At frame 61 its evaluated visible scene reported 397,295 faces and 809,306 triangles including bevels, leaf canopy and repeated components. This is an editable source scene. A deployment mesh and mobile performance budget require their own work.

## Reproduce

From the repository root with the local reference photograph in its documented location, open the scene with the working color configuration.

```sh
flatpak run --env=OCIO=ocio://cg-config-v2.2.0_aces-v1.3_ocio-v2.4 org.blender.Blender \
  "$PWD/artifacts/rajasthan-world/blender/junagarh-exterior-v01.blend"
```

To regenerate the editable scene and six 1600 × 1000 stills, run the following command. It replaces the current study and renders at the paths above. Use a copy for individual edits. The older build_exterior_v01.py is the historical generator and also targets the original v01 filename.

```sh
flatpak run --env=OCIO=ocio://cg-config-v2.2.0_aces-v1.3_ocio-v2.4 org.blender.Blender \
  -b --threads 16 --python-exit-code 1 \
  --python "$PWD/artifacts/rajasthan-world/scripts/reconstruct_street_elevation.py"
```

Blender 5.1.1, Cycles CPU, 32 samples with denoising. The host sees an RTX 5060, while this Blender build enumerated zero CUDA and OptiX render devices. The cause of that packaging or device mismatch remains unverified. No system color or GPU packages were changed. The primary photo and comparison are local and Git-ignored. The reconstruction is independent of the web application.
