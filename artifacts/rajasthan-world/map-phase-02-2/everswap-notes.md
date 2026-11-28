# EverSwap public interaction study

## Observations

- REA 6.10.1 ran with an isolated Node 26.12.1 npm runner. The system Node 26.7.0 was below REA’s minimum, so this run used the temporary package runner. The scoped REA launch used a fresh, owned Chromium profile and captured the public home page, Page Down, Page Up, and settled frames. REA cleaned up its browser. The capture recorded 60 successful requests, including 59 to the page origin, with no newly captured requests after the keyboard actions. Network bodies, headers, storage, and source were outside the capture.
- A separate headed Chrome run gave the intro time to settle, then sent centered wheel inputs. The desktop document stayed 900 CSS pixels tall with body overflow hidden and `window.scrollY === 0`. No visible native scroll container appeared in the geometry probe. The picture changed substantially within the opening section. A second equal wheel batch reached “One Pool”. One reverse batch returned to the earlier visual region and a second returned near the starting image. Small differences remained in the settled starting frame.
- The public texture responses used separate scene resource paths, including ridge, mountains, cloud, flow, smoke, and lake textures. Under this run they arrived near startup. The capture could identify response timing and categories. Asset LOD policy, individual frame scheduling, camera matrices, and any exact easing function remain unknown.
- At 390 × 844 in Chrome touch emulation, the viewport stayed fixed and the tested swipes remained on the opening section. This leaves physical-phone behavior and exact touch progression unverified.

## Inferences and application

Desktop behavior is consistent with a fixed canvas driven by virtual wheel progress. A moving view inside the same copy section suggests continuous movement or interpolation between nearby states. The observed transitions do not establish how the site stores progress, lays out the scene, or switches chapters. Apparent motion can come from moving the camera, moving layers, or both.

The Rajasthan preview borrows the principle of a travelling viewpoint with editorial restraint. Native document scroll drives its own authored camera positions and look targets. The fork at the atlas uses the same scroll axis as the main journey. The model, terrain, color, touch interaction, and asset scheduling are Rajasthan-specific.

[EverSwap](https://everswap.com/) · [REA repository](https://github.com/morluto/rea) · [Installation guidance](https://github.com/morluto/rea/blob/main/docs/getting-started/installation.md) · [Responsible-use guidance](https://github.com/morluto/rea/blob/main/DISCLAIMER.md)
