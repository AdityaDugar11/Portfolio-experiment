import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const ASSETS = '/preview/rajasthan-world';

export function createJunagarh(scene: THREE.Scene, anchor: THREE.Vector3) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const resources = new Set<{ dispose(): void }>();
  const atlas = new THREE.Group();
  const exterior = new THREE.Group();
  let disposed = false;
  let ready = false;
  let request: Promise<void> | undefined;
  atlas.position.copy(anchor);
  exterior.position.copy(anchor);
  exterior.scale.setScalar(0.001);
  atlas.visible = exterior.visible = false;
  scene.add(atlas, exterior);

  function own<T extends { dispose(): void }>(resource: T) {
    if (disposed) resource.dispose();
    else resources.add(resource);
    return resource;
  }

  async function loadMesh(name: string, destination: THREE.Group, surface?: THREE.Texture) {
    const { scene: model } = await loader.loadAsync(`${ASSETS}/junagarh-${name}.glb`);
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      own(object.geometry);
      const material = own(object.material as THREE.MeshStandardMaterial);
      if (surface) {
        object.castShadow = object.receiveShadow = true;
        material.onBeforeCompile = (shader) => {
          shader.uniforms.stoneSurface = { value: surface };
          shader.uniforms.stoneOrigin = { value: anchor };
          shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 stonePosition;\nuniform vec3 stoneOrigin;')
            .replace('#include <begin_vertex>', `#include <begin_vertex>
              stonePosition = ((modelMatrix * vec4(transformed, 1.0)).xyz - stoneOrigin) * 1000.0;
            `);
          shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 stonePosition;\nuniform sampler2D stoneSurface;')
            .replace('#include <color_fragment>', `#include <color_fragment>
              vec2 ageUV = vec2(stonePosition.x + .71 * stonePosition.z, stonePosition.y + .03 * stonePosition.z);
              vec3 patina = texture2D(stoneSurface, ageUV * .21).rgb;
              diffuseColor.rgb *= .80 + patina * .63;
            `);
        };
      }
    });
    if (!disposed) destination.add(model);
  }

  async function loadSurface(name: string) {
    const texture = own(await new THREE.TextureLoader().loadAsync(`${ASSETS}/junagarh-${name}.webp`));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    return texture;
  }

  function addForecourt(surface: THREE.Texture) {
    const geo = own(new THREE.CircleGeometry(465, 72).rotateX(-Math.PI / 2));
    const material = own(new THREE.MeshStandardMaterial({ color: '#bea283', roughness: 0.95, transparent: true, depthWrite: false }));
    material.onBeforeCompile = (shader) => {
      shader.uniforms.groundSurface = { value: surface };
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 forecourt;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nforecourt = position.xz;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 forecourt;\nuniform sampler2D groundSurface;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          float fan = smoothstep(4.0, 24.0, abs(forecourt.x - 0.16 * forecourt.y));
          float paved = fan * smoothstep(12.0, 60.0, forecourt.y);
          vec3 fine = texture2D(groundSurface, forecourt * .21).rgb;
          vec3 coarse = texture2D(groundSurface, mat2(.37, -.93, .93, .37) * forecourt * .044).rgb;
          diffuseColor.rgb *= .55 + mix(coarse, fine, .64) * .91;
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.82, 0.84, 0.88), (1.0 - paved) * 0.39);
          diffuseColor.a *= 1.0 - smoothstep(155.0, 465.0, length(forecourt));
        `);
    };
    const ground = new THREE.Mesh(geo, material);
    ground.position.y = -0.12;
    ground.receiveShadow = true;
    exterior.add(ground);

    // End the exterior view with a shadowed opening instead of an exposed world horizon.
    const recess = new THREE.Mesh(own(new THREE.PlaneGeometry(5.7, 7.5)),
      own(new THREE.MeshBasicMaterial({ color: '#26201b' })));
    recess.position.set(0, 3.67, -2.3);
    exterior.add(recess);

    const stones = new THREE.InstancedMesh(own(new THREE.IcosahedronGeometry(1, 0)),
      own(new THREE.MeshStandardMaterial({ color: '#998679', roughness: .94 })), 43);
    const pebble = new THREE.Object3D();
    for (let i = 0; i < stones.count; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      pebble.position.set(side * (18 + (i * 23 % 79)), 0.03, 16 + (i * 31 % 156));
      pebble.rotation.set(i * .73, i * .21, i * 1.13);
      pebble.scale.set(.21 + (i % 5) * .11, .10 + (i % 3) * .05, .20 + (i % 4) * .09);
      pebble.updateMatrix();
      stones.setMatrixAt(i, pebble.matrix);
    }
    stones.receiveShadow = true;
    exterior.add(stones);

    // A simplified canopy replaces the dense tree in the street reference study.
    const canopy = new THREE.InstancedMesh(
      own(new THREE.IcosahedronGeometry(1, 2)),
      own(new THREE.MeshStandardMaterial({ color: '#636542', roughness: 0.92 })), 13,
    );
    const branch = new THREE.Object3D();
    for (let i = 0; i < canopy.count; i++) {
      const azimuth = i * 2.4;
      const radius = 2 + (i % 4) * 0.7;
      branch.position.set(-65 + Math.cos(azimuth) * radius, 5.1 + (i % 5) * .69, 4.4 + Math.sin(azimuth) * radius);
      branch.rotation.y = azimuth;
      branch.scale.set(2.65, 1.5 + (i % 3) * .38, 2.45);
      branch.updateMatrix();
      canopy.setMatrixAt(i, branch.matrix);
      canopy.setColorAt(i, new THREE.Color().setHSL(0.19 + (i % 4) * .008, .19, .36 + (i % 3) * .055));
    }
    canopy.castShadow = true;
    const trunk = new THREE.Mesh(own(new THREE.CylinderGeometry(.19, .40, 6.8, 7)),
      own(new THREE.MeshStandardMaterial({ color: '#62513e' })));
    trunk.position.set(-65, 3.4, 4.4);
    exterior.add(canopy, trunk);
  }

  return {
    loadAtlas: () => loadMesh('atlas', atlas),
    loadExterior() {
      request ??= Promise.all([
        loadSurface('ground'),
        loadSurface('stone'),
      ]).then(async ([ground, stone]) => {
        if (disposed) return;
        await loadMesh('exterior', exterior, stone);
        if (disposed) return;
        addForecourt(ground);
        ready = true;
      }).catch((error: unknown) => {
        request = undefined;
        throw error;
      });
      return request;
    },
    get ready() { return ready; },
    update(inAtlas: boolean, distance: number) {
      atlas.visible = inAtlas && !disposed;
      // The cartographic mass is oversized only while viewing the regional map.
      atlas.scale.setScalar(THREE.MathUtils.clamp(distance * 0.00055, 0.001, 0.43));
      exterior.visible = ready && distance < 2.8;
      return exterior.visible && distance < 0.29;
    },
    dispose() {
      disposed = true;
      atlas.removeFromParent();
      exterior.removeFromParent();
      resources.forEach((resource) => resource.dispose());
    },
  };
}
