import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button } from '@mui/material';

interface MiniGamesProps {
  onComplete?: () => void;
}

export function MiniGames({ onComplete }: MiniGamesProps) {
  const [currentGame, setCurrentGame] = useState<'memory' | 'stars' | null>(null);
  const [score, setScore] = useState(0);

  if (currentGame === 'memory') {
    return <MemoryGame onComplete={() => setCurrentGame(null)} onScore={(points) => setScore(score + points)} />;
  }

  if (currentGame === 'snake') {
    return <SnakeGame onComplete={() => setCurrentGame(null)} onScore={(points) => setScore(score + points)} />;
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
      </Box>
    </Box>
  );
}

// Memory Game Component
function MemoryGame({ onComplete, onScore }: { onComplete: () => void; onScore: (points: number) => void }) {
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

// Snake Game Component
function SnakeGame({ onComplete, onScore }: { onComplete: () => void; onScore: (points: number) => void }) {
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
    if (!gameActive || !gameStarted || isPaused) return;

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
  }, [direction, nextDirection, food, gameActive, gameStarted, isPaused, onScore]);

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
           isPaused ? '⏸️ PAUSED - Click or press SPACE to resume!' : 
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
