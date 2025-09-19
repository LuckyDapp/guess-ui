import React, { useEffect, useRef, useState } from 'react';

interface InteractiveCubeAdvancedProps {
  className?: string;
}

export const InteractiveCubeAdvanced: React.FC<InteractiveCubeAdvancedProps> = ({ className = '' }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const animationRef = useRef<number | null>(null);
  const rotationRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef({ x: 0, y: 0 });
  const speedRef = useRef(1);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = document.querySelector('.advanced-cube-container')?.getBoundingClientRect();
      if (!rect) return;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const mouseX = e.clientX - centerX;
      const mouseY = e.clientY - centerY;
      
      // Calculate distance from center
      const distance = Math.sqrt(mouseX * mouseX + mouseY * mouseY);
      const maxDistance = Math.sqrt(rect.width * rect.width + rect.height * rect.height) / 2;
      
      // Calculate speed based on distance (closer = faster)
      const normalizedDistance = Math.min(distance / maxDistance, 1);
      speedRef.current = 1 + (1 - normalizedDistance) * 3; // Speed between 1x and 4x
      
      setMousePosition({ x: mouseX, y: mouseY });
      
      // Calculate target rotation based on mouse position
      targetRotationRef.current = {
        x: (mouseY / rect.height) * 2, // -1 to 1
        y: (mouseX / rect.width) * 2   // -1 to 1
      };
    };

    const handleMouseEnter = () => {
      setIsHovering(true);
    };

    const handleMouseLeave = () => {
      setIsHovering(false);
      speedRef.current = 1;
      targetRotationRef.current = { x: 0, y: 0 };
    };

    // Animation loop
    const animate = () => {
      const cube = document.querySelector('.advanced-cube') as HTMLElement;
      if (!cube) return;

      // Smooth interpolation towards target rotation
      const lerpFactor = 0.1 * speedRef.current;
      rotationRef.current.x += (targetRotationRef.current.x - rotationRef.current.x) * lerpFactor;
      rotationRef.current.y += (targetRotationRef.current.y - rotationRef.current.y) * lerpFactor;

      // Apply rotation
      cube.style.setProperty('--rotateX', `${rotationRef.current.x * 30}deg`);
      cube.style.setProperty('--rotateY', `${rotationRef.current.y * 30}deg`);

      // Continue animation
      animationRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animate();

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className={`cube-container advanced-cube-container ${className}`}>
      <div className="cube advanced-cube">
        <div className="face front">
          <img src="/polkadot-new-dot-logo.svg" alt="Polkadot" className="crypto-logo" />
        </div>
        <div className="face back">⟲</div>
        <div className="face right">Ξ</div>
        <div className="face left">◎</div>
        <div className="face top">⛓</div>
        <div className="face bottom">△</div>
      </div>
      
      {/* Speed indicator */}
      {isHovering && (
        <div className="speed-indicator">
          <div className="speed-bar">
            <div 
              className="speed-fill" 
              style={{ 
                width: `${Math.min(speedRef.current * 25, 100)}%`,
                backgroundColor: speedRef.current > 2 ? '#ff6b6b' : speedRef.current > 1.5 ? '#ffa726' : '#4caf50'
              }}
            />
          </div>
          <span className="speed-text">
            Speed: {speedRef.current.toFixed(1)}x
          </span>
        </div>
      )}
    </div>
  );
};
