import {Suspense, useContext, useRef, useState} from "react";
import {Box, Button, TextField, Typography} from "@mui/material";
import {GameContext} from "../contexts/game-context.tsx";
import {GameIntro} from "./game-intro.tsx";
import {BlockchainLoader} from "./blockchain-loader.tsx";
import {getContractAddress, gtnContract} from "../config.ts";
import {toast} from "react-hot-toast";
import {useContractMutation, useMutationEffect, useQueryErrorResetter, useChainId} from "@reactive-dot/react";
import {MutationError, pending} from "@reactive-dot/core";
import {ErrorBoundary, type FallbackProps} from "react-error-boundary";
import {isPositiveNumber} from "../utils/number-utils.ts";
import {useTransactionContext} from "./transaction-provider.tsx";
import {GameLoadingState, AttemptsLoadingState} from "./skeleton-loader.tsx";
import {InteractiveButton, useInteractionFeedback} from "./interaction-feedback.tsx";


export function CurrentGame() {

    const { game, getAttempts} = useContext(GameContext);

    if (game == undefined){
        return (
            <Box sx={{
                padding: { xs: "30px 20px 0", sm: "50px 40px 0" },
                display: 'flex',
                justifyContent: 'center'
            }}>
                <div className="content-block fade-in" style={{
                    padding: '40px',
                    textAlign: 'center',
                    borderRadius: '20px'
                }}>
                    <Typography variant="h6" sx={{ color: '#b0b0b0', mb: 2 }}>
                        No Active Game
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#888' }}>
                        Start a new game to begin playing!
                    </Typography>
                </div>
            </Box>
        );
    }

    const attempts = getAttempts();

    return (
        <Box sx={{
            padding: { xs: "30px 20px 0", sm: "50px 40px 0" },
            display: 'flex',
            justifyContent: 'center'
        }}>
            <div className="content-block fade-in" style={{
                width: '100%',
                maxWidth: '700px',
                padding: '30px',
                borderRadius: '20px'
            }}>
                {/* Game Header */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Typography
                        variant="h5"
                        sx={{
                            color: '#64b5f6',
                            fontWeight: 600,
                            mb: 1
                        }}
                    >
                        🎯 Guess the Number
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#b0b0b0' }}>
                        Find the secret number between <span style={{ color: '#64b5f6', fontWeight: 600 }}>{game?.min_number}</span> and <span style={{ color: '#64b5f6', fontWeight: 600 }}>{game?.max_number}</span>
                    </Typography>
                </Box>

                {/* Attempts History */}
                {attempts.length > 0 && (
                    <Box sx={{ mb: 4 }}>
                        <Typography
                            variant="h6"
                            sx={{
                                color: 'white',
                                mb: 2,
                                fontWeight: 600
                            }}
                        >
                            Your Attempts ({attempts.length})
                        </Typography>
                        <Box sx={{
                            maxHeight: '300px',
                            overflowY: 'auto',
                            '&::-webkit-scrollbar': {
                                width: '6px'
                            },
                            '&::-webkit-scrollbar-thumb': {
                                backgroundColor: 'rgba(100, 181, 246, 0.3)',
                                borderRadius: '3px'
                            }
                        }}>
                            {attempts.map(attempt => (
                                <Box
                                    key={attempt.attemptNumber}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        p: 2,
                                        mb: 1,
                                        borderRadius: '12px',
                                        background: attempt.clue == undefined
                                            ? 'rgba(255, 152, 0, 0.1)'
                                            : (attempt.clue as any)?.type == "Found"
                                                ? 'rgba(76, 175, 80, 0.1)'
                                                : 'rgba(32, 33, 37, 0.5)',
                                        border: attempt.clue == undefined
                                            ? '1px solid rgba(255, 152, 0, 0.3)'
                                            : (attempt.clue as any)?.type == "Found"
                                                ? '1px solid rgba(76, 175, 80, 0.3)'
                                                : '1px solid rgba(255, 255, 255, 0.1)'
                                    }}
                                >
                                    {(() => {
                                        if (attempt.clue == undefined){
                                            return (
                                                <>
                                                    <Typography variant="body2" sx={{ mr: 2, color: '#ff9800' }}>
                                                        Attempt #{attempt.attemptNumber}
                                                    </Typography>
                                                    <BlockchainLoader
                                                        message="Waiting for Phala Cloud..."
                                                        size="small"
                                                    />
                                                    <Typography variant="body2" sx={{ ml: 2, color: '#b0b0b0' }}>
                                                        Guessed: {attempt.guess}
                                                    </Typography>
                                                </>
                                            );
                                        }
                                        if ((attempt.clue as any).type == "Less"){
                                            return (
                                                <>
                                                    <Typography variant="body2" sx={{ color: '#f44336', mr: 2 }}>
                                                        #{attempt.attemptNumber}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                                                        My number is <span style={{ color: '#f44336', fontWeight: 600 }}>less than</span> {attempt.guess}
                                                    </Typography>
                                                </>
                                            );
                                        }
                                        if ((attempt.clue as any).type == "More"){
                                            return (
                                                <>
                                                    <Typography variant="body2" sx={{ color: '#4caf50', mr: 2 }}>
                                                        #{attempt.attemptNumber}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                                                        My number is <span style={{ color: '#4caf50', fontWeight: 600 }}>more than</span> {attempt.guess}
                                                    </Typography>
                                                </>
                                            );
                                        }
                                        if ((attempt.clue as any).type == "Found"){
                                            return (
                                                <>
                                                    <Typography variant="body2" sx={{ color: '#4caf50', mr: 2 }}>
                                                        #{attempt.attemptNumber} 🎉
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: '#4caf50', fontWeight: 600 }}>
                                                        Congratulations! You found the number {attempt.guess}!
                                                    </Typography>
                                                </>
                                            );
                                        }
                                        return null;
                                    })()}
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}

                {/* Make Guess Component */}
                <MakeGuess />
            </div>
        </Box>
    );
}


export function MakeGuess() {

    const chainId = useChainId();
    const contractAddress = getContractAddress(chainId);
    const { refreshGuesses } = useContext(GameContext)
    const transactionContext = useTransactionContext();
    const { showFeedback, FeedbackComponent } = useInteractionFeedback();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const inputNumber = useRef<HTMLInputElement>(null);

    const [_, makeGuess] = useContractMutation((mutate) =>
        mutate(gtnContract, contractAddress, "guess", {
            data: {"guess": parseInt(inputNumber.current?.value || "0")},
        }),
    );

    const submit = async () => {
        const guessNumber = inputNumber.current?.value;

        console.log("Guess " + guessNumber);
        if (!isPositiveNumber(guessNumber)){
            showFeedback('error', 'Please enter a valid positive number');
            return;
        }

        setIsSubmitting(true);
        try {
            await makeGuess();
            showFeedback('success', 'Guess submitted successfully!');
        } catch (error) {
            showFeedback('error', 'Failed to submit guess. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    useMutationEffect(onMutationEvent(refreshGuesses, transactionContext));

    return (
        <>
            {FeedbackComponent}
            <Box sx={{
                padding: { xs: "30px 0 0", sm: "40px 0 0" },
                display: 'flex',
                justifyContent: 'center'
            }}>
                <Box
                    className="content-block fade-in"
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: 'center',
                        gap: 2,
                        p: 3,
                        width: '100%',
                        maxWidth: '500px',
                        borderRadius: '16px'
                    }}
                >
                    <TextField
                        inputRef={inputNumber}
                        id="guess-number-value"
                        label="Enter your guess"
                        variant="outlined"
                        type="number"
                        disabled={isSubmitting}
                        sx={{
                            flex: 1,
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                },
                                '&.Mui-focused': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                }
                            }
                        }}
                        InputLabelProps={{
                            sx: { color: '#b0b0b0' }
                        }}
                        inputProps={{
                            sx: { color: 'white' }
                        }}
                    />
                    <InteractiveButton
                        onClick={submit}
                        variant="primary"
                        disabled={isSubmitting}
                        loading={isSubmitting}
                        sx={{
                            minWidth: { xs: '100%', sm: '140px' },
                            height: '56px'
                        }}
                    >
                        🚀 Make Guess
                    </InteractiveButton>
                </Box>
            </Box>
        </>
    );
}


function NewGame() {

    const chainId = useChainId();
    const contractAddress = getContractAddress(chainId);
    const { refreshGame } = useContext(GameContext)
    const transactionContext = useTransactionContext();
    const { showFeedback, FeedbackComponent } = useInteractionFeedback();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const refMin = useRef<HTMLInputElement>(null);
    const refMax = useRef<HTMLInputElement>(null);

    const [__, newGame] = useContractMutation((mutate) =>
        mutate(gtnContract, contractAddress, "start_new_game", {
            data: {"min_number": parseInt(refMin.current?.value || "0"), "max_number": parseInt(refMax.current?.value || "0")},
        }),
    );

    useMutationEffect(onMutationEvent(refreshGame, transactionContext));

    const submit = async () => {
        const minNumber = refMin.current?.value;
        const maxNumber = refMax.current?.value;

        if (!minNumber || !maxNumber) {
            showFeedback('warning', 'Please enter both min and max values');
            return;
        }

        console.log("Start new game " + minNumber + " - " + maxNumber);
        if (!isPositiveNumber(minNumber) || ! isPositiveNumber(maxNumber)){
            showFeedback('error', 'Min and Max must be positive numbers');
            return;
        }
        if (parseInt(minNumber) >= parseInt(maxNumber)){
            showFeedback('error', 'Min must be less than Max');
            return;
        }

        setIsSubmitting(true);
        try {
            await newGame();
            showFeedback('success', 'New game started successfully!');
        } catch (error) {
            showFeedback('error', 'Failed to start new game. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {FeedbackComponent}
            <Box sx={{
                padding: { xs: "60px 20px 0", sm: "100px 40px 0" },
                display: 'flex',
                justifyContent: 'center'
            }}>
                <Box
                    className="content-block fade-in"
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: 'center',
                        gap: 2,
                        p: 3,
                        width: '100%',
                        maxWidth: '600px',
                        borderRadius: '16px'
                    }}
                >
                    <Typography
                        variant="h6"
                        sx={{
                            color: '#64b5f6',
                            fontWeight: 600,
                            mr: { xs: 0, sm: 2 },
                            mb: { xs: 2, sm: 0 },
                            textAlign: { xs: 'center', sm: 'left' }
                        }}
                    >
                        🎮 Start New Game
                    </Typography>
                    <Box sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: 2,
                        flex: 1
                    }}>
                        <TextField
                            inputRef={refMin}
                            id="new-game-min-value"
                            label="Min Number"
                            variant="outlined"
                            type="number"
                            disabled={isSubmitting}
                            sx={{
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    },
                                    '&.Mui-focused': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    }
                                }
                            }}
                            InputLabelProps={{
                                sx: { color: '#b0b0b0' }
                            }}
                            inputProps={{
                                sx: { color: 'white' }
                            }}
                        />
                        <TextField
                            inputRef={refMax}
                            id="new-game-max-value"
                            label="Max Number"
                            variant="outlined"
                            type="number"
                            disabled={isSubmitting}
                            sx={{
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    },
                                    '&.Mui-focused': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    }
                                }
                            }}
                            InputLabelProps={{
                                sx: { color: '#b0b0b0' }
                            }}
                            inputProps={{
                                sx: { color: 'white' }
                            }}
                        />
                    </Box>
                    <InteractiveButton
                        onClick={submit}
                        variant="success"
                        disabled={isSubmitting}
                        loading={isSubmitting}
                        sx={{
                            minWidth: { xs: '100%', sm: '160px' },
                            height: '56px'
                        }}
                    >
                        🎯 Start Game
                    </InteractiveButton>
                </Box>
            </Box>
        </>
    );
}

function onMutationEvent(callback: () => void, transactionContext: any) : (event: any) => void {
    return  (event: any) => {
        if(event.value === pending) {
            transactionContext.addTransaction(
                event.id,
                'pending',
                "Preparing transaction..."
            );
            return;
        }
        if (event.value instanceof MutationError) {
            transactionContext.updateTransaction(event.id, {
                state: 'error',
                error: "Failed to submit transaction"
            });
            return;
        }
        switch (event.value.type) {
            case "finalized":
                if (event.value.ok) {
                    transactionContext.updateTransaction(event.id, {
                        state: 'finalized',
                        message: "Transaction confirmed!",
                        txHash: event.value.txHash
                    });
                    callback();
                } else {
                    console.error(event)
                    transactionContext.updateTransaction(event.id, {
                        state: 'error',
                        error: "Transaction failed: " + event.value?.dispatchError?.value?.value?.type
                    });
                }
                break;
            default:
                transactionContext.updateTransaction(event.id, {
                    state: 'submitted',
                    message: "Transaction submitted, waiting for confirmation..."
                });
        }
    }
}

export function Game() {

    const resetQueryError = useQueryErrorResetter();
    return (
        <Box sx={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #101010 0%, #1a1a1a 50%, #101010 100%)',
            backgroundAttachment: 'fixed'
        }}>
            {/* Game Intro Section */}
            <Box sx={{
                padding: { xs: "40px 20px 0", sm: "60px 40px 0" },
                display: 'flex',
                justifyContent: 'center'
            }}>
                <Box
                    className="content-block fade-in"
                    sx={{
                        width: '100%',
                        maxWidth: '700px',
                        borderRadius: '24px',
                        p: { xs: 3, sm: 4 }
                    }}
                >
                    <GameIntro />
                </Box>
            </Box>

            {/* Game Content */}
            <ErrorBoundary
                FallbackComponent={ErrorFallback}
                onReset={() => resetQueryError()}
            >
                <Suspense fallback={
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: '200px',
                        padding: '40px 20px'
                    }}>
                        <Box className="content-block fade-in" sx={{
                            textAlign: 'center',
                            p: 4,
                            borderRadius: '16px'
                        }}>
                            <Typography variant="h6" sx={{ color: '#64b5f6', mb: 2 }}>
                                Loading Game...
                            </Typography>
                            <BlockchainLoader message="Connecting to blockchain..." />
                        </Box>
                    </Box>
                }>
                    <CurrentGame />
                    <NewGame />
                </Suspense>
            </ErrorBoundary>
        </Box>
    );
}

function ErrorFallback({ resetErrorBoundary }: FallbackProps) {
    return (
        <article>
            <header>
                <strong>Oops, something went wrong!</strong>
            </header>
            <button type="button" onClick={() => resetErrorBoundary()}>
                Retry
            </button>
        </article>
    );
}