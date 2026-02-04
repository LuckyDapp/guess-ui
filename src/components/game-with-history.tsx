import { Suspense, useContext, useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Box, Button, TextField, Typography, Chip } from "@mui/material";
import { GameContext } from "../contexts/game-context.tsx";
import { toast } from "react-hot-toast";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { isPositiveNumber } from "../utils/number-utils.ts";
import type { Attempt, ClueType, Clue } from "../types.ts";
import { ERROR_MESSAGES, TOAST_MESSAGES, UI_CONFIG } from "../config";
import { useTransactionWithHistory } from "../hooks/use-transaction-with-history";
import type { AccountUnmappedDetail } from "../contract";
import { useQueryErrorResetter } from "@reactive-dot/react";
import { fetchMaxMaxAttempts, type IndexerGame, type GuessHistoryItem } from "../services/token-indexer";

/** Style commun pour tous les TextField (même rendu fluide que guess-number-value) */
const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderWidth: '1px' },
    '&.Mui-focused fieldset': { borderWidth: '1px' },
  },
};

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
function GuessStatus({ step }: { step: 'submitting' | 'finalizing' | 'syncing' | 'received' }) {
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
          {step === 'syncing' ? '• Waiting for guess results' : '○ Waiting for guess results'}
        </Typography>
        <Typography variant="body2" sx={{ color: step === 'received' ? 'var(--color-primary)' : 'var(--text-secondary)', fontWeight: step === 'received' ? 700 : 500 }}>
          {step === 'received' ? '• Guess received and processed' : '○ Guess received and processed'}
        </Typography>
      </Box>
    </Box>
  );
}

export function MakeGuessWithHistory({ onStartNewGame }: { onStartNewGame?: () => void }) {
  const { game, refreshGuesses, getAttempts, isGameCompleted } = useContext(GameContext);
  const { makeGuessWithHistory } = useTransactionWithHistory();
  const inputNumber = useRef<HTMLInputElement>(null);
  const [hasPendingAttempt, setHasPendingAttempt] = useState(false);
  const [guessStep, setGuessStep] = useState<'submitting' | 'finalizing' | 'syncing' | 'received' | 'idle'>('idle');

  // Check for pending attempts
  useEffect(() => {
    const checkPendingAttempts = () => {
      try {
        const attempts = getAttempts();
        const hasPending = Array.isArray(attempts) && attempts.some(attempt => !attempt.clue);
        setHasPendingAttempt(hasPending);
        if (!hasPending && guessStep === 'syncing') {
          setGuessStep('received');
          setTimeout(() => setGuessStep('idle'), 2000);
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

    if (isGameCompleted && isGameCompleted()) {
      toast.error("🎉 Congratulations! You found the number! The game is complete.");
      return;
    }
    if (game && game.max_attempts != null && game.attempt >= game.max_attempts) {
      toast.error("No attempts left. Start a new game to continue.");
      return;
    }

    setGuessStep('submitting');
    
    const txId = await makeGuessWithHistory(parseInt(guessNumber), () => {
      setGuessStep('syncing');
      refreshGuesses();
      toast.success(TOAST_MESSAGES.TRANSACTION_SUCCESS);
    });

    if (txId) {
      setGuessStep('finalizing');
    } else {
      setGuessStep('idle');
    }
  };

  return (
    <Box sx={{ padding: "16px 24px 0 24px" }} display="flex" justifyContent="center">
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
          (isGameCompleted && isGameCompleted()) ? (
            <Box sx={{ width: '100%', textAlign: 'center', padding: 3 }}>
              <Typography variant="h5" sx={{ color: 'success.main', fontWeight: 'bold', mb: 2 }}>
                🎉 Congratulations!
              </Typography>
              <Typography variant="h6" sx={{ color: 'text.secondary', mb: 3 }}>
                You found the number! The game is complete.
              </Typography>
              {onStartNewGame && (
                <Button 
                  onClick={onStartNewGame}
                  variant="contained"
                  color="primary"
                  size="large"
                  sx={{ 
                    minWidth: '200px',
                    fontWeight: 'bold',
                    fontSize: '1.1rem'
                  }}
                >
                  Start a new game
                </Button>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
              {/* Formulaire de guess */}
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', width: '100%' }}>
                <TextField 
                  inputRef={inputNumber} 
                  id="guess-number-value" 
                  label="Enter your number" 
                  variant="outlined"
                  fullWidth
                  sx={textFieldSx}
                />
                <Button 
                  onClick={handleSubmit} 
                  variant="contained"
                  sx={{ minWidth: '140px' }}
                >
                  Make a guess
                </Button>
              </Box>
            </Box>
          )
        ) : null}
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

  const doStartNewGame = useCallback(async (minNumber: number, maxNumber: number) => {
    setIsCreating(true);
    const txId = await startNewGameWithHistory(minNumber, maxNumber, () => {
      refreshGame();
      setIsCreating(false);
      onGameCreated?.();
      toast.success(TOAST_MESSAGES.TRANSACTION_SUCCESS);
    });
    if (!txId) setIsCreating(false);
  }, [startNewGameWithHistory, refreshGame, onGameCreated]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<AccountUnmappedDetail>).detail;
      if (detail?.type === "start_new_game" && "min" in detail && "max" in detail) {
        doStartNewGame(detail.min, detail.max);
      }
    };
    window.addEventListener("account-mapped", handler);
    return () => window.removeEventListener("account-mapped", handler);
  }, [doStartNewGame]);

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

    await doStartNewGame(parseInt(minNumber), parseInt(maxNumber));
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
            sx={{ flex: 1, ...textFieldSx }}
          />
          <TextField 
            inputRef={refMax} 
            id="new-game-max-value" 
            label="Max" 
            variant="outlined"
            type="number"
            size="small"
            sx={{ flex: 1, ...textFieldSx }}
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
      <Box sx={{ padding: "16px 24px 0 24px" }} display="flex" justifyContent="center">
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
    <Box sx={{ padding: "16px 24px 0 24px" }} display="flex" justifyContent="center">
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
            <TextField 
              inputRef={refMin} 
              id="new-game-min-value" 
              label="Minimum"
              variant="outlined"
              type="number"
              fullWidth
              sx={textFieldSx}
            />
          </div>
          <div className="input-group">
            <TextField 
              inputRef={refMax} 
              id="new-game-max-value" 
              label="Maximum"
              variant="outlined"
              type="number"
              fullWidth
              sx={textFieldSx}
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
  const { game, getAttempts, isGameCompleted, reviveAddress, indexerGameInfo } = useContext(GameContext);
  const [maxMaxAttempts, setMaxMaxAttempts] = useState<number | null>(null);

  const attempts = getAttempts();
  const lastAttempt = attempts.find(a => a.attemptNumber === game.attempt);
  const hasLastAttemptResult = lastAttempt?.clue != null;
  const noAttemptsLeft = game.max_attempts != null && game.attempt >= game.max_attempts;
  const showNoAttemptsLeft = noAttemptsLeft && (game.attempt === 0 || hasLastAttemptResult);

  // Récupérer les données de l'indexer
  const indexerGame: IndexerGame | null = indexerGameInfo?.data?.games?.[0] || null;
  const guessHistory: GuessHistoryItem[] = useMemo(() => {
    return indexerGame?.guessHistory || [];
  }, [indexerGame, indexerGameInfo]);

  useEffect(() => {
    if (reviveAddress) {
      fetchMaxMaxAttempts(reviveAddress.toLowerCase())
        .then(setMaxMaxAttempts)
        .catch((e) => {
          console.error("Failed to fetch maxMaxAttempts:", e);
          setMaxMaxAttempts(null);
        });
    } else {
      setMaxMaxAttempts(null);
    }
  }, [reviveAddress]);

  // Fusionner les tentatives on-chain avec l'historique de l'indexer
  // Utiliser useMemo pour recalculer seulement quand les données changent
  const getAllAttempts = useMemo((): Array<{ attemptNumber: number; guess: number; result: string | null; clue: Clue | undefined }> => {
    const attemptsMap = new Map<number, { attemptNumber: number; guess: number; result: string | null; clue: Clue | undefined }>();
    
    // Priorité 1: Ajouter toutes les tentatives de l'indexer (historique complet)
    // C'est la source de vérité principale pour l'historique
    if (guessHistory.length > 0) {
      guessHistory.forEach((item) => {
        const clue = item.result === "Less" ? { type: "Less" as ClueType, value: undefined } :
                     item.result === "More" ? { type: "More" as ClueType, value: undefined } :
                     item.result === "Found" ? { type: "Found" as ClueType, value: undefined } :
                     item.result === "Pending" ? undefined :
                     undefined;
        attemptsMap.set(item.attemptNumber, {
          attemptNumber: item.attemptNumber,
          guess: item.guess,
          result: item.result,
          clue
        });
      });
    }
    
    // Priorité 2: Ajouter/mettre à jour avec les tentatives on-chain (données les plus récentes)
    // Seulement si on n'a pas déjà cette tentative dans l'indexer, ou si on a un résultat plus récent
    attempts.forEach((attempt) => {
      const existing = attemptsMap.get(attempt.attemptNumber);
      // Mettre à jour si :
      // - On n'a pas cette tentative dans l'indexer, OU
      // - On a un résultat on-chain (clue) qui est plus récent
      if (!existing || (attempt.clue && (!existing.clue || existing.result === "Pending"))) {
        attemptsMap.set(attempt.attemptNumber, {
          attemptNumber: attempt.attemptNumber,
          guess: attempt.guess,
          result: attempt.clue?.type || null,
          clue: attempt.clue
        });
      }
    });
    
    // Si on a des données de l'indexer, les utiliser en priorité
    if (guessHistory.length > 0) {
      return Array.from(attemptsMap.values()).sort((a, b) => a.attemptNumber - b.attemptNumber);
    }
    
    // Sinon, utiliser les tentatives on-chain (fallback)
    return attempts.map(attempt => ({
      attemptNumber: attempt.attemptNumber,
      guess: attempt.guess,
      result: attempt.clue?.type || null,
      clue: attempt.clue
    })).sort((a, b) => a.attemptNumber - b.attemptNumber);
  }, [guessHistory, attempts]);

  const renderAttemptResult = (attemptNumber: number, guess: number, result: string | null, clue: Clue | undefined): string => {
    if (!clue && result !== "Pending") {
      return `Attempt ${attemptNumber} - Waiting for the result for number ${guess}`;
    }
    
    const resultType = clue?.type || result;
    switch (resultType) {
      case "Less":
        return `Attempt ${attemptNumber} - My number is less than ${guess}`;
      case "More":
        return `Attempt ${attemptNumber} - My number is more than ${guess}`;
      case "Found":
        return `Attempt ${attemptNumber} - Congrats, you found the number ${guess}!`;
      case "Pending":
        return `Attempt ${attemptNumber} - Waiting for the result for number ${guess}`;
      default:
        return `Attempt ${attemptNumber} - Guess: ${guess}`;
    }
  };

  return (
    <Box sx={{ padding: "16px 24px 0 24px" }} display="flex" justifyContent="center">
      <div className="content-block fade-in" style={{
        width: '100%',
        maxWidth: `${UI_CONFIG.GAME_MAX_WIDTH}px`,
        padding: '30px',
        borderRadius: 'var(--radius-2xl)'
      }}>
        <div className="game-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <h3>Current Game</h3>
              {maxMaxAttempts != null && (
                <Chip
                  label={`NFT Max: ${maxMaxAttempts}`}
                  size="small"
                  sx={{
                    backgroundColor: "rgba(var(--color-primary-rgb, 212, 175, 55), 0.15)",
                    color: "var(--color-primary)",
                    border: "1px solid rgba(var(--color-primary-rgb, 212, 175, 55), 0.3)",
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>
            {(!isGameCompleted || !isGameCompleted()) && (
              <Button 
                onClick={onStartNewGame}
                variant="outlined"
                color="error"
                size="small"
                className="abandon-game-button"
              >
                Abandon & New Game
              </Button>
            )}
          </div>
          {game.cancelled ? (
            <p className="game-range" style={{ color: 'var(--color-warning)' }}>
              Game cancelled
            </p>
          ) : (
            <p className="game-range">
              Guess the number between <span className="highlight-number">{game.min_number}</span> and <span className="highlight-number">{game.max_number}</span>
              {game.max_attempts != null && (
                <span style={{ marginLeft: 8, opacity: 0.9 }}>
                  (max {game.max_attempts} attempts
                  {game.max_attempts > 0 ? `, ${Math.max(0, game.max_attempts - game.attempt)} left` : ', no attempts left'}
                  )
                </span>
              )}
            </p>
          )}
        </div>
        
        <div className="attempts-history">
          <h4>Attempts History</h4>
          <div className="attempts-list">
            {getAllAttempts.length > 0 ? (
              getAllAttempts.map(attempt => (
                <div key={attempt.attemptNumber} className="attempt-item">
                  <div className="attempt-number">Attempt {attempt.attemptNumber}</div>
                  <div className="attempt-result">
                    {renderAttemptResult(attempt.attemptNumber, attempt.guess, attempt.result, attempt.clue)}
                  </div>
                </div>
              ))
            ) : (
              <div className="attempt-item">
                <div className="attempt-result" style={{ opacity: 0.7 }}>
                  No attempts yet
                </div>
              </div>
            )}
          </div>
        </div>
        
        {!game.cancelled && !noAttemptsLeft && (
          <div className="make-guess-section">
            <MakeGuessWithHistory onStartNewGame={onStartNewGame} />
          </div>
        )}
        {!game.cancelled && noAttemptsLeft && !hasLastAttemptResult && (
          <Box sx={{ p: 2, textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Typography>Waiting for the result of your last guess...</Typography>
          </Box>
        )}
        {!game.cancelled && showNoAttemptsLeft && (
          <Box sx={{ p: 2, textAlign: 'center', color: 'var(--color-warning)' }}>
            <Typography>No attempts left. Start a new game to continue.</Typography>
            {onStartNewGame && (
              <Button onClick={onStartNewGame} variant="contained" size="small" sx={{ mt: 2 }}>
                New Game
              </Button>
            )}
          </Box>
        )}
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


