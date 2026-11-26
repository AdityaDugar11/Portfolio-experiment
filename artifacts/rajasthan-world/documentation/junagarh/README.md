# Junagarh study — checkpoint A, not approved

This is a preliminary procedural massing experiment, not an accurate reconstruction. The current result is too generic to establish a reliable likeness. It does not yet meet the owner’s architectural quality goal. The fort footprint (126 × 96 m), wall height (16 m), gateway and palace dimensions, courtyard arrangement and all positions are visual placeholders, not measurements. The round bastions, red outer walls and pale gate are informed by the sources below; their number, actual positions, profiles and relationships are not verified. No Copernicus data has been imported into this scene. The ground is a flat test surface, not Bikaner geography.

## References and attribution

- [Suraj Pol photograph](https://commons.wikimedia.org/wiki/File:Inde_Bikaner_Junagarh_Fort_Suraj_Pol_-_panoramio.jpg), rene boulay, 2015, CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/). Downloaded unchanged as `references/junagarh/suraj-pol-rene-boulay.jpg` for architectural reference; photograph is not used as a scene texture. It shows the pale facade and nested pointed arch. Redistribution must retain attribution and license conditions.
- [Incredible India](https://www.incredibleindia.gov.in/en/rajasthan/bikaner/junagarh-fort): red and gold sandstone, palace cluster and gates. Reference only; its imagery is not included.
- [Survey of India Bikaner map](https://surveyofindia.gov.in/files/bikaner.pdf): fort location and exterior context. Reference only; no map imagery is included.
- [Asian Historical Architecture](https://www.orientalarchitecture.com/sid/1998/india/bikaner/junagarh-fort-and-palace): architectural background; reference only.

The earlier model search found a paid listing; no suitably licensed free complete digital Junagarh model was verified. No paid assets or external textures were used. Materials are original simple colors and are not physically convincing yet. The scene has 4,000 or so mesh faces (see build log), no external texture memory, and is intentionally rough.

## State and rebuild

`blender/junagarh-fort-study.blend` contains collections for foundation, walls, bastions, gateway, door hinges and leaves, palaces, windows, chhatris, courtyard, ornaments, environment, lighting and cameras. `scripts/build_junagarh_study.py` creates the scene and three CPU renders using Flatpak Blender 5.1.1. Door hinge empties have simple rotation keyframes at frames 1/60/120. They are an unverified proposed interaction, not a documented historical mechanism; the current doors and gateway have not passed collision testing and must not be considered functional or approved. Accurate arches, real gateway placement, detailed measurements, urban context, terrain, material textures, and references from multiple perspectives are outstanding.

The Flatpak Blender OpenColorIO 2.5 / 2.4.2 mismatch remains; color management is disabled in these previews. Cycles CPU at 960 × 600 and 12 samples took roughly 4–5 seconds per image. Prior investigation detected an RTX 5060 driver but Blender did not list a CUDA GPU or OptiX; no GPU acceleration is claimed. No portable installation or system change was made.
