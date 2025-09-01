import {Suspense, useContext, useRef} from "react";
import {Box, Button, TextField} from "@mui/material";
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
            toast.error("The input must be positive number");
            return;
        }
        makeGuess();
    };

    useMutationEffect(onMutationEvent(refreshGuesses, transactionContext));

    return (
        <Box sx={{padding:"50px 40px 0 40px"}} display={'flex'} justifyContent={'center'}>
            <div className="content-block">
            <TextField inputRef={inputNumber} sx={{margin:'0 20px 0 0'}} id="guess-number-value" label="Enter your number" variant="outlined" />
            <Button onClick={submit} variant="contained">Make a guess</Button>
            </div>
        </Box>
    );
}


function NewGame() {

    const chainId = useChainId();
    const contractAddress = getContractAddress(chainId);
    const { refreshGame } = useContext(GameContext)
    const transactionContext = useTransactionContext();

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
            toast.error("Please enter both min and max values");
            return;
        }

        console.log("Start new game " + minNumber + " - " + maxNumber);
        if (!isPositiveNumber(minNumber) || ! isPositiveNumber(maxNumber)){
            toast.error("Min and Max must be positive numbers");
            return;
        }
        if (parseInt(minNumber) >= parseInt(maxNumber)){
            toast.error("Min must be inferior to Max");
            return;
        }
        newGame();
    };

    return (
        <Box sx={{padding:"100px 40px 0 40px"}} display={'flex'} justifyContent={'center'}>
            <TextField inputRef={refMin} sx={{margin:'0 20px 0 0'}} id="new-game-min-value" label="Min" variant="outlined" />
            <TextField inputRef={refMax} sx={{margin:'0 20px 0 0'}} id="new-game-max-value" label="Max" variant="outlined" />
            <Button onClick={submit} variant="contained">Start New Game</Button>
        </Box>
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
        <div>
            <Box sx={{padding:"50px 40px 0 40px"}} display={'flex'} justifyContent={'center'}>
                <div className="md:w-[600px] content-block bg-[#191B1F] rounded-2xl px-2 py-8">
                    <GameIntro />
                </div>
            </Box>
            <ErrorBoundary
                FallbackComponent={ErrorFallback}
                onReset={() => resetQueryError()}
            >
                <div>
                    <Suspense fallback={<h2>Loading game ...</h2>}>
                        <CurrentGame />
                    </Suspense>
                    <NewGame />
                </div>
            </ErrorBoundary>
        </div>
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