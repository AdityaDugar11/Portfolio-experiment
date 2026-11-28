import {
  Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, Raycaster, Scene,
  SRGBColorSpace, Texture, Vector2, WebGLRenderer,
} from 'three';

const SOURCE_DISTANCE = 2.65;
const DOLLY_DISTANCE = 0.82;
const RELIEF = 0.84;

export type CinematicFrame = {
  width: number;
  height: number;
  imageHeight: number;
  markerX: number;
  markerY: number;
  travel: number;
};

export function createCinematicScene(
  stage: HTMLElement,
  color: ImageBitmap,
  depth: HTMLImageElement,
  aspect: number,
  chapter: { x: number; y: number },
) {
  const scratch = document.createElement('canvas');
  scratch.width = depth.naturalWidth;
  scratch.height = depth.naturalHeight;
  const context = scratch.getContext('2d')!;
  context.drawImage(depth, 0, 0);
  const samples = context.getImageData(0, 0, scratch.width, scratch.height).data;
  const depthWidth = scratch.width;
  const depthHeight = scratch.height;
  scratch.width = scratch.height = 0;

  const renderer = new WebGLRenderer({ alpha: true, powerPreference: 'high-performance' });
  const camera = new PerspectiveCamera(fieldOfView(1, SOURCE_DISTANCE), aspect, 0.1, 10);
  const scene = new Scene();
  const geometry = new PlaneGeometry(aspect, 1, 144, 102);
  const vertices = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let index = 0; index < vertices.count; index += 1) {
    const x = Math.round(uv.getX(index) * (depthWidth - 1));
    const y = Math.round((1 - uv.getY(index)) * (depthHeight - 1));
    const z = RELIEF * (samples[4 * (y * depthWidth + x)] / 255 - 0.43);
    // Back-project along the source camera ray so the opening reproduces the original photograph.
    const rayScale = (SOURCE_DISTANCE - z) / SOURCE_DISTANCE;
    vertices.setXYZ(index, vertices.getX(index) * rayScale, vertices.getY(index) * rayScale, z);
  }

  const material = new MeshBasicMaterial();
  function releaseColor() {
    material.map?.image.close();
    material.map?.dispose();
  }
  function setColor(image: ImageBitmap) {
    const texture = new Texture(image);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    texture.flipY = false;
    texture.onUpdate = () => image.close();
    texture.needsUpdate = true;
    releaseColor();
    material.map = texture;
    material.needsUpdate = true;
  }
  setColor(color);
  const surface = new Mesh(geometry, material);
  scene.add(surface);

  camera.position.z = SOURCE_DISTANCE;
  camera.updateMatrixWorld();
  const ray = new Raycaster();
  ray.setFromCamera(new Vector2(chapter.x * 2 - 1, 1 - chapter.y * 2), camera);
  const hits = ray.intersectObject(surface);
  const anchor = hits[0].point;

  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  stage.prepend(canvas);
  let previousWidth = 0;
  let previousHeight = 0;
  let previousDpr = 0;

  return {
    canvas,
    setColor,
    draw(frame: CinematicFrame) {
      const { width, height, imageHeight, markerX, markerY, travel } = frame;
      const dpr = Math.min(window.devicePixelRatio, width <= 640 ? 1.5 : 1.35, Math.sqrt(3_000_000 / (width * height)));
      if (width !== previousWidth || height !== previousHeight || dpr !== previousDpr) {
        renderer.setPixelRatio(dpr);
        renderer.setSize(width, height, false);
        previousWidth = width;
        previousHeight = height;
        previousDpr = dpr;
      }
      const distance = SOURCE_DISTANCE - DOLLY_DISTANCE * travel;
      const pinScale = imageHeight * distance / (distance - anchor.z);
      const aimX = anchor.x - (markerX - width / 2) / pinScale;
      const aimY = anchor.y + (markerY - height / 2) / pinScale;
      const lateralTravel = 0.65 * travel;
      camera.position.set(aimX * lateralTravel, aimY * lateralTravel, distance);
      camera.fov = fieldOfView(height / imageHeight, distance);
      // A lens shift holds the pin while limiting the lateral baseline across thin rooflines.
      camera.setViewOffset(
        width, height, (aimX - camera.position.x) * pinScale, (camera.position.y - aimY) * pinScale,
        width, height,
      );
      renderer.render(scene, camera);
    },
    dispose() {
      geometry.dispose();
      releaseColor();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}

function fieldOfView(verticalSpan: number, distance: number) {
  return 2 * Math.atan(verticalSpan / (2 * distance)) * 180 / Math.PI;
}
