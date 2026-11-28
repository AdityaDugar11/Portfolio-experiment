# Phase 03.2.1 review

[Editable Blender scene](Rajasthan.blend) · [Full Rajasthan draft](renders/01-overview.png) · [Junagarh approach draft](renders/02-junagarh-approach.png) · [Private reference contact sheet](work/reference-contact-sheet.jpg)

The two drafts were compared with both original diorama stills and frames extracted from both Gemini clips at two-second intervals. The references served as visual benchmarks. The scene uses the inherited procedural terrain and 3D architecture.

## Junagarh

Imported 116 meshes from [junagarh-exterior-v01.blend](../blender/junagarh-exterior-v01.blend), retaining its modeled galleries, masonry, open rear vault, separate hinged leaves, and UV-mapped materials. The source street-enclosure details remain, and the oversized asphalt plane was excluded so the diorama terrain meets the forecourt. The placeholder was removed. The source metre datum was centered under the existing fort anchor, with a provisional south-facing entrance and an artwork scale of 0.44 Blender units per source metre. Terrain grading is confined to the fort and forecourt footprint and its transition. Nine rays passed through the open entrance corridor at different widths and heights. The original fort and Phase 03.2 Blender file passed their pre-edit checksums.

The source is a reference-based street elevation, with incomplete architecture beyond the modeled façade and passage. The nearer village roofs still compete with the lower edge of the gateway in this composition. The existing doors retain their hinge origins and animation from the source. The review camera uses the open pose.

## Color and landscape

Phase 03.2 combined pale linear bedrock and sand pigments, cool area fill and sky illumination, and +0.28 exposure under AgX. AgX rolls off bright colors, so raising exposure while lighting these pale pigments reduced separation. This pass changes sand, soil, rock, foliage and water independently. It keeps AgX Medium High Contrast, reduces exposure to +0.11, lowers sky and area fill, and adds a warm edge light. The reopened scene uses the working Phase 01 OCIO configuration with no compositor adjustment. The imported diffuse maps use sRGB and roughness and normal maps use Non-Color. Twelve fort textures and the sky are packed. [Existing fort texture provenance](../research/junagarh/materials/inventory.json) · [Terrain and sky provenance](../diorama-phase-03-2/ASSETS.md)

The terrain mesh retains its outline, ten anchor placements, and dune geometry. Exposed rock now has a layered fracture shader, while 1,759 additional plants extend existing clusters. Water has a warmer strand, cooler depth pigment, and reduced roughness. The rock relief and shore detail remain broader than the originals, and the other fort anchors have no detailed architectural masses. No website code or browser interaction was changed.

## Rebuild

The deliverables are the scene, the two draft PNGs, this report, and `correct_scene.py`. The script reads the saved Phase 03.2 scene and its local `work/sculpt.npz`, plus the source exterior and its existing textures. From the project root:

```bash
world="$PWD/artifacts/rajasthan-world"
phase="$world/diorama-phase-03-2-1"
flatpak run --filesystem="$PWD" \
  --env=OCIO="$world/map-phase-01/.cache/ocio/config.ocio" \
  org.blender.Blender -b "$world/diorama-phase-03-2/Rajasthan.blend" \
  --python-exit-code 1 --python "$phase/correct_scene.py" -- --render
```

Both final drafts are 990 × 660 RGB PNGs rendered with Cycles CPU, up to 11 samples and denoising. The corrected scene reopened in Blender 5.1.1 with all 13 images packed. The editable scene and reference sheet are local ignored artifacts. Visual approval is pending.
