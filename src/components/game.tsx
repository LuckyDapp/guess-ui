import { Suspense, useContext, useRef, useState, useEffect } from "react";
import { Box, Button, TextField, Typography } from "@mui/material";
import { GameContext } from "../contexts/game-context.tsx";
import { getContractAddress, gtnContract } from "../config.ts";
import { toast } from "react-hot-toast";
import { useContractMutation, useMutationEffect, useQueryErrorResetter, useChainId } from "@reactive-dot/react";
import { MutationError, pending } from "@reactive-dot/core";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import type { MutationEvent } from "@reactive-dot/react/src/contexts/mutation.tsx";
import { isPositiveNumber } from "../utils/number-utils.ts";
import type { Attempt, ClueType } from "../types.ts";
import { ERROR_MESSAGES, TOAST_MESSAGES, UI_CONFIG } from "../constants";
import { MiniGames } from "./mini-games.tsx";

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


export function MakeGuess() {
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId);
  const { refreshGuesses, getAttempts } = useContext(GameContext);
  const inputNumber = useRef<HTMLInputElement>(null);
  const [hasPendingAttempt, setHasPendingAttempt] = useState(false);
  const [guessStep, setGuessStep] = useState<'submitting' | 'finalizing' | 'syncing' | 'idle'>('idle');

  const [_, makeGuess] = useContractMutation((mutate) =>
    mutate(gtnContract, contractAddress, "guess", {
      data: { "guess": inputNumber.current?.value },
    }),
  );

  // Check for pending attempts
  useEffect(() => {
    const checkPendingAttempts = () => {
      try {
        const attempts = getAttempts();
        const hasPending = Array.isArray(attempts) && attempts.some(attempt => !attempt.clue);
        setHasPendingAttempt(hasPending);
        if (!hasPending && guessStep === 'syncing') {
          setGuessStep('idle');
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
    makeGuess();
  };

  // Local mutation listener to drive in-block status + refresh
  useMutationEffect((event: MutationEvent) => {
    if (event.value === pending) {
      setGuessStep('submitting');
      toast.loading(TOAST_MESSAGES.TRANSACTION_LOADING, { id: event.id });
      return;
    }

    if (event.value instanceof MutationError) {
      toast.error(TOAST_MESSAGES.TRANSACTION_ERROR, { id: event.id });
      setGuessStep('idle');
      return;
    }

    switch (event.value.type) {
      case 'finalized':
        if (event.value.ok) {
          toast.success(`${TOAST_MESSAGES.TRANSACTION_SUCCESS}: ${event.value.txHash}`, { id: event.id });
          setGuessStep('syncing');
          refreshGuesses();
        } else {
          toast.error(`${TOAST_MESSAGES.TRANSACTION_ERROR}: ${event.value?.dispatchError?.value?.value?.type}`, { id: event.id });
          setGuessStep('idle');
        }
        break;
      default:
        setGuessStep('finalizing');
        toast.loading(TOAST_MESSAGES.TRANSACTION_LOADING, { id: event.id });
    }
  });

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
        <h4>Make Your Guess</h4>

        {(guessStep !== 'idle' || hasPendingAttempt) && (
          <div style={{ width: '100%' }}>
            <GuessStatus step={guessStep === 'idle' ? 'syncing' : guessStep} />
          </div>
        )}
        
        {(!hasPendingAttempt && guessStep === 'idle') ? (
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
        ) : (
          <Box sx={{ width: '100%', textAlign: 'center' }}>
            <MiniGames onComplete={() => {}} />
          </Box>
        )}
      </div>
    </Box>
  );
}


export function NewGame({ compact = false, onGameCreated }: { compact?: boolean; onGameCreated?: () => void }) {
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId);
  const { refreshGame } = useContext(GameContext);
  const refMin = useRef<HTMLInputElement>(null);
  const refMax = useRef<HTMLInputElement>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [__, newGame] = useContractMutation((mutate) =>
    mutate(gtnContract, contractAddress, "start_new_game", {
      data: { 
        "min_number": refMin.current?.value, 
        "max_number": refMax.current?.value 
      },
    }),
  );

  useMutationEffect(onMutationEvent(() => {
    refreshGame();
    setIsCreating(false);
    if (onGameCreated) {
      onGameCreated();
    }
  }));

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
    newGame();
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
        borderRadius: 'var(--radius-2xl)'
      }}>
        <h3>Start New Game</h3>
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

function onMutationEvent(callback: () => void): (event: MutationEvent) => void {
  return (event: MutationEvent) => {
    if (event.value === pending) {
      toast.loading(TOAST_MESSAGES.TRANSACTION_LOADING, { id: event.id });
      return;
    }
    
    if (event.value instanceof MutationError) {
      toast.error(TOAST_MESSAGES.TRANSACTION_ERROR, { id: event.id });
      return;
    }
    
    switch (event.value.type) {
      case "finalized":
        if (event.value.ok) {
          toast.success(`${TOAST_MESSAGES.TRANSACTION_SUCCESS}: ${event.value.txHash}`, { id: event.id });
          callback();
        } else {
          console.error("Transaction failed:", event);
          toast.error(`${TOAST_MESSAGES.TRANSACTION_ERROR}: ${event.value?.dispatchError?.value?.value?.type}`, { id: event.id });
        }
        break;
      default:
        toast.loading(TOAST_MESSAGES.TRANSACTION_LOADING, { id: event.id });
    }
  };
}

export function UnifiedGameInterface() {
  const { game, getAttempts } = useContext(GameContext);
  const [showNewGameForm, setShowNewGameForm] = useState(false);

  if (!game) {
    return <NewGame />;
  }

  if (showNewGameForm) {
    return (
      <div>
        <NewGame onGameCreated={() => setShowNewGameForm(false)} />
        <div style={{ textAlign: 'center', marginTop: 'var(--spacing-lg)' }}>
          <Button 
            onClick={() => setShowNewGameForm(false)}
            variant="outlined"
            color="secondary"
          >
            ← Back to Current Game
          </Button>
        </div>
      </div>
    );
  }

  return <CurrentGameWithAbandon onStartNewGame={() => setShowNewGameForm(true)} />;
}

export function CurrentGameWithAbandon({ onStartNewGame }: { onStartNewGame: () => void }) {
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
          <MakeGuess />
        </div>
      </div>
    </Box>
  );
}

export function Game() {
  const resetQueryError = useQueryErrorResetter();
  const { game } = useContext(GameContext);
  
  return (
    <div>
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => resetQueryError()}
      >
        <Suspense fallback={<h2>Loading game...</h2>}>
          <UnifiedGameInterface />
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