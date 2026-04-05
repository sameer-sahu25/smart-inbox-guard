import { useEffect, useRef } from 'react'; 
import * as THREE from 'three'; 

interface SpamDetector3DProps { 
  isScanning: boolean; 
} 

export function SpamDetector3D({ isScanning }: SpamDetector3DProps) { 
  const containerRef = useRef<HTMLDivElement>(null); 
  const sceneRef = useRef<THREE.Scene | null>(null); 
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null); 
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null); 
  const animationFrameRef = useRef<number | null>(null); 
  const particlesRef = useRef<THREE.Points | null>(null); 
  const shieldRef = useRef<THREE.Mesh | null>(null); 

  useEffect(() => { 
    if (!containerRef.current) return; 

    // Scene setup 
    const scene = new THREE.Scene(); 
    // Transparent background to show website content
    sceneRef.current = scene; 

    // Camera setup 
    const camera = new THREE.PerspectiveCamera( 
      75, 
      containerRef.current.clientWidth / containerRef.current.clientHeight, 
      0.1, 
      1000 
    ); 
    camera.position.z = 5; 
    cameraRef.current = camera; 

    // Renderer setup 
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance"
    }); 
    
    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || 600;
    
    renderer.setSize(width, height); 
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); 
    renderer.domElement.style.display = 'block'; 
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    containerRef.current.appendChild(renderer.domElement); 
    rendererRef.current = renderer; 

    // Create particle system
    const particlesGeometry = new THREE.BufferGeometry(); 
    const particleCount = 8000; 
    const positions = new Float32Array(particleCount * 3); 
    const colors = new Float32Array(particleCount * 3); 

    for (let i = 0; i < particleCount; i++) { 
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 15; 
      positions[i3 + 1] = (Math.random() - 0.5) * 15; 
      positions[i3 + 2] = (Math.random() - 0.5) * 15; 

      const isSpam = Math.random() > 0.7; 
      colors[i3] = isSpam ? 1 : 0.2; 
      colors[i3 + 1] = isSpam ? 0.2 : 1; 
      colors[i3 + 2] = isSpam ? 0.2 : 1; 
    } 

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); 
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); 

    const particlesMaterial = new THREE.PointsMaterial({ 
      size: 0.15, 
      vertexColors: true, 
      transparent: true, 
      opacity: 0.9, 
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    }); 

    const particles = new THREE.Points(particlesGeometry, particlesMaterial); 
    scene.add(particles); 
    particlesRef.current = particles; 

    // Create shield 
    const shieldGeometry = new THREE.SphereGeometry(3.5, 64, 64); 
    const shieldMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x00ffff, 
      transparent: true, 
      opacity: 0.2, 
      wireframe: true,
      emissive: 0x00ffff,
      emissiveIntensity: 0.5
    }); 
    const shield = new THREE.Mesh(shieldGeometry, shieldMaterial); 
    scene.add(shield); 
    shieldRef.current = shield; 

    // Add lights 
    const ambientLight = new THREE.AmbientLight(0xffffff, 1); 
    scene.add(ambientLight); 

    const pointLight = new THREE.PointLight(0x00ffff, 5); 
    pointLight.position.set(5, 5, 5); 
    scene.add(pointLight); 

    const pointLight2 = new THREE.PointLight(0xff00ff, 5); 
    pointLight2.position.set(-5, -5, 5); 
    scene.add(pointLight2); 

    // Animation loop 
    const animate = () => { 
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
      
      animationFrameRef.current = requestAnimationFrame(animate); 

      const time = Date.now() * 0.001;

      if (particlesRef.current) { 
        particlesRef.current.rotation.y = time * 0.1; 
        particlesRef.current.rotation.x = time * 0.05; 
      } 

      if (shieldRef.current) { 
        shieldRef.current.rotation.y = time * 0.2; 
        
        if (isScanning) { 
          const pulse = 1 + Math.sin(time * 10) * 0.1; 
          shieldRef.current.scale.set(pulse, pulse, pulse); 
          const material = shieldRef.current.material as THREE.MeshPhongMaterial; 
          material.opacity = 0.3 + Math.sin(time * 10) * 0.1; 
          material.color.setHex(0xff00ff);
          material.emissive.setHex(0xff00ff);
        } else {
          shieldRef.current.scale.set(1, 1, 1);
          const material = shieldRef.current.material as THREE.MeshPhongMaterial; 
          material.opacity = 0.15;
          material.color.setHex(0x00ffff);
          material.emissive.setHex(0x00ffff);
        }
      } 

      rendererRef.current.render(sceneRef.current, cameraRef.current); 
    }; 

    animate(); 

    // Handle window resize 
    const handleResize = () => { 
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return; 

      const width = containerRef.current.clientWidth || window.innerWidth; 
      const height = containerRef.current.clientHeight || 600; 

      cameraRef.current.aspect = width / height; 
      cameraRef.current.updateProjectionMatrix(); 
      rendererRef.current.setSize(width, height); 
    }; 

    window.addEventListener('resize', handleResize); 
    setTimeout(handleResize, 100); // Delayed check to ensure container has size

    // Cleanup 
    return () => { 
      window.removeEventListener('resize', handleResize); 
      if (animationFrameRef.current) { 
        cancelAnimationFrame(animationFrameRef.current); 
      } 
      if (rendererRef.current && containerRef.current) { 
        if (containerRef.current.contains(rendererRef.current.domElement)) {
          containerRef.current.removeChild(rendererRef.current.domElement); 
        }
        rendererRef.current.dispose(); 
      } 
    }; 
  }, [isScanning]); 

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 pointer-events-none" 
      style={{ 
        width: '100vw',
        height: '100vh',
        zIndex: -1, // Behind everything
        opacity: 0.6 
      }} 
    />
  );
} 
