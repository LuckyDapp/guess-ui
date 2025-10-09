import React, { useEffect } from 'react';
import { Game } from "./game.tsx";
import { GameWithHistory } from "./game-with-history.tsx";
import { ThreeBackground } from "./three-background.tsx";

export function BlockchainGame() {
  const useHistoryTracking = true; // Toujours actif

  useEffect(() => {
    const cube = document.querySelector('#background-cube .cube');
    if (!cube) return;
    
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let speed = 1;
    
    const handleMouseMove = (e) => {
      // Use the entire viewport for mouse tracking since cube is now smaller
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxDistance = Math.sqrt(window.innerWidth * window.innerWidth + window.innerHeight * window.innerHeight) / 2;
      
      speed = 1 + (1 - Math.min(distance / maxDistance, 1)) * 3;
      
      // Increased rotation intensity for more movement (fixed inverted Y)
      targetX = (-deltaY / window.innerHeight) * 2.5;
      targetY = (deltaX / window.innerWidth) * 2.5;
    };
    
    const animate = () => {
      const lerpFactor = 0.12 * speed;
      currentX += (targetX - currentX) * lerpFactor;
      currentY += (targetY - currentY) * lerpFactor;
      
      cube.style.setProperty('--rotateX', `${currentX * 25}deg`);
      cube.style.setProperty('--rotateY', `${currentY * 25}deg`);
      
      requestAnimationFrame(animate);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    animate();
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);


  return (
    <div className="container" style={{ 
      minHeight: '100%', 
      overflow: 'visible',
      position: 'relative',
      zIndex: 1
    }}>
      {/* Bouton de contrôle */}

      {/* Three.js Background */}
      <ThreeBackground />


      {/* Game Section */}
      <section className="game" id="game">
        <div className="game-container">
          <div className="title-with-cube">
            {/* Background Cube - Positioned to the left of title */}
            <div id="background-cube">
              <div className="cube-container">
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
              </div>
            </div>
            <h2>Guess the Number</h2>
          </div>
          {useHistoryTracking ? <GameWithHistory /> : <Game />}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="powered-by-polkadot">
          <span className="powered-by-text">Powered by</span>
          <img className="polkadot-logo-footer" src="/polkadot-logo-with-text.svg" alt="Polkadot" />
        </div>
        <p>
          2025
          <img src="/lucky-logo-transparent.png" alt="Lucky" className="lucky-logo-inline" />
          Lucky Team - All transactions immutable
        </p>
      </footer>
      
    </div>
  );
}