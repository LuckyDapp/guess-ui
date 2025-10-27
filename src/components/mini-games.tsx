import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button } from '@mui/material';

interface MiniGamesProps {
  onComplete?: () => void;
  externalPaused?: boolean;
}

export function MiniGames({ onComplete, externalPaused = false }: MiniGamesProps) {
  const [currentGame, setCurrentGame] = useState<'memory' | 'snake' | 'invaders' | null>(null);
  const [score, setScore] = useState(0);

  if (currentGame === 'memory') {
    return <MemoryGame onComplete={() => setCurrentGame(null)} onScore={(points) => setScore(score + points)} externalPaused={externalPaused} />;
  }

  if (currentGame === 'snake') {
    return <SnakeGame onComplete={() => setCurrentGame(null)} onScore={(points) => setScore(score + points)} externalPaused={externalPaused} />;
  }

  if (currentGame === 'invaders') {
    return <SpaceInvadersGame onComplete={() => setCurrentGame(null)} onScore={(points) => setScore(score + points)} externalPaused={externalPaused} />;
  }

  return (
    <Box sx={{ textAlign: 'center', p: 3 }}>
      <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 3 }}>
        While waiting, play a mini-game! Score: {score}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          onClick={() => setCurrentGame('memory')}
          sx={{
            background: 'linear-gradient(135deg, #64b5f6, #4caf50)',
            minWidth: '150px'
          }}
        >
          🧠 Memory Game
        </Button>
        <Button
          variant="contained"
          onClick={() => setCurrentGame('snake')}
          sx={{
            background: 'linear-gradient(135deg, #ff9800, #f44336)',
            minWidth: '150px'
          }}
        >
          🐍 Snake Game
        </Button>
        <Button
          variant="contained"
          onClick={() => setCurrentGame('invaders')}
          sx={{
            background: 'linear-gradient(135deg, #7b1fa2, #512da8)',
            minWidth: '150px'
          }}
        >
          👾 Space Invaders
        </Button>
      </Box>
    </Box>
  );
}

// Memory Game Component
function MemoryGame({ onComplete, onScore, externalPaused = false }: { onComplete: () => void; onScore: (points: number) => void; externalPaused?: boolean }) {
  const [cards, setCards] = useState<number[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchedCards, setMatchedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);

  // Initialize game
  useEffect(() => {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = [...numbers, ...numbers].sort(() => Math.random() - 0.5);
    setCards(shuffled);
  }, []);

  // Check if game is complete
  useEffect(() => {
    if (matchedCards.length === cards.length && cards.length > 0) {
      setGameComplete(true);
      onScore(50); // Bonus for completing
    }
  }, [matchedCards.length, cards.length, onScore]);

  const handleCardClick = (index: number) => {
    if (flippedCards.length === 2 || flippedCards.includes(index) || matchedCards.includes(index) || gameComplete) {
      return;
    }

    const newFlippedCards = [...flippedCards, index];
    setFlippedCards(newFlippedCards);

    if (newFlippedCards.length === 2) {
      setMoves(moves + 1);
      const [first, second] = newFlippedCards;
      
      if (cards[first] === cards[second]) {
        setMatchedCards(prev => [...prev, first, second]);
        onScore(10);
        // Clear flipped cards immediately for matched pairs
        setFlippedCards([]);
      } else {
        setTimeout(() => {
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  const resetGame = () => {
    setFlippedCards([]);
    setMatchedCards([]);
    setMoves(0);
    setGameComplete(false);
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = [...numbers, ...numbers].sort(() => Math.random() - 0.5);
    setCards(shuffled);
  };

  return (
    <Box sx={{ 
      textAlign: 'center', 
      p: 2, 
      maxHeight: '400px', 
      overflowY: 'auto',
      '&::-webkit-scrollbar': {
        width: '6px',
      },
      '&::-webkit-scrollbar-thumb': {
        background: 'var(--color-primary)',
        borderRadius: '3px',
      },
      '&::-webkit-scrollbar-track': {
        background: 'rgba(255, 255, 255, 0.1)',
      }
    }}>
      <Typography variant="h6" sx={{ color: 'var(--color-primary)', mb: 2 }}>
        🧠 Memory Game
      </Typography>
      <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 2 }}>
        Moves: {moves} | Matched: {matchedCards.length / 2}/8
      </Typography>
      
      {gameComplete && (
        <Typography variant="h5" sx={{ color: 'var(--color-success)', mb: 2 }}>
          🎉 Congratulations! You completed the memory game!
        </Typography>
      )}
      
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: 1, 
        maxWidth: '300px', 
        margin: '0 auto',
        mb: 2
      }}>
        {cards.map((card, index) => (
          <Box
            key={index}
            onClick={() => handleCardClick(index)}
            sx={{
              width: '60px',
              height: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: flippedCards.includes(index) || matchedCards.includes(index) 
                ? 'var(--color-primary)' 
                : 'rgba(255, 255, 255, 0.1)',
              border: '2px solid var(--color-primary)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1.5rem',
              color: 'white',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'scale(1.05)',
              }
            }}
          >
            {flippedCards.includes(index) || matchedCards.includes(index) ? card : '?'}
          </Box>
        ))}
      </Box>
      
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 2 }}>
        <Button variant="outlined" onClick={resetGame} size="small">
          New Game
        </Button>
        <Button variant="outlined" onClick={onComplete} size="small">
          Back
        </Button>
      </Box>
    </Box>
  );
}

// Space Invaders Game Component
function SpaceInvadersGame({ onComplete, onScore, externalPaused = false }: { onComplete: () => void; onScore: (points: number) => void; externalPaused?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameActive, setGameActive] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Player
  const [playerX, setPlayerX] = useState(200);
  const playerWidth = 30;
  const playerHeight = 12;
  const playerSpeed = 5;

  // Bullets and enemies
  const [bullets, setBullets] = useState<Array<{ x: number; y: number }>>([]);
  const [enemies, setEnemies] = useState<Array<{ x: number; y: number; alive: boolean }>>([]);
  const [enemyDir, setEnemyDir] = useState(1); // 1 -> right, -1 -> left
  const [enemyStepDown, setEnemyStepDown] = useState(false);
  const [lastShotTime, setLastShotTime] = useState(0);

  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 400;

  // Initialize enemies grid
  useEffect(() => {
    const rows = 4;
    const cols = 8;
    const spacingX = 40;
    const spacingY = 30;
    const offsetX = 30;
    const offsetY = 40;
    const initial: Array<{ x: number; y: number; alive: boolean }> = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        initial.push({ x: offsetX + c * spacingX, y: offsetY + r * spacingY, alive: true });
      }
    }
    setEnemies(initial);
  }, []);

  // Setup canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!gameActive) return;
      if (['ArrowLeft', 'ArrowRight', ' ', 'Control'].includes(e.key)) {
        e.preventDefault();
      }

      // Pause/resume on SPACE (same ergonomics as Snake)
      if (e.key === ' ') {
        if (gameStarted && !gameOver) {
          setIsPaused(prev => !prev);
        }
        return;
      }

      // Start on first movement/shoot
      if (!gameStarted) setGameStarted(true);

      if (e.key === 'ArrowLeft') {
        setPlayerX(prev => Math.max(0, prev - playerSpeed * 2));
      } else if (e.key === 'ArrowRight') {
        setPlayerX(prev => Math.min(CANVAS_WIDTH - playerWidth, prev + playerSpeed * 2));
      } else if (e.key === 'Control') {
        // Shoot with cooldown
        const now = Date.now();
        if (now - lastShotTime > 200) { // 200ms cooldown between shots
          setBullets(prev => [...prev, { x: playerX + playerWidth / 2 - 2, y: CANVAS_HEIGHT - 30 }]);
          setLastShotTime(now);
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameActive, gameStarted, gameOver, playerX, lastShotTime]);

  // Mouse click toggles pause (same as Snake)
  useEffect(() => {
    const handleClick = () => {
      if (gameStarted && !gameOver) {
        setIsPaused(prev => !prev);
      }
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [gameStarted, gameOver]);

  // Game loop
  useEffect(() => {
    if (!gameActive || !gameStarted || isPaused || externalPaused) return;

    const interval = setInterval(() => {
      // Move enemies horizontally
      setEnemies(prev => {
        if (prev.length === 0) return prev;
        
        // Check if any enemy would hit the border
        const aliveEnemies = prev.filter(e => e.alive);
        if (aliveEnemies.length === 0) return prev;
        
        let needReverse = false;
        const moved = prev.map(e => {
          if (!e.alive) return e;
          const nx = e.x + enemyDir * 1.2; // enemy speed (slightly slower)
          
          // Check if this enemy would hit the border
          if (nx <= 5 || nx >= CANVAS_WIDTH - 25) {
            needReverse = true;
          }
          
          return { ...e, x: nx };
        });
        
        // If we need to reverse, don't move this frame, just change direction
        if (needReverse) {
          setEnemyDir(d => -d);
          setEnemyStepDown(true);
          return prev; // Don't move this frame
        }
        
        return moved;
      });

      // Step enemies down after reversing (only once per reverse)
      if (enemyStepDown) {
        setEnemies(prev => prev.map(e => ({ ...e, y: e.alive ? e.y + 15 : e.y })));
        setEnemyStepDown(false);
      }

      // Move bullets up
      setBullets(prev => prev
        .map(b => ({ ...b, y: b.y - 6 }))
        .filter(b => b.y > -10)
      );

      // Bullet-enemy collisions
      setEnemies(prevEnemies => {
        let gained = 0;
        const updated = prevEnemies.map(e => {
          if (!e.alive) return e;
          for (const b of bullets) {
            if (b.x >= e.x && b.x <= e.x + 20 && b.y >= e.y && b.y <= e.y + 16) {
              // hit
              gained += 5;
              return { ...e, alive: false };
            }
          }
          return e;
        });
        if (gained > 0) {
          setScore(s => s + gained);
          onScore(gained);
          // remove bullets that hit something
          setBullets(prev => prev.filter(b => !updated.some(e => e.alive === false && b.x >= e.x && b.x <= e.x + 20 && b.y >= e.y && b.y <= e.y + 16)));
        }
        return updated;
      });

      // Check enemy reached bottom or collision with player
      setEnemies(prev => {
        const anyAtBottom = prev.some(e => e.alive && e.y > CANVAS_HEIGHT - 70);
        if (anyAtBottom) {
          setLives(l => l - 1);
          // Reset enemies position when they reach bottom
          const rows = 4;
          const cols = 8;
          const spacingX = 40;
          const spacingY = 30;
          const offsetX = 30;
          const offsetY = 40;
          const reset: Array<{ x: number; y: number; alive: boolean }> = [];
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              reset.push({ x: offsetX + c * spacingX, y: offsetY + r * spacingY, alive: true });
            }
          }
          setEnemyDir(1);
          setEnemyStepDown(false);
          return reset;
        }
        return prev;
      });

    }, 16);

    return () => clearInterval(interval);
  }, [gameActive, gameStarted, isPaused, externalPaused, enemyDir, enemyStepDown, bullets, onScore]);

  // End conditions
  useEffect(() => {
    if (lives <= 0) {
      setGameOver(true);
      setGameActive(false);
    }
  }, [lives]);

  useEffect(() => {
    if (enemies.length > 0 && enemies.every(e => !e.alive)) {
      // Win round: respawn with a bit more challenge
      const rows = 4;
      const cols = 8;
      const spacingX = 40;
      const spacingY = 28;
      const offsetX = 30;
      const offsetY = 40;
      const next: Array<{ x: number; y: number; alive: boolean }> = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          next.push({ x: offsetX + c * spacingX, y: offsetY + r * spacingY, alive: true });
        }
      }
      setEnemies(next);
      setEnemyDir(d => (d > 0 ? 1 : -1));
      setEnemyStepDown(false);
      setLives(l => Math.min(5, l + 1));
    }
  }, [enemies]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Player
    ctx.fillStyle = '#64b5f6';
    const playerY = CANVAS_HEIGHT - 20;
    ctx.fillRect(playerX, playerY - playerHeight, playerWidth, playerHeight);

    // Enemies
    enemies.forEach(e => {
      if (!e.alive) return;
      ctx.fillStyle = '#ffeb3b';
      ctx.fillRect(e.x, e.y, 20, 16);
    });

    // Bullets
    ctx.fillStyle = '#f44336';
    bullets.forEach(b => {
      ctx.fillRect(b.x, b.y, 4, 8);
    });
  }, [playerX, enemies, bullets]);

  const resetGame = () => {
    setScore(0);
    setLives(3);
    setBullets([]);
    setPlayerX(200);
    setGameOver(false);
    setGameActive(true);
    setGameStarted(false);
    setIsPaused(false);
    // reset enemies
    const rows = 4;
    const cols = 8;
    const spacingX = 40;
    const spacingY = 30;
    const offsetX = 30;
    const offsetY = 40;
    const initial: Array<{ x: number; y: number; alive: boolean }> = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        initial.push({ x: offsetX + c * spacingX, y: offsetY + r * spacingY, alive: true });
      }
    }
    setEnemies(initial);
  };

  return (
    <Box sx={{ textAlign: 'center', p: 2 }}>
      <Typography variant="h6" sx={{ color: 'var(--color-primary)', mb: 2 }}>
        👾 Space Invaders
      </Typography>
      <Box sx={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
        <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
          {!gameStarted ? 'Use ← → to move, press Ctrl to shoot' :
           isPaused || externalPaused ? '⏸️ PAUSED - Click or press SPACE to resume!' :
           `Move with ← →, shoot with Ctrl. SPACE/click to pause. Score: ${score} | Lives: ${lives}`}
        </Typography>
      </Box>

      {gameOver && (
        <Typography variant="h5" sx={{ color: 'var(--color-error)', mb: 2 }}>
          Game Over! Final Score: {score}
        </Typography>
      )}

      <Box sx={{ 
        border: '2px solid var(--color-primary)', 
        borderRadius: '8px', 
        display: 'inline-block',
        mb: 2
      }}>
        <canvas
          ref={canvasRef}
          style={{
            display: 'block'
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
        <Button variant="outlined" onClick={resetGame} size="small">
          New Game
        </Button>
        <Button variant="outlined" onClick={onComplete} size="small">
          Back
        </Button>
      </Box>
    </Box>
  );
}

// Snake Game Component
function SnakeGame({ onComplete, onScore, externalPaused = false }: { onComplete: () => void; onScore: (points: number) => void; externalPaused?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameActive, setGameActive] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [direction, setDirection] = useState({ x: 0, y: 0 });
  const [nextDirection, setNextDirection] = useState({ x: 0, y: 0 });
  const [food, setFood] = useState({ x: 15, y: 15 });
  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const gameLoopRef = useRef<number>();

  const GRID_SIZE = 20;
  const CANVAS_SIZE = 400;

  // Generate random food position (not on snake)
  const generateFood = (snakeBody: Array<{x: number, y: number}>) => {
    const gridWidth = CANVAS_SIZE / GRID_SIZE;
    const gridHeight = CANVAS_SIZE / GRID_SIZE;
    
    let newFood;
    do {
      newFood = {
        x: Math.floor(Math.random() * gridWidth),
        y: Math.floor(Math.random() * gridHeight)
      };
    } while (snakeBody.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    
    return newFood;
  };

  // Initialize game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    // Set initial food
    setFood(generateFood([{ x: 10, y: 10 }]));
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!gameActive) return;

      // Prevent default behavior for arrow keys and space to avoid page scrolling
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      // Handle pause with space
      if (e.key === ' ') {
        if (gameStarted && !gameOver) {
          setIsPaused(prev => !prev);
        }
        return;
      }

      // Start the game on first key press
      if (!gameStarted) {
        setGameStarted(true);
      }

      switch (e.key) {
        case 'ArrowUp':
          if (direction.y !== 1) setNextDirection({ x: 0, y: -1 }); // Can't go up if going down
          break;
        case 'ArrowDown':
          if (direction.y !== -1) setNextDirection({ x: 0, y: 1 }); // Can't go down if going up
          break;
        case 'ArrowLeft':
          if (direction.x !== 1) setNextDirection({ x: -1, y: 0 }); // Can't go left if going right
          break;
        case 'ArrowRight':
          if (direction.x !== -1) setNextDirection({ x: 1, y: 0 }); // Can't go right if going left
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [direction, gameActive, gameStarted, gameOver]);

  // Handle mouse click for pause
  useEffect(() => {
    const handleMouseClick = () => {
      if (gameStarted && !gameOver) {
        setIsPaused(prev => !prev);
      }
    };

    window.addEventListener('click', handleMouseClick);
    return () => window.removeEventListener('click', handleMouseClick);
  }, [gameStarted, gameOver]);

  // Game loop
  useEffect(() => {
    if (!gameActive || !gameStarted || isPaused || externalPaused) return;

    const gameLoop = () => {
      setSnake(prevSnake => {
        const newSnake = [...prevSnake];
        const head = { ...newSnake[0] };
        
        // Update direction from nextDirection at the start of each game loop
        setDirection(prevDir => {
          const newDir = nextDirection.x !== 0 || nextDirection.y !== 0 ? nextDirection : prevDir;
          return newDir;
        });
        
        // Use the current direction for movement
        const currentDirection = nextDirection.x !== 0 || nextDirection.y !== 0 ? nextDirection : direction;
        
        // Move head
        head.x += currentDirection.x;
        head.y += currentDirection.y;

        // Check wall collision
        if (head.x < 0 || head.x >= CANVAS_SIZE / GRID_SIZE || 
            head.y < 0 || head.y >= CANVAS_SIZE / GRID_SIZE) {
          setGameOver(true);
          setGameActive(false);
          return prevSnake;
        }

        // Check self collision (only if snake has more than 1 segment)
        if (newSnake.length > 1 && newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
          setGameOver(true);
          setGameActive(false);
          return prevSnake;
        }

        newSnake.unshift(head);

        // Check food collision
        if (head.x === food.x && head.y === food.y) {
          setScore(prev => {
            const newScore = prev + 1;
            onScore(10);
            return newScore;
          });
          setFood(generateFood(newSnake));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    };

    const interval = setInterval(gameLoop, 150);
    return () => clearInterval(interval);
  }, [direction, nextDirection, food, gameActive, gameStarted, isPaused, externalPaused, onScore]);

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw snake
    ctx.fillStyle = '#4caf50';
    snake.forEach((segment, index) => {
      if (index === 0) {
        // Head
        ctx.fillStyle = '#2e7d32';
      } else {
        ctx.fillStyle = '#4caf50';
      }
      ctx.fillRect(segment.x * GRID_SIZE, segment.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2);
    });

    // Draw food
    ctx.fillStyle = '#f44336';
    ctx.fillRect(food.x * GRID_SIZE, food.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2);
  }, [snake, food]);

  const resetGame = () => {
    setScore(0);
    setSnake([{ x: 10, y: 10 }]);
    setDirection({ x: 0, y: 0 });
    setNextDirection({ x: 0, y: 0 });
    setFood(generateFood([{ x: 10, y: 10 }]));
    setGameOver(false);
    setGameActive(true);
    setGameStarted(false);
    setIsPaused(false);
  };

  return (
    <Box sx={{ textAlign: 'center', p: 2 }}>
      <Typography variant="h6" sx={{ color: 'var(--color-primary)', mb: 2 }}>
        🐍 Snake Game
      </Typography>
      <Box sx={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
        <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
          {!gameStarted ? 'Press any arrow key to start!' : 
           isPaused || externalPaused ? '⏸️ PAUSED - Click or press SPACE to resume!' : 
           `Use arrow keys to control the snake! Click or press SPACE to pause. Score: ${score}`}
        </Typography>
      </Box>
      
      {gameOver && (
        <Typography variant="h5" sx={{ color: 'var(--color-error)', mb: 2 }}>
          Game Over! Final Score: {score}
        </Typography>
      )}
      
      <Box sx={{ 
        border: '2px solid var(--color-primary)', 
        borderRadius: '8px', 
        display: 'inline-block',
        mb: 2
      }}>
        <canvas
          ref={canvasRef}
          style={{
            display: 'block'
          }}
        />
      </Box>
      
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
        <Button variant="outlined" onClick={resetGame} size="small">
          New Game
        </Button>
        <Button variant="outlined" onClick={onComplete} size="small">
          Back
        </Button>
      </Box>
    </Box>
  );
}
