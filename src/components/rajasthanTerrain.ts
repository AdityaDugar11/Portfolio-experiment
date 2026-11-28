import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface ChapterPoint {
  chapter: number;
  fort: string;
  title: string;
  world_xyz_km: [number, number, number];
}

interface Manifest {
  chapters: ChapterPoint[];
}

const ASSETS = '/preview/rajasthan-world';
const skyColor = /* glsl */ `
  uniform sampler2D panorama;
  vec3 atmosphere(vec3 direction) {
    float bearing = atan(direction.z, direction.x) * 0.15915494 + 0.747;
    float altitude = asin(clamp(direction.y, 0.0, 1.0));
    vec3 photo = texture2D(panorama, vec2(fract(bearing), 0.493 - altitude * 0.43)).rgb;
    vec3 peach = vec3(0.72, 0.46, 0.34);
    vec3 blue = vec3(0.19, 0.34, 0.51);
    vec3 wash = mix(peach, blue, smoothstep(-0.015, 0.25, direction.y));
    vec3 sky = mix(wash, photo, 0.42);
    vec3 earth = vec3(0.27, 0.20, 0.15);
    return mix(sky, earth, smoothstep(0.0, 0.85, -direction.y) * 0.87);
  }
`;

// The indexed DEM has missing cells at several edges. Measure the distance
// to those cells on the original grid instead of assuming a rectangular mesh.
function addEdgeDistance(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute('position');
  const indices = geometry.getIndex()!;
  const used = new Uint8Array(position.count);
  const distance = new Float32Array(position.count);
  const boundary = new Uint8Array(position.count);
  const edges = new Set<number>();
  for (let i = 0; i < indices.count; i += 3) {
    const a = indices.getX(i);
    const b = indices.getX(i + 1);
    const c = indices.getX(i + 2);
    used[a] = used[b] = used[c] = 1;
    for (const [from, to] of [[a, b], [b, c], [c, a]]) {
      const key = Math.min(from, to) * position.count + Math.max(from, to);
      if (!edges.delete(key)) edges.add(key);
    }
  }
  for (const edge of edges) {
    boundary[Math.floor(edge / position.count)] = boundary[edge % position.count] = 1;
  }
  let width = 1;
  while (position.getZ(width) === position.getZ(0)) width++;
  const height = position.count / width;
  const spacing = position.getX(1) - position.getX(0);
  distance.fill(Infinity);

  function scan(start: number, stride: number, length: number) {
    let steps = 0;
    for (let step = 0, index = start; step < length; step++, index += stride) {
      if (!used[index] || boundary[index]) steps = 0;
      distance[index] = Math.min(distance[index], steps * spacing);
      if (used[index]) steps++;
    }
  }

  for (let row = 0; row < height; row++) {
    scan(row * width, 1, width);
    scan((row + 1) * width - 1, -1, width);
  }
  for (let column = 0; column < width; column++) {
    scan(column, width, height);
    scan((height - 1) * width + column, -width, height);
  }
  geometry.setAttribute('edgeDistance', new THREE.BufferAttribute(distance, 1));
}

export function createRajasthanTerrain(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
  const textures = new THREE.TextureLoader();
  const models = new GLTFLoader();
  const resources = new Set<{ dispose: () => void }>();
  const requests = new AbortController();
  let disposed = false;
  let detailRequested = false;
  let detailLoaded = false;
  let material: THREE.MeshStandardMaterial | undefined;
  let overview: THREE.Object3D | undefined;
  let detailModel: THREE.Object3D | undefined;
  const ray = new THREE.Raycaster();
  const sunDirection = new THREE.Vector3(-410, 150, 210).normalize();

  function own<T extends { dispose: () => void }>(resource: T) {
    if (disposed) resource.dispose();
    else resources.add(resource);
    return resource;
  }

  async function texture(file: string, color = false) {
    const result = own(await textures.loadAsync(`${ASSETS}/${file}`));
    result.flipY = false;
    result.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    result.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return result;
  }

  async function mesh(file: string, detail = false) {
    const { scene: model } = await models.loadAsync(`${ASSETS}/${file}`);
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      own(object.geometry);
      own(object.material);
      if (disposed || !material) return;
      object.material = material;
      if (detail) {
        object.geometry.setAttribute('edgeDistance', new THREE.BufferAttribute(
          new Float32Array(object.geometry.getAttribute('position').count).fill(150), 1,
        ));
        object.position.y += 0.012;
        object.renderOrder = 1;
      } else {
        addEdgeDistance(object.geometry);
      }
    });
    if (!disposed) {
      scene.add(model);
      model.updateMatrixWorld(true);
      if (detail) detailModel = model;
      else overview = model;
    }
  }

  const sun = new THREE.DirectionalLight('#fff1da', 2.75);
  sun.position.copy(sunDirection);
  scene.add(sun, sun.target, new THREE.HemisphereLight('#bdcdeb', '#a18a70', 0.79));

  function heightAt(x: number, z: number, fallback: number) {
    if (!overview) return fallback;
    ray.set(new THREE.Vector3(x, 20, z), new THREE.Vector3(0, -1, 0));
    return ray.intersectObject(overview, true)[0]?.point.y ?? fallback;
  }

  function lightForecourt(anchor: THREE.Vector3, mobile: boolean) {
    sun.target.position.copy(anchor);
    sun.position.copy(anchor).addScaledVector(sunDirection, 0.25);
    const shadow = sun.shadow;
    shadow.camera.left = shadow.camera.bottom = -0.105;
    shadow.camera.right = shadow.camera.top = 0.105;
    shadow.camera.near = 0.06;
    shadow.camera.far = 0.48;
    shadow.camera.updateProjectionMatrix();
    shadow.mapSize.setScalar(mobile ? 512 : 1024);
    shadow.bias = -0.00012;
    shadow.normalBias = 0.00018;
    shadow.autoUpdate = false;
  }

  async function load() {
    const data = fetch(`${ASSETS}/manifest.json`, { signal: requests.signal }).then(async (response) => {
      if (!response.ok) throw new Error(`Terrain manifest HTTP ${response.status}`);
      return await response.json() as Manifest;
    });
    const [manifest, albedo, normal, masks, panorama] = await Promise.all([
      data,
      texture('surface-warm.webp', true),
      texture('relief-normal.webp'),
      texture('surface-masks.webp'),
      texture('sunset-sky.webp', true),
    ]);
    if (disposed) return manifest;
    panorama.wrapS = THREE.RepeatWrapping;

    const sky = new THREE.Mesh(
      own(new THREE.SphereGeometry(2100, 32, 18)),
      own(new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        toneMapped: false,
        uniforms: { panorama: { value: panorama } },
        vertexShader: /* glsl */ `
          varying vec3 worldPosition;
          void main() {
            worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * viewMatrix * vec4(worldPosition, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 worldPosition;
          ${skyColor}
          void main() {
            gl_FragColor = vec4(atmosphere(normalize(worldPosition - cameraPosition)), 1.0);
            #include <colorspace_fragment>
          }
        `,
      })),
    );
    sky.renderOrder = -1;
    scene.add(sky);

    material = own(new THREE.MeshStandardMaterial({
      map: albedo,
      normalMap: normal,
      normalScale: new THREE.Vector2(1.32, 1.32),
      roughness: 0.94,
    }));
    material.onBeforeCompile = (shader) => {
      shader.uniforms.panorama = { value: panorama };
      shader.uniforms.surfaceMasks = { value: masks };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
          attribute float edgeDistance;
          varying vec4 terrain;
        `)
        .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
          terrain = vec4((modelMatrix * vec4(transformed, 1.0)).xyz, edgeDistance);
        `);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec4 terrain;
          uniform sampler2D surfaceMasks;
          ${skyColor}
        `)
        .replace('#include <map_fragment>', `#include <map_fragment>
          vec3 masks = texture2D(surfaceMasks, vMapUv).rgb;
          float water = smoothstep(0.12, 0.55, masks.r);
          float green = smoothstep(0.26, 0.61, masks.b);
          vec3 surface = diffuseColor.rgb;
          float value = dot(surface, vec3(0.26, 0.63, 0.11));
          surface = mix(surface, value * vec3(1.15, 0.99, 0.79), 0.25);
          surface = mix(surface, value * vec3(0.74, 0.79, 0.53), green * 0.52);
          diffuseColor.rgb = mix(surface, vec3(0.018, 0.051, 0.060) + surface * 0.17, water * 0.87);
        `)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          roughnessFactor = mix(roughnessFactor, 0.29, water);
        `)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          normal = normalize(mix(normal, nonPerturbedNormal, water * 0.84));
        `)
        .replace('#include <colorspace_fragment>', `
          vec3 ray = terrain.xyz - cameraPosition;
          float distanceHaze = smoothstep(240.0, 880.0, length(ray)) *
            (0.025 + 0.21 * (1.0 - smoothstep(0.02, 0.36, abs(normalize(ray).y))));
          float edge = 1.0 - smoothstep(8.0, 104.0, terrain.w);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, atmosphere(normalize(ray)), max(distanceHaze, edge));
          #include <colorspace_fragment>
        `);
    };
    await mesh('rajasthan-overview.glb');
    return manifest;
  }

  return {
    load,
    heightAt,
    lightForecourt,
    useDetail(visible: boolean) { if (detailModel) detailModel.visible = visible; },
    useLocalShadows(visible: boolean) {
      if (sun.castShadow === visible) return;
      sun.castShadow = visible;
      sun.shadow.needsUpdate = visible;
    },
    get detailLoaded() { return detailLoaded; },
    async loadDetail() {
      if (detailRequested || !material || disposed) return false;
      detailRequested = true;
      await mesh('mewar-detail.glb', true);
      detailLoaded = !disposed;
      return detailLoaded;
    },
    dispose() {
      disposed = true;
      requests.abort();
      sun.shadow.dispose();
      resources.forEach((resource) => resource.dispose());
      resources.clear();
    },
  };
}
