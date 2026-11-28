import * as T from 'three';
import { buildJunagarh } from './junagarh';
import { buildLandscape } from './landscape';
import { loadMaterials } from './materials';

export async function createScene(canvas: HTMLCanvasElement, cinematic = false) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: cinematic });
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(43, 1, 0.065, 300);
  try {
    const { palette, textures, hdr } = await loadMaterials(renderer);
    scene.background = hdr ?? new T.Color('#bfccd5');
    scene.backgroundIntensity = 0.84;
    scene.backgroundRotation.y = 0.74;
    scene.environment = hdr ?? null;
    scene.environmentIntensity = 0.43;
    scene.environmentRotation.y = scene.backgroundRotation.y;
    scene.fog = new T.FogExp2('#c4b39f', 0.008);

    scene.add(new T.HemisphereLight('#d8e6f4', '#c79e7a', 1.47));
    const sun = new T.DirectionalLight('#fff1d9', 2.32);
    sun.position.set(26, 36, 28);
    sun.target.position.set(-2.8, 0, -1.5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 20, bottom: -18, near: 0.1, far: 86 });
    sun.shadow.normalBias = 0.023;
    sun.shadow.bias = -0.00016;
    scene.add(sun, sun.target);
    const courtyardBounce = new T.DirectionalLight('#e6bd86', 0.29);
    courtyardBounce.position.set(-4, 7, -13);
    scene.add(courtyardBounce);

    const fort = buildJunagarh(palette);
    const landscape = buildLandscape(palette);
    scene.add(fort.group, landscape);

    function setSize(width: number, height: number, dpr = 1) {
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    return {
      camera, scene, fort, renderer, setSize,
      render() { renderer.render(scene, camera); },
      dispose() {
        const geometries = new Set<T.BufferGeometry>();
        const materials = new Set<T.Material>(Object.values(palette));
        scene.traverse((object) => {
          if (!(object instanceof T.Mesh)) return;
          if (object instanceof T.InstancedMesh) object.dispose();
          geometries.add(object.geometry);
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
        });
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => material.dispose());
        textures.forEach((texture) => texture.dispose());
        sun.shadow.dispose();
        renderer.dispose();
      },
    };
  } catch (error) {
    renderer.dispose();
    throw error;
  }
}
