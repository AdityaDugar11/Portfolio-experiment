import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface OrbitalCanvasProps {
  ringOpacityRef: React.MutableRefObject<number>;
}

export const OrbitalCanvas: React.FC<OrbitalCanvasProps> = ({ ringOpacityRef }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Scene, Camera, Transparent WebGL Renderer Setup
    const scene = new THREE.Scene();

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
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    renderer.setClearColor(0x000000, 0); // 100% transparent canvas

    // Mount canvas
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }
    containerRef.current.appendChild(renderer.domElement);

    // 2. Lighting (warm sunset glow)
    const ambientLight = new THREE.AmbientLight(0xfff5ea, 1.0);
    scene.add(ambientLight);

    // 3. First Faint Orbital Curve (Stage B start trace at 40% scroll)
    const curvePoints: THREE.Vector3[] = [];
    const curveRadiusX = 2.4;
    const curveRadiusY = 1.15;
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const x = curveRadiusX * Math.cos(theta);
      const y = curveRadiusY * Math.sin(theta);
      const z = Math.sin(theta * 2) * 0.45;
      curvePoints.push(new THREE.Vector3(x, y, z));
    }
    const curvePath = new THREE.CatmullRomCurve3(curvePoints);
    const ringGeometry = new THREE.TubeGeometry(curvePath, 128, 0.012, 8, true);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xf4b896,
      transparent: true,
      opacity: 0.0, // Managed by scroll timeline via ringOpacityRef
      depthWrite: false,
    });
    const firstRingMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    firstRingMesh.position.set(0, -0.15, 0.5);
    firstRingMesh.rotation.x = 0.25;
    firstRingMesh.rotation.z = -0.15;
    scene.add(firstRingMesh);

    // Small glowing connection nodes on the curve
    const nodeGeometry = new THREE.SphereGeometry(0.045, 16, 16);
    const nodeMaterial = new THREE.MeshBasicMaterial({
      color: 0xe06d53,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    const node1 = new THREE.Mesh(nodeGeometry, nodeMaterial);
    const node2 = new THREE.Mesh(nodeGeometry, nodeMaterial);
    scene.add(node1);
    scene.add(node2);

    // 4. Animation & Render Loop
    let clock = new THREE.Clock();

    const render = () => {
      const elapsedTime = clock.getElapsedTime();

      // Read current opacity from ref driven by GSAP timeline
      const currentOpacity = ringOpacityRef.current;
      ringMaterial.opacity = currentOpacity;
      nodeMaterial.opacity = currentOpacity * 1.5;

      // Gentle orbital rotation
      firstRingMesh.rotation.z = -0.15 + elapsedTime * 0.04;
      firstRingMesh.rotation.y = Math.sin(elapsedTime * 0.3) * 0.08;

      // Travelling nodes along the path
      if (currentOpacity > 0.01) {
        const t1 = (elapsedTime * 0.06) % 1.0;
        const t2 = (elapsedTime * 0.06 + 0.5) % 1.0;
        const pt1 = curvePath.getPointAt(t1);
        const pt2 = curvePath.getPointAt(t2);
        node1.position.copy(pt1).add(firstRingMesh.position);
        node2.position.copy(pt2).add(firstRingMesh.position);
      }

      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    // 5. Window Resize Handler
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      const newAspect = newWidth / newHeight;

      camera.aspect = newAspect;
      camera.updateProjectionMatrix();

      renderer.setSize(newWidth, newHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    };

    window.addEventListener('resize', handleResize);

    // 6. Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      ringGeometry.dispose();
      ringMaterial.dispose();
      nodeGeometry.dispose();
      nodeMaterial.dispose();
      renderer.dispose();

      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [ringOpacityRef]);

  return (
    <div
      ref={containerRef}
      id="orbital-canvas-layer"
      className="fixed inset-0 z-25 pointer-events-none overflow-hidden"
      aria-hidden="true"
    />
  );
};
