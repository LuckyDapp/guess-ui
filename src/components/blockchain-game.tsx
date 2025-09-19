import React, { useEffect } from 'react';
import { Game } from "./game.tsx";
import { ThreeBackground } from "./three-background.tsx";

export function BlockchainGame() {
  useEffect(() => {
    const cube = document.querySelector('#background-cube .cube');
    if (!cube) return;
    
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let speed = 1;
    
    const handleMouseMove = (e) => {
      const rect = document.querySelector('#background-cube').getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxDistance = Math.sqrt(rect.width * rect.width + rect.height * rect.height) / 2;
      
      speed = 1 + (1 - Math.min(distance / maxDistance, 1)) * 3;
      
      targetX = (deltaY / rect.height) * 2;
      targetY = (deltaX / rect.width) * 2;
    };
    
    const animate = () => {
      const lerpFactor = 0.1 * speed;
      currentX += (targetX - currentX) * lerpFactor;
      currentY += (targetY - currentY) * lerpFactor;
      
      cube.style.setProperty('--rotateX', `${currentX * 30}deg`);
      cube.style.setProperty('--rotateY', `${currentY * 30}deg`);
      
      requestAnimationFrame(animate);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    animate();
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="container">
      {/* Three.js Background */}
      <ThreeBackground />

      {/* Intro Section */}
      <section className="intro" id="intro">
        <p className="intro-text">
          Find the hidden number in the blockchain
        </p>
      </section>

      {/* Game Section */}
      <section className="game" id="game">
        <div className="game-container">
          <h2>Guess the Number</h2>
          <Game />
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
      
      {/* Background Cube - Fixed position */}
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
    </div>
  );
}