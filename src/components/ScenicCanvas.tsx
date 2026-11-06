import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ScenicCanvasProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  onScrollProgress?: (progress: number) => void;
}

export const ScenicCanvas: React.FC<ScenicCanvasProps> = ({
  scrollContainerRef,
  onScrollProgress,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current || !scrollContainerRef.current) return;

    // 1. Scene, Camera, Renderer Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;

    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    camera.position.set(0, 0, 7.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    // Clear existing canvas if any
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }
    containerRef.current.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xfff5ea, 1.2);
    scene.add(ambientLight);

    const sunsetLight = new THREE.DirectionalLight(0xf4b896, 1.8);
    sunsetLight.position.set(-5, 3, 5);
    scene.add(sunsetLight);

    const coralRimLight = new THREE.DirectionalLight(0xe06d53, 1.0);
    coralRimLight.position.set(5, -2, 3);
    scene.add(coralRimLight);

    // Texture Loader
    const textureLoader = new THREE.TextureLoader();

    // 3. Background Landscape Plate (Sunset Lake, Palace Skyline, Water Reflections)
    const bgTexture = textureLoader.load('/assets/act-01-scenic-backdrop-pure.png');
    bgTexture.colorSpace = THREE.SRGBColorSpace;
    bgTexture.minFilter = THREE.LinearFilter;
    bgTexture.magFilter = THREE.LinearFilter;

    // Aspect ratio of landscape image is 1672 / 422 = ~3.96
    const bgAspect = 1672 / 422;
    const bgDistance = 15;
    // Calculate visible height at bgDistance
    const vFov = (camera.fov * Math.PI) / 180;
    const visibleHeightAtDist = 2 * Math.tan(vFov / 2) * (camera.position.z + bgDistance);
    const visibleWidthAtDist = visibleHeightAtDist * aspect;

    // Fit cover: guarantee no empty letterboxing
    let bgH = visibleHeightAtDist;
    let bgW = bgH * bgAspect;
    if (bgW < visibleWidthAtDist) {
      bgW = visibleWidthAtDist;
      bgH = bgW / bgAspect;
    }

    const bgGeometry = new THREE.PlaneGeometry(bgW * 1.05, bgH * 1.05);
    const bgMaterial = new THREE.MeshBasicMaterial({
      map: bgTexture,
      depthWrite: false,
    });
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    bgMesh.position.set(0, 0, -bgDistance);
    scene.add(bgMesh);

    // 3b. Architectural Framing: Sandstone Haveli Archway & Bougainvillea Vines
    const archTexture = textureLoader.load('/assets/haveli_archway.png');
    archTexture.colorSpace = THREE.SRGBColorSpace;
    archTexture.minFilter = THREE.LinearFilter;
    archTexture.magFilter = THREE.LinearFilter;

    const archAspect = 340 / 422;
    const archZ = 0.8;
    const distArch = camera.position.z - archZ;
    const visibleHeightAtArch = 2 * Math.tan(vFov / 2) * distArch;
    const visibleWidthAtArch = visibleHeightAtArch * aspect;

    const archH = visibleHeightAtArch * 1.05;
    const archW = archH * archAspect;
    const archGeometry = new THREE.PlaneGeometry(archW, archH);
    const archMaterial = new THREE.MeshBasicMaterial({
      map: archTexture,
      transparent: true,
      alphaTest: 0.005,
      depthWrite: false,
    });
    const archMesh = new THREE.Mesh(archGeometry, archMaterial);
    archMesh.position.set(-visibleWidthAtArch / 2 + archW / 2, 0, archZ);
    scene.add(archMesh);

    // 4. Portrait Mesh (aditya.png)
    const portraitTexture = textureLoader.load('/assets/aditya.png');
    portraitTexture.colorSpace = THREE.SRGBColorSpace;
    portraitTexture.minFilter = THREE.LinearFilter;
    portraitTexture.magFilter = THREE.LinearFilter;

    // Portrait aspect: 1085 / 1450 = 0.7483
    const pAspect = 1085 / 1450;
    const pHeight = 4.3;
    const pWidth = pHeight * pAspect;

    const portraitGeometry = new THREE.PlaneGeometry(pWidth, pHeight);
    const portraitMaterial = new THREE.MeshBasicMaterial({
      map: portraitTexture,
      transparent: true,
      alphaTest: 0.005,
      depthWrite: false,
    });
    const portraitMesh = new THREE.Mesh(portraitGeometry, portraitMaterial);

    // Initial Stage A Position (Desktop: offset to right; Mobile: centered slightly down)
    const isDesktop = width >= 1024;
    const initialPortraitX = isDesktop ? 2.15 : 0;
    const initialPortraitY = isDesktop ? -0.38 : -0.65;
    const initialPortraitScale = isDesktop ? 0.95 : 0.82;

    portraitMesh.position.set(initialPortraitX, initialPortraitY, 0.5);
    portraitMesh.scale.set(initialPortraitScale, initialPortraitScale, 1);
    scene.add(portraitMesh);

    // 5. Floating Holographic Tech Elements Group
    const floatingGroup = new THREE.Group();
    scene.add(floatingGroup);

    // Tech Element 1: AI Chip
    const aiTexture = textureLoader.load('/assets/floating_ai_chip.png');
    aiTexture.colorSpace = THREE.SRGBColorSpace;
    const aiMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.75, 0.85),
      new THREE.MeshBasicMaterial({
        map: aiTexture,
        transparent: true,
        depthWrite: false,
      })
    );
    aiMesh.position.set(-1.45, 1.3, 0.6);
    floatingGroup.add(aiMesh);

    // Tech Element 2: Code Card
    const codeTexture = textureLoader.load('/assets/floating_code_card.png');
    codeTexture.colorSpace = THREE.SRGBColorSpace;
    const codeMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.85, 0.75),
      new THREE.MeshBasicMaterial({
        map: codeTexture,
        transparent: true,
        depthWrite: false,
      })
    );
    codeMesh.position.set(-1.8, 0.1, 0.6);
    floatingGroup.add(codeMesh);

    // Tech Element 3: Tux Linux Badge
    const tuxTexture = textureLoader.load('/assets/floating_tux_badge.png');
    tuxTexture.colorSpace = THREE.SRGBColorSpace;
    const tuxMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.95, 0.8),
      new THREE.MeshBasicMaterial({
        map: tuxTexture,
        transparent: true,
        depthWrite: false,
      })
    );
    tuxMesh.position.set(1.4, 1.4, 0.6);
    floatingGroup.add(tuxMesh);

    // Tech Element 4: Server Rack Tower
    const serverTexture = textureLoader.load('/assets/floating_server_rack.png');
    serverTexture.colorSpace = THREE.SRGBColorSpace;
    const serverMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.85, 0.95),
      new THREE.MeshBasicMaterial({
        map: serverTexture,
        transparent: true,
        depthWrite: false,
      })
    );
    serverMesh.position.set(1.8, 0.35, 0.6);
    floatingGroup.add(serverMesh);

    // Set floating group relative to initial portrait position
    floatingGroup.position.copy(portraitMesh.position);

    // 6. First Faint Orbital Curve (Stage B start trace)
    const curvePoints: THREE.Vector3[] = [];
    const curveRadiusX = 2.4;
    const curveRadiusY = 1.1;
    const segments = 120;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const x = curveRadiusX * Math.cos(theta);
      const y = curveRadiusY * Math.sin(theta);
      const z = Math.sin(theta * 2) * 0.45;
      curvePoints.push(new THREE.Vector3(x, y, z));
    }
    const curvePath = new THREE.CatmullRomCurve3(curvePoints);
    const ringGeometry = new THREE.TubeGeometry(curvePath, 120, 0.012, 8, true);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xf4b896,
      transparent: true,
      opacity: 0.0, // Hidden in Stage A, drawn in Stage B
      depthWrite: false,
    });
    const firstRingMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    firstRingMesh.position.set(initialPortraitX, initialPortraitY, 0.5);
    firstRingMesh.rotation.x = 0.25;
    firstRingMesh.rotation.z = -0.15;
    scene.add(firstRingMesh);

    // 7. GSAP ScrollTrigger Choreography (Stage A -> Stage B)
    // Scroll progress: 0.0 to 1.0 within the Act 01 container
    const heroTextBlock = document.getElementById('hero-text-block');
    const mainNav = document.getElementById('main-navigation');
    const scrollIndicator = document.getElementById('scroll-indicator');

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: scrollContainerRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.6,
        onUpdate: (self) => {
          onScrollProgress?.(self.progress);
        },
      },
    });

    // Lock timeline total duration to 1.0 so timeline time matches ScrollTrigger progress directly
    timeline.to({}, { duration: 1.0 }, 0);

    // Stage A (0.0 to 0.2): Full initial composition
    // Stage B (0.2 to 0.4): Hero text exits cleanly, portrait translates to center and scales to fit
    timeline
      // 1. Text & Nav Exit (smoothly fades between 0.15 and 0.30)
      .fromTo(
        heroTextBlock,
        { opacity: 1, y: 0 },
        {
          opacity: 0,
          y: -40,
          ease: 'power2.inOut',
          duration: 0.15,
          onComplete: () => {
            if (heroTextBlock) heroTextBlock.style.pointerEvents = 'none';
          },
          onReverseComplete: () => {
            if (heroTextBlock) heroTextBlock.style.pointerEvents = 'auto';
          },
        },
        0.15
      )
      .fromTo(
        mainNav,
        { opacity: 1, y: 0 },
        {
          opacity: 0,
          y: -25,
          ease: 'power2.inOut',
          duration: 0.15,
        },
        0.15
      )
      .fromTo(
        scrollIndicator,
        { opacity: 1 },
        {
          opacity: 0,
          ease: 'power2.inOut',
          duration: 0.12,
        },
        0.15
      )
      // 2. Portrait Centering & Scaling (smooth glide from 0.15 to 0.40)
      .to(
        portraitMesh.position,
        {
          x: 0,
          y: -0.15,
          ease: 'power2.inOut',
          duration: 0.25,
        },
        0.15
      )
      .to(
        portraitMesh.scale,
        {
          x: 1.08,
          y: 1.08,
          ease: 'power2.inOut',
          duration: 0.25,
        },
        0.15
      )
      // 3. Floating Tech Elements move with portrait and expand
      .to(
        floatingGroup.position,
        {
          x: 0,
          y: -0.15,
          ease: 'power2.inOut',
          duration: 0.25,
        },
        0.15
      )
      .to(
        aiMesh.position,
        { x: -1.75, y: 1.5, ease: 'power2.out', duration: 0.25 },
        0.15
      )
      .to(
        codeMesh.position,
        { x: -2.1, y: -0.1, ease: 'power2.out', duration: 0.25 },
        0.15
      )
      .to(
        tuxMesh.position,
        { x: 1.75, y: 1.55, ease: 'power2.out', duration: 0.25 },
        0.15
      )
      .to(
        serverMesh.position,
        { x: 2.1, y: 0.25, ease: 'power2.out', duration: 0.25 },
        0.15
      )
      // 4. First faint orbital ring begins drawing into view (0.20 to 0.40)
      .to(
        firstRingMesh.position,
        {
          x: 0,
          y: -0.15,
          ease: 'power2.inOut',
          duration: 0.20,
        },
        0.20
      )
      .to(
        ringMaterial,
        {
          opacity: 0.45,
          ease: 'power2.out',
          duration: 0.20,
        },
        0.20
      );

    // 8. Animation & Render Loop
    let clock = new THREE.Clock();

    const render = () => {
      const elapsedTime = clock.getElapsedTime();

      // Subtle ambient hover motion on floating tech meshes
      aiMesh.position.y += Math.sin(elapsedTime * 2.0) * 0.0008;
      codeMesh.position.y += Math.sin(elapsedTime * 1.8 + 1.0) * 0.0008;
      tuxMesh.position.y += Math.sin(elapsedTime * 2.2 + 2.0) * 0.0008;
      serverMesh.position.y += Math.sin(elapsedTime * 1.6 + 3.0) * 0.0008;

      // Gentle orbital ring rotation
      firstRingMesh.rotation.z += 0.001;

      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    // 9. Resize Handling
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      const newAspect = newWidth / newHeight;

      camera.aspect = newAspect;
      camera.updateProjectionMatrix();

      renderer.setSize(newWidth, newHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

      // Update responsive landscape size
      const newVisibleH = 2 * Math.tan(vFov / 2) * (camera.position.z + bgDistance);
      const newVisibleW = newVisibleH * newAspect;
      let newBgH = newVisibleH;
      let newBgW = newBgH * bgAspect;
      if (newBgW < newVisibleW) {
        newBgW = newVisibleW;
        newBgH = newBgW / bgAspect;
      }
      bgMesh.geometry.dispose();
      bgMesh.geometry = new THREE.PlaneGeometry(newBgW * 1.05, newBgH * 1.05);

      // Update responsive archway
      const newVisHArch = 2 * Math.tan(vFov / 2) * distArch;
      const newVisWArch = newVisHArch * newAspect;
      const newArchH = newVisHArch * 1.05;
      const newArchW = newArchH * archAspect;
      archMesh.geometry.dispose();
      archMesh.geometry = new THREE.PlaneGeometry(newArchW, newArchH);
      archMesh.position.set(-newVisWArch / 2 + newArchW / 2, 0, archZ);

      ScrollTrigger.refresh();
    };

    window.addEventListener('resize', handleResize);

    // 10. Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      timeline.kill();
      ScrollTrigger.getAll().forEach((t) => t.kill());

      // Dispose Three.js resources
      bgGeometry.dispose();
      bgMaterial.dispose();
      bgTexture.dispose();

      archGeometry.dispose();
      archMaterial.dispose();
      archTexture.dispose();

      portraitGeometry.dispose();
      portraitMaterial.dispose();
      portraitTexture.dispose();

      aiMesh.geometry.dispose();
      (aiMesh.material as THREE.Material).dispose();
      aiTexture.dispose();

      codeMesh.geometry.dispose();
      (codeMesh.material as THREE.Material).dispose();
      codeTexture.dispose();

      tuxMesh.geometry.dispose();
      (tuxMesh.material as THREE.Material).dispose();
      tuxTexture.dispose();

      serverMesh.geometry.dispose();
      (serverMesh.material as THREE.Material).dispose();
      serverTexture.dispose();

      ringGeometry.dispose();
      ringMaterial.dispose();

      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [scrollContainerRef, onScrollProgress]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    />
  );
};
