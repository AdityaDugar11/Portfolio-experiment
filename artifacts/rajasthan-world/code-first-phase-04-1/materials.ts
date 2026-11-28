/// <reference types="vite/client" />

import * as T from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const fortMaps = import.meta.glob<string>(
  '../research/junagarh/materials/{old_sandstone_02,red_sandstone_wall,fine_grained_wood}/{Diffuse,nor_gl,Rough}.jpg',
  { eager: true, query: '?url', import: 'default' },
);
const sandMaps = import.meta.glob<string>('./sand/{Diffuse,nor_gl,Rough}.jpg', { eager: true, query: '?url', import: 'default' });
const landscapeMaps = import.meta.glob<string>('./landscape/*.{jpg,hdr}', { eager: true, query: '?url', import: 'default' });

const detailMaps = import.meta.glob<string>('./stone/*.jpg', { eager: true, query: '?url', import: 'default' });

export async function loadMaterials(renderer: T.WebGLRenderer) {
  const loader = new T.TextureLoader();
  const textures: T.Texture[] = [];
  const uvAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  async function load(url: string, color = false) {
    const texture = await loader.loadAsync(url);
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.colorSpace = color ? T.SRGBColorSpace : T.NoColorSpace;
    texture.anisotropy = uvAnisotropy;
    textures.push(texture);
    return texture;
  }

  const channel = (asset: string, name: string) => fortMaps[`../research/junagarh/materials/${asset}/${name}.jpg`];
  async function pbr(url: (name: string) => string) {
    const [map, normalMap, roughnessMap] = await Promise.all([
      load(url('Diffuse'), true), load(url('nor_gl')), load(url('Rough')),
    ]);
    return { map, normalMap, roughnessMap };
  }

  const [sandstone, roseStone, woodMaps, sand, gravel, fineStone, stoneAO, stoneHeight, hdr] = await Promise.all([
    pbr((name) => channel('old_sandstone_02', name)),
    pbr((name) => channel('red_sandstone_wall', name)),
    pbr((name) => channel('fine_grained_wood', name)),
    pbr((name) => sandMaps[`./sand/${name}.jpg`]),
    pbr((name) => landscapeMaps[`./landscape/gravel-${name}.jpg`]),
    pbr((name) => detailMaps[`./stone/${name}.jpg`]),
    load(detailMaps['./stone/AO.jpg']),
    load(detailMaps['./stone/Displacement.jpg']),
    landscapeMaps['./landscape/sky.hdr']
      ? new RGBELoader().loadAsync(landscapeMaps['./landscape/sky.hdr'])
      : undefined,
  ]);

  const palette = {
    ochre: stone(fineStone, '#e5d5b5', 0.43, 0.34, stoneAO),
    paleTrim: stone(fineStone, '#eddbbb', 0.33, 0.39, stoneAO),
    grout: stone(fineStone, '#c4baa3', 0.34, 0.30),
    rose: stone(fineStone, '#bf856f', 0.46, 0.31, stoneAO),
    roseTrim: stone(fineStone, '#d3a390', 0.31, 0.35, stoneAO),
    masonry: stone(roseStone, '#d3aa95', 0.70),
    courtyard: stone(sandstone, '#b8b3aa', 0.43, 0.22),
    wood: new T.MeshStandardMaterial({
      ...woodMaps, color: '#9b735a', vertexColors: true, roughness: 0.94, normalScale: new T.Vector2(0.63, 0.63),
    }),
    iron: new T.MeshStandardMaterial({ color: '#342b25', vertexColors: true, metalness: 0.68, roughness: 0.68 }),
    sand: new T.MeshStandardMaterial({
      ...sand, color: '#d4b78b', vertexColors: true, roughness: 0.95, normalScale: new T.Vector2(0.76, 0.76),
    }),
    gravel: new T.MeshStandardMaterial({
      ...gravel, color: '#c1a681', vertexColors: true, roughness: 0.98, normalScale: new T.Vector2(0.94, 0.94),
    }),
    rock: stone(fineStone, '#b5946d', 0.77, 0.09, stoneAO),
    stem: new T.MeshStandardMaterial({ color: '#6c5a3b', vertexColors: true, roughness: 0.98 }),
    scrub: new T.MeshStandardMaterial({ color: '#8f8b5c', vertexColors: true, roughness: 0.96, side: T.DoubleSide }),
  };

  palette.rock.displacementMap = stoneHeight;
  palette.rock.displacementScale = 0.045;
  palette.rock.displacementBias = -0.018;
  if (hdr) {
    hdr.mapping = T.EquirectangularReflectionMapping;
    textures.push(hdr);
  }
  return { palette, textures, hdr };
}

export type Palette = Awaited<ReturnType<typeof loadMaterials>>['palette'];

function stone(maps: Pick<T.MeshStandardMaterial, 'map' | 'normalMap' | 'roughnessMap'>, color: string, normal: number, lift = 0, aoMap: T.Texture | null = null) {
  const material = new T.MeshStandardMaterial({
    ...maps, color, vertexColors: true, roughness: 0.96, normalScale: new T.Vector2(normal, normal), aoMap, aoMapIntensity: 0.43,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.stoneMapLift = { value: lift };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 stonePosition;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nstonePosition = (modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 stonePosition;
        uniform float stoneMapLift;
        float mineral(vec3 p) {
          vec3 c = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          vec4 n = vec4(0.0, 1.0, 91.7, 92.7) + dot(c, vec3(1.0, 91.7, 317.9));
          vec4 a = fract(sin(n) * 43758.5453);
          vec4 b = fract(sin(n + 317.9) * 43758.5453);
          vec4 h = mix(a, b, f.z);
          return mix(mix(h.x, h.y, f.x), mix(h.z, h.w, f.x), f.y);
        }`)
      .replace('#include <map_fragment>', `
        #ifdef USE_MAP
          vec4 scannedStone = texture2D(map, vMapUv);
          diffuseColor *= mix(scannedStone, vec4(1.0), stoneMapLift);
        #endif
        float grain = mineral(stonePosition * vec3(4.6, 1.3, 4.1));
        float broad = mineral(stonePosition * vec3(1.2, 0.76, 1.4));
        float damp = (1.0 - smoothstep(0.05, 1.22 + broad, stonePosition.y)) * (0.18 + 0.37 * grain);
        vec3 stain = mix(vec3(1.0), vec3(0.72, 0.66, 0.55), damp);
        float streak = mineral(stonePosition * vec3(4.24, 0.48, 3.11));
        float mineralStain = smoothstep(0.54, 0.79, broad * 0.47 + streak * 0.53);
        float shelfFalloff = exp(-abs(stonePosition.y - 8.12) * 2.4) * 0.53;
        float runoff = mineralStain * (0.12 + shelfFalloff);
        vec3 patina = mix(vec3(1.0), vec3(0.71, 0.58, 0.46), runoff);
        diffuseColor.rgb *= stain * patina * (0.82 + broad * 0.23 + grain * 0.081);`);
  };
  return material;
}
