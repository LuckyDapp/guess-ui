import { Suspense, useContext, useRef, useState, useEffect } from "react";
import { Box, Button, TextField, Typography } from "@mui/material";
import { GameContext } from "../contexts/game-context.tsx";
import { toast } from "react-hot-toast";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { isPositiveNumber } from "../utils/number-utils.ts";
import type { Attempt, ClueType } from "../types.ts";
import { ERROR_MESSAGES, TOAST_MESSAGES, UI_CONFIG } from "../constants";
import { MiniGames } from "./mini-games.tsx";
import { useTransactionWithHistory } from "../hooks/use-transaction-with-history";
import { useQueryErrorResetter } from "@reactive-dot/react";

// Loading animation component
function GameCreationLoader({ step }: { step: 'submitting' | 'finalizing' | 'syncing' }) {
  return (
    <Box sx={{ 
      textAlign: 'left', 
      p: 3,
      background: 'linear-gradient(135deg, rgba(100, 181, 246, 0.1) 0%, rgba(33, 150, 243, 0.05) 100%)',
      borderRadius: 'var(--radius-lg)',
      border: '2px solid rgba(100, 181, 246, 0.3)'
    }}>
      <Typography variant="h5" sx={{ 
        color: 'var(--color-primary)', 
        mb: 2,
        fontFamily: 'var(--font-heading)',
        textShadow: '0 0 10px rgba(100, 181, 246, 0.5)'
      }}>
        🎲 Creating Your Game
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minHeight: '96px' }}>
        <Typography variant="body1" sx={{ 
          color: step === 'submitting' ? 'var(--color-primary)' : 'var(--text-secondary)',
          fontWeight: step === 'submitting' ? 700 : 500
        }}>
          {step === 'submitting' ? '• Submitting transaction to create a new game' : '○ Submitting transaction to create a new game'}
        </Typography>
        <Typography variant="body1" sx={{ 
          color: step === 'finalizing' ? 'var(--color-primary)' : 'var(--text-secondary)',
          fontWeight: step === 'finalizing' ? 700 : 500
        }}>
          {step === 'finalizing' ? '• Waiting for blockchain finalization' : '○ Waiting for blockchain finalization'}
        </Typography>
        <Typography variant="body1" sx={{ 
          color: step === 'syncing' ? 'var(--color-primary)' : 'var(--text-secondary)',
          fontWeight: step === 'syncing' ? 700 : 500
        }}>
          {step === 'syncing' ? '• Syncing latest game state' : '○ Syncing latest game state'}
        </Typography>
      </Box>

      <Typography variant="body2" sx={{ 
        color: 'var(--text-secondary)',
        fontStyle: 'italic',
        mt: 2
      }}>
        This may take a few moments...
      </Typography>
    </Box>
  );
}

// Inline status for guess submission
function GuessStatus({ step }: { step: 'submitting' | 'finalizing' | 'syncing' }) {
  return (
    <Box sx={{ 
      textAlign: 'left', 
      p: 2,
      background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(184, 134, 11, 0.05) 100%)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid rgba(212, 175, 55, 0.25)'
    }}>
      <Typography variant="subtitle1" sx={{ 
        color: 'var(--color-primary)', 
        mb: 1,
        fontFamily: 'var(--font-heading)'
      }}>
        🎯 Processing your guess
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minHeight: '72px' }}>
        <Typography variant="body2" sx={{ color: step === 'submitting' ? 'var(--color-primary)' : 'var(--text-secondary)', fontWeight: step === 'submitting' ? 700 : 500 }}>
          {step === 'submitting' ? '• Submitting transaction' : '○ Submitting transaction'}
        </Typography>
        <Typography variant="body2" sx={{ color: step === 'finalizing' ? 'var(--color-primary)' : 'var(--text-secondary)', fontWeight: step === 'finalizing' ? 700 : 500 }}>
          {step === 'finalizing' ? '• Waiting for finalization' : '○ Waiting for finalization'}
        </Typography>
        <Typography variant="body2" sx={{ color: step === 'syncing' ? 'var(--color-primary)' : 'var(--text-secondary)', fontWeight: step === 'syncing' ? 700 : 500 }}>
          {step === 'syncing' ? '• Syncing attempts' : '○ Syncing attempts'}
        </Typography>
      </Box>
    </Box>
  );
}

export function MakeGuessWithHistory() {
  const { refreshGuesses, getAttempts } = useContext(GameContext);
  const { makeGuessWithHistory } = useTransactionWithHistory();
  const inputNumber = useRef<HTMLInputElement>(null);
  const [hasPendingAttempt, setHasPendingAttempt] = useState(false);
  const [guessStep, setGuessStep] = useState<'submitting' | 'finalizing' | 'syncing' | 'idle'>('idle');
  const [showMiniGames, setShowMiniGames] = useState(false);

  // Check for pending attempts
  useEffect(() => {
    const checkPendingAttempts = () => {
      try {
        const attempts = getAttempts();
        const hasPending = Array.isArray(attempts) && attempts.some(attempt => !attempt.clue);
        setHasPendingAttempt(hasPending);
        if (!hasPending && guessStep === 'syncing') {
          setGuessStep('idle');
          // Quand l'attente est terminée, masquer les mini-jeux mais garder l'état
          setShowMiniGames(false);
        }
      } catch (error) {
        console.warn('Error checking pending attempts:', error);
        setHasPendingAttempt(false);
      }
    };

    checkPendingAttempts();
    const interval = setInterval(checkPendingAttempts, 1000);
    return () => clearInterval(interval);
  }, [getAttempts, guessStep]);

  const handleSubmit = async () => {
    const guessNumber = inputNumber.current?.value;

    if (!guessNumber) {
      toast.error(ERROR_MESSAGES.VALIDATION_ERROR);
      return;
    }

    if (!isPositiveNumber(guessNumber)) {
      toast.error(ERROR_MESSAGES.INVALID_NUMBER);
      return;
    }

    console.log("Guess:", guessNumber);
    setGuessStep('submitting');
    
    const txId = await makeGuessWithHistory(parseInt(guessNumber), () => {
      setGuessStep('syncing');
      refreshGuesses();
      toast.success(TOAST_MESSAGES.TRANSACTION_SUCCESS);
    });

    if (txId) {
      setGuessStep('finalizing');
      // Afficher les mini-jeux pendant l'attente
      setShowMiniGames(true);
    } else {
      setGuessStep('idle');
    }
  };

  return (
    <Box sx={{ padding: "50px 40px 0 40px" }} display="flex" justifyContent="center">
      <div className="content-block fade-in" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--spacing-lg)',
        padding: 'var(--spacing-xl)',
        width: '100%',
        maxWidth: `${UI_CONFIG.GUESS_MAX_WIDTH}px`,
        borderRadius: 'var(--radius-2xl)'
      }}>

        {(guessStep !== 'idle' || hasPendingAttempt) && (
          <div style={{ width: '100%' }}>
            <GuessStatus step={guessStep === 'idle' ? 'syncing' : guessStep} />
          </div>
        )}
        
        {(!hasPendingAttempt && guessStep === 'idle') ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
            {/* Formulaire de guess */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', width: '100%' }}>
              <TextField 
                inputRef={inputNumber} 
                id="guess-number-value" 
                label="Enter your number" 
                variant="outlined"
                fullWidth
              />
              <Button 
                onClick={handleSubmit} 
                variant="contained"
                sx={{ minWidth: '140px' }}
              >
                Make a guess
              </Button>
            </Box>
            
            {/* Bouton pour reprendre les mini-jeux */}
            {showMiniGames && (
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Button 
                  onClick={() => setShowMiniGames(true)}
                  variant="outlined"
                  sx={{ 
                    borderColor: 'var(--color-primary)',
                    color: 'var(--color-primary)',
                    '&:hover': {
                      borderColor: 'var(--color-primary)',
                      backgroundColor: 'rgba(100, 181, 246, 0.1)'
                    }
                  }}
                >
                  🎮 Reprendre les mini-jeux
                </Button>
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ width: '100%', textAlign: 'center' }}>
            <MiniGames onComplete={() => {}} />
          </Box>
        )}
        
        {/* Mini-jeux en mode pause/overlay */}
        {showMiniGames && (!hasPendingAttempt && guessStep === 'idle') && (
          <Box sx={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <Box sx={{ 
              backgroundColor: 'var(--background)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative'
            }}>
              <Button
                onClick={() => setShowMiniGames(false)}
                sx={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  minWidth: 'auto',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(244, 67, 54, 0.1)',
                  color: '#f44336',
                  '&:hover': {
                    backgroundColor: 'rgba(244, 67, 54, 0.2)'
                  }
                }}
              >
                ✕
              </Button>
              <MiniGames onComplete={() => setShowMiniGames(false)} />
            </Box>
          </Box>
        )}
      </div>
    </Box>
  );
}

export function NewGameWithHistory({ compact = false, onGameCreated, onBack }: { compact?: boolean; onGameCreated?: () => void; onBack?: () => void }) {
  const { refreshGame } = useContext(GameContext);
  const { startNewGameWithHistory } = useTransactionWithHistory();
  const refMin = useRef<HTMLInputElement>(null);
  const refMax = useRef<HTMLInputElement>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async () => {
    const minNumber = refMin.current?.value;
    const maxNumber = refMax.current?.value;

    if (!minNumber || !maxNumber) {
      toast.error(ERROR_MESSAGES.MIN_MAX_REQUIRED);
      return;
    }

    if (!isPositiveNumber(minNumber) || !isPositiveNumber(maxNumber)) {
      toast.error(ERROR_MESSAGES.INVALID_NUMBER);
      return;
    }

    if (parseInt(minNumber) >= parseInt(maxNumber)) {
      toast.error(ERROR_MESSAGES.MIN_LESS_THAN_MAX);
      return;
    }

    console.log("Start new game:", minNumber, "-", maxNumber);
    setIsCreating(true);
    
    const txId = await startNewGameWithHistory(parseInt(minNumber), parseInt(maxNumber), () => {
      refreshGame();
      setIsCreating(false);
      if (onGameCreated) {
        onGameCreated();
      }
      toast.success(TOAST_MESSAGES.TRANSACTION_SUCCESS);
    });

    if (!txId) {
      setIsCreating(false);
    }
  };

  if (compact) {
    if (isCreating) {
      return (
        <div style={{ width: '100%', maxWidth: '480px' }}>
          <GameCreationLoader step={'submitting'} />
        </div>
      );
    }

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--spacing-lg)',
        padding: 'var(--spacing-lg)',
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', width: '100%', maxWidth: '400px' }}>
          <TextField 
            inputRef={refMin} 
            id="new-game-min-value" 
            label="Min" 
            variant="outlined"
            type="number"
            size="small"
            sx={{ flex: 1 }}
          />
          <TextField 
            inputRef={refMax} 
            id="new-game-max-value" 
            label="Max" 
            variant="outlined"
            type="number"
            size="small"
            sx={{ flex: 1 }}
          />
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            size="small"
            sx={{ minWidth: '120px' }}
          >
            New Game
          </Button>
        </div>
      </div>
    );
  }

  if (isCreating) {
    return (
      <Box sx={{ padding: "50px 40px 0 40px" }} display="flex" justifyContent="center">
        <div className="content-block fade-in" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--spacing-xl)',
          padding: 'var(--spacing-2xl)',
          width: '100%',
          maxWidth: `${UI_CONFIG.GAME_MAX_WIDTH}px`,
          borderRadius: 'var(--radius-2xl)'
        }}>
          <GameCreationLoader step={'submitting'} />
        </div>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: "50px 40px 0 40px" }} display="flex" justifyContent="center">
      <div className="content-block fade-in" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--spacing-xl)',
        padding: 'var(--spacing-2xl)',
        width: '100%',
        maxWidth: `${UI_CONFIG.GAME_MAX_WIDTH}px`,
        borderRadius: 'var(--radius-2xl)',
        position: 'relative'
      }}>
        {onBack && (
          <Button 
            onClick={onBack}
            variant="contained"
            size="small"
            className="back-to-game-button"
            sx={{
              position: 'absolute',
              top: '20px',
              right: '20px',
            }}
          >
            Back to Game
          </Button>
        )}
        <div className="game-header">
          <h3>Start New Game</h3>
        </div>
        <p className="new-game-description">
          Set the range for your number guessing game
        </p>
        <div className="new-game-inputs">
          <div className="input-group">
            <label htmlFor="new-game-min-value">Minimum Number</label>
            <TextField 
              inputRef={refMin} 
              id="new-game-min-value" 
              label="Min" 
              variant="outlined"
              type="number"
              fullWidth
            />
          </div>
          <div className="input-group">
            <label htmlFor="new-game-max-value">Maximum Number</label>
            <TextField 
              inputRef={refMax} 
              id="new-game-max-value" 
              label="Max" 
              variant="outlined"
              type="number"
              fullWidth
            />
          </div>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            size="large"
            sx={{ width: '100%', maxWidth: '300px' }}
          >
            Start New Game
          </Button>
        </div>
      </div>
    </Box>
  );
}

export function UnifiedGameInterfaceWithHistory() {
  const { game, getAttempts } = useContext(GameContext);
  const [showNewGameForm, setShowNewGameForm] = useState(false);

  if (!game) {
    return <NewGameWithHistory />;
  }

  if (showNewGameForm) {
    return (
      <NewGameWithHistory 
        onGameCreated={() => setShowNewGameForm(false)} 
        onBack={() => setShowNewGameForm(false)}
      />
    );
  }

  return <CurrentGameWithAbandonAndHistory onStartNewGame={() => setShowNewGameForm(true)} />;
}

export function CurrentGameWithAbandonAndHistory({ onStartNewGame }: { onStartNewGame: () => void }) {
  const { game, getAttempts } = useContext(GameContext);

  const renderAttemptResult = (attempt: Attempt): string => {
    if (!attempt.clue) {
      return `Attempt ${attempt.attemptNumber} - Waiting for the result for number ${attempt.guess}`;
    }
    
    switch (attempt.clue.type as ClueType) {
      case "Less":
        return `Attempt ${attempt.attemptNumber} - My number is less than ${attempt.guess}`;
      case "More":
        return `Attempt ${attempt.attemptNumber} - My number is more than ${attempt.guess}`;
      case "Found":
        return `Attempt ${attempt.attemptNumber} - Congrats, you found the number ${attempt.guess}!`;
      default:
        return "";
    }
  };

  return (
    <Box sx={{ padding: "50px 40px 0 40px" }} display="flex" justifyContent="center">
      <div className="content-block fade-in" style={{
        width: '100%',
        maxWidth: `${UI_CONFIG.GAME_MAX_WIDTH}px`,
        padding: '30px',
        borderRadius: 'var(--radius-2xl)'
      }}>
        <div className="game-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
            <h3>Current Game</h3>
            <Button 
              onClick={onStartNewGame}
              variant="outlined"
              color="error"
              size="small"
              className="abandon-game-button"
            >
              Abandon & New Game
            </Button>
          </div>
          <p className="game-range">
            Guess the number between <span className="highlight-number">{game.min_number}</span> and <span className="highlight-number">{game.max_number}</span>
          </p>
        </div>
        
        <div className="attempts-history">
          <h4>Attempts History</h4>
          <div className="attempts-list">
            {getAttempts().map(attempt => (
              <div key={attempt.attemptNumber} className="attempt-item">
                <div className="attempt-number">Attempt {attempt.attemptNumber}</div>
                <div className="attempt-result">
                  {renderAttemptResult(attempt)}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="make-guess-section">
          <MakeGuessWithHistory />
        </div>
      </div>
    </Box>
  );
}

export function GameWithHistory() {
  const resetQueryError = useQueryErrorResetter();
  const { game } = useContext(GameContext);
  
  return (
    <div>
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => resetQueryError()}
      >
        <Suspense fallback={<h2>Loading game...</h2>}>
          <UnifiedGameInterfaceWithHistory />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

function ErrorFallback({ resetErrorBoundary }: FallbackProps) {
  return (
    <div className="content-block" style={{
      padding: 'var(--spacing-xl)',
      textAlign: 'center',
      borderRadius: 'var(--radius-2xl)'
    }}>
      <h3>{ERROR_MESSAGES.SOMETHING_WRONG}</h3>
      <p style={{ margin: 'var(--spacing-lg) 0' }}>
        An error occurred while loading the game. Please try again.
      </p>
      <Button 
        onClick={() => resetErrorBoundary()} 
        variant="contained"
        sx={{ marginTop: 'var(--spacing-md)' }}
      >
        Retry
      </Button>
    </div>
  );
}


