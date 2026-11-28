# Phase 02.1 interactive Rajasthan checkpoint

[Open the local preview](http://localhost:5173/?preview=rajasthan-world). To restart the preview server, run `npm run dev -- --port 5173` from the repository root.

- [Desktop opening landscape](01-desktop-opening.png)
- [Desktop chapter map](02-desktop-chapter-map.png)
- [Chapter 01 selected](03-desktop-chapter-01-selected.png)
- [Chapter 01 transition endpoint](04-desktop-chapter-01-endpoint.png)
- [Mobile chapter map at 390 × 844](05-mobile-chapter-map-390x844.png)
- [Silent browser recording](06-rajasthan-scroll-and-return.mp4)

## Scope and files

- `src/components/RajasthanWorldPreview.tsx` and `RajasthanWorldPreview.css` implement the native scroll reveal, chapter navigation, regional approach, threshold, and return. The optional `onExteriorReady(chapter)` callback fires when the approach completes and can serve as the future exterior entry point. Scrolling away before completion cancels the handoff.
- `src/components/rajasthanTerrain.ts` owns terrain loading, atmospheric grading, and resource disposal. It finds the DEM coverage edge from the indexed mesh and blends it into the same atmosphere used by the sky. The existing Mewar detail mesh loads during the scroll reveal.
- `src/main.tsx` puts the lazy import directly behind Vite's compile-time `import.meta.env.DEV` guard. The previous cast and optional chain kept the guard from folding away the preview import in the production build.
- `vite.config.ts` excludes `public/preview/rajasthan-world/` from the production public-asset copy. Vite's default public-directory copy had shipped the files independently of the JavaScript.
- The sky WebP, Latin Noto Serif WOFF2, and its license are the three new preview assets. Page 01 source, assets, and scroll architecture were preserved, along with the terrain exporter, GLBs, chapter coordinates, projection, storyboard, and ignored 106 MB Blender scene.

## Validation

- `npm run build` passed. Vite emitted its main-chunk size warning at 881.58 kB before gzip and 254.57 kB after gzip.
- `git diff --check` passed. The built asset tree contains no Rajasthan preview files or JavaScript references. All four production public files were byte-identical to their sources. Chrome loaded Page 01 at the production URL even with the preview query and made zero Rajasthan preview requests.
- `npm run lint` exits 127 because ESLint is absent. `npm ls eslint --all` found no installation, and the repository has no ESLint configuration. The milestone uses the existing tooling.
- Chrome 158 desktop passed slow, fast, and reverse wheel scrolling, click selection, approach, return, and the same opening camera position after reversal. Keyboard and reduced-motion tests covered Enter selection and Escape return. A WebGL-disabled run still offered all ten chapters through the index.
- At 390 × 844, Chrome touch emulation passed native swipe, tapping all ten destinations, and approach and return. All ten projected targets fit above the chapter index without intersecting. The Chapter 04 and 10 target edges were approximately 16 CSS pixels apart.
- The initial stored asset payload is 2.52 MB for the manifest, overview GLB, surface textures, sky, and font. Sky and font add 29.1 KiB. The existing 1.52 MB Mewar mesh is deferred until the scroll reveal.

## Performance

Each row is one 3-second forward and reverse scroll sweep with the Mewar mesh warm and screen recording off. FPS counts Three.js renders during the sweep. The 95th-percentile interval comes from browser animation frames. The GPU runs used the same local Chrome and NVIDIA GeForce RTX 5060 Laptop GPU. All runs reported three draw calls and 132,104 triangles.

| Chrome configuration | Viewport | Canvas buffer | Render FPS | 95th-percentile frame interval |
| --- | --- | --- | ---: | ---: |
| NVIDIA hardware, desktop | 1440 × 900 | 1440 × 900 | 239 | 4.3 ms |
| NVIDIA hardware, emulated mobile | 390 × 844 | 526 × 1140 | 239 | 4.3 ms |
| SwiftShader, desktop | 1440 × 900 | 1440 × 900 | 5 | 299.9 ms |

The mobile measurement uses a desktop-class GPU. Physical phone performance remains unverified. SwiftShader camera motion is visibly slow at desktop size.

## Asset provenance

- `sunset-sky.webp` derives from the locally cached 2K Industrial Sunset 02 (Pure Sky) HDRI, with the original by Sergej Majboroda and sky edits by Jarod Guest. It was resized to 1024 × 512, converted to sRGB WebP, and graded in the shader. The source is CC0 and requires no attribution. [Poly Haven asset](https://polyhaven.com/a/industrial_sunset_02_puresky)
- `noto-serif-latin.woff2` is a Latin subset of Noto Serif 2.015 from the installed Fedora `google-noto-serif-vf-fonts` package. The Noto Project Authors license the font under SIL OFL 1.1. The upstream copyright and license text accompany the subset. [Noto Serif license](https://github.com/notofonts/latin-greek-cyrillic/blob/main/OFL.txt)

## Review gate

The endpoint is a regional camera stop at the fort's representative map anchor. A detailed Junagarh exterior, gate approach, and interiors are outside this checkpoint. Owner approval of the browser preview and captures is pending before exterior work.
