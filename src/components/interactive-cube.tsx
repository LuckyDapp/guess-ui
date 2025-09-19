import React, { useEffect, memo } from 'react';

interface InteractiveCubeProps {
  className?: string;
}

export const InteractiveCube: React.FC<InteractiveCubeProps> = memo(({ className = '' }) => {
  useEffect(() => {
    let mouseX = 0;
    let mouseY = 0;
    let isMouseMoving = false;
    let mouseTimeout: NodeJS.Timeout;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (window.innerWidth / 2 - e.pageX) / 25;
      mouseY = (window.innerHeight / 2 - e.pageY) / 25;
      isMouseMoving = true;

      const cube = document.querySelector('.cube') as HTMLElement;
      if (cube) {
        cube.style.setProperty('--rotateX', `${mouseY}deg`);
        cube.style.setProperty('--rotateY', `${mouseX}deg`);
      }

      clearTimeout(mouseTimeout);
      mouseTimeout = setTimeout(() => {
        isMouseMoving = false;
      }, 100);
    };

    const handleMouseEnter = () => {
      const cube = document.querySelector('.cube') as HTMLElement;
      if (cube) {
        cube.style.animationPlayState = 'paused';
      }
    };

    const handleMouseLeave = () => {
      const cube = document.querySelector('.cube') as HTMLElement;
      if (cube) {
        cube.style.animationPlayState = 'running';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
      clearTimeout(mouseTimeout);
    };
  }, []);

  return (
    <div className={`cube-container ${className}`}>
      <div className="cube">
        <div className="face front">
          <img src="/polkadot-new-dot-logo.svg" alt="Polkadot" className="crypto-logo" />
        </div>
        <div className="face back">⟲</div>
        <div className="face right">Ξ</div>
        <div className="face left">◎</div>
        <div className="face top">⛓</div>
        <div className="face bottom">△</div>
      </div>
    </div>
  );
});

InteractiveCube.displayName = 'InteractiveCube';
