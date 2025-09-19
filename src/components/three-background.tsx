import React, { useEffect, useRef, memo } from 'react';
import * as THREE from 'three';
import { THREE_CONFIG } from '../constants';

interface ThreeBackgroundProps {
  className?: string;
}

export const ThreeBackground: React.FC<ThreeBackgroundProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const isInitializedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current) return;

    // Clear any existing content
    containerRef.current.innerHTML = '';
    
    // Mark as initialized
    isInitializedRef.current = true;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      THREE_CONFIG.CAMERA_FOV, 
      window.innerWidth / window.innerHeight, 
      THREE_CONFIG.CAMERA_NEAR, 
      THREE_CONFIG.CAMERA_FAR
    );
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true,
      antialias: true
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // Create particles
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(THREE_CONFIG.PARTICLE_COUNT * 3);
    const colors = new Float32Array(THREE_CONFIG.PARTICLE_COUNT * 3);

    for (let i = 0; i < THREE_CONFIG.PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

      colors[i * 3] = 0.8; // R
      colors[i * 3 + 1] = 0.6; // G
      colors[i * 3 + 2] = 0.2; // B (gold-like)
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: THREE_CONFIG.PARTICLE_SIZE,
      vertexColors: true,
      transparent: true,
      opacity: THREE_CONFIG.PARTICLE_OPACITY
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    camera.position.z = THREE_CONFIG.CAMERA_POSITION_Z;

    // Store references
    sceneRef.current = scene;
    rendererRef.current = renderer;
    particlesRef.current = particles;

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      // Rotate particles
      if (particles) {
        particles.rotation.x += THREE_CONFIG.ROTATION_SPEED_X;
        particles.rotation.y += THREE_CONFIG.ROTATION_SPEED_Y;
      }
      
      // Render the scene
      renderer.render(scene, camera);
    };

    // Start animation
    animate();
    
    // Store animation ID for cleanup
    animationIdRef.current = animationId;
    
    console.log('Three.js background initialized and animation started');

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      
      // Cancel animation
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      // Remove canvas from DOM
      if (containerRef.current && renderer.domElement) {
        try {
          containerRef.current.removeChild(renderer.domElement);
        } catch (e) {
          console.warn('Canvas already removed');
        }
      }
      
      // Dispose of Three.js objects
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      
      // Clear references
      sceneRef.current = null;
      rendererRef.current = null;
      particlesRef.current = null;
      animationIdRef.current = null;
      isInitializedRef.current = false;
    };
  }, []);

  return <div id="threejs-bg" ref={containerRef} className={className} />;
};
