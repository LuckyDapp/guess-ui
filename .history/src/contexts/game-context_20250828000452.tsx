import {createContext, useEffect, useState, useCallback, useRef} from 'react';
import type {Attempt, Game} from "../types.ts";
import {getOrCreateContract} from "../contract.tsx";
import {encodeAddress} from "@polkadot/keyring";
import {useChainId, useSigner} from "@reactive-dot/react";

export const GameContext = createContext<GameContextStruct | undefined>(undefined);
export type GameContextStruct = {
    game : Game | undefined,
    getAttempts : () => Attempt[],
    refreshGuesses : () => void,
    refreshGame : () => void,
    refreshGameState : () => Promise<void>,
}

function updateAttempts(attempts: Attempt[], game: Game){
    if (game == undefined){
        return attempts;
    }
    const guess = game.last_guess;
    if (guess == undefined){
        return attempts;
    }

    const gameNumber = game.game_number;
    const attemptNumber = game.attempt;

    const attempt: Attempt = {
        gameNumber,
        attemptNumber,
        guess,
        clue: game.last_clue,
    }

    const index = attempts.findIndex(value => value.gameNumber === gameNumber && value.attemptNumber === attemptNumber);
    if (index == -1) {
        attempts.push(attempt);
    } else {
        attempts[index] = attempt;
    }
    return attempts
}

export const GameContextProvider = ({ children }: { children: React.ReactNode }) => {

    const chainId = useChainId();
    const signer = useSigner();
    const [game, setGame] = useState<Game>();
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [nbNewGames, setNbNewGames] = useState(0);
    const [nbNewGuesses, setNbNewGuesses] = useState(0);
    const [isPollingAggressively, setIsPollingAggressively] = useState(false);
    const [pendingGuessCount, setPendingGuessCount] = useState(0);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const aggressivePollingRef = useRef<NodeJS.Timeout | null>(null);

    const refreshGameState = useCallback(async () => {
        if (!signer || !chainId) return;

        try {
            const currentGame = await getOrCreateContract(chainId).getCurrentGame(signer);
            setGame(currentGame);
            setAttempts(prevAttempts => updateAttempts([...prevAttempts], currentGame));
        } catch (error) {
            console.error("Error refreshing game state:", error);
            setGame(undefined);
            setAttempts([]);
        }
    }, [signer, chainId]);

    // Separate function to check for pending guesses and manage polling
    const checkPendingGuesses = useCallback(() => {
        if (!game || !attempts) return;

        const currentAttempts = attempts.filter(a => a.gameNumber === game.game_number);
        const hasPendingGuesses = currentAttempts.some(attempt => attempt.clue == undefined);

        if (hasPendingGuesses && !isPollingAggressively) {
            // Start aggressive polling
            console.log("Starting aggressive polling for pending guesses");
            setIsPollingAggressively(true);

            let pollCount = 0;
            const maxPolls = 30;

            const pollWithBackoff = () => {
                if (pollCount >= maxPolls) {
                    console.log("Stopping aggressive polling - max polls reached");
                    if (aggressivePollingRef.current) {
                        clearTimeout(aggressivePollingRef.current);
                        aggressivePollingRef.current = null;
                    }
                    setIsPollingAggressively(false);
                    return;
                }

                // Call refreshGameState but don't create a recursive loop
                refreshGameState().then(() => {
                    // After refreshing, check again if we still need to poll
                    const updatedAttempts = attempts.filter(a => a.gameNumber === game.game_number);
                    const stillHasPending = updatedAttempts.some(attempt => attempt.clue == undefined);

                    if (!stillHasPending) {
                        // No more pending guesses, stop polling
                        if (aggressivePollingRef.current) {
                            clearTimeout(aggressivePollingRef.current);
                            aggressivePollingRef.current = null;
                        }
                        setIsPollingAggressively(false);
                        console.log("Stopped aggressive polling - no more pending guesses");
                        return;
                    }

                    pollCount++;
                    const delay = pollCount <= 4 ? Math.pow(2, pollCount - 1) * 1000 : 10000;
                    aggressivePollingRef.current = setTimeout(pollWithBackoff, delay);
                });
            };

            pollWithBackoff();
        } else if (!hasPendingGuesses && isPollingAggressively) {
            // Stop aggressive polling
            if (aggressivePollingRef.current) {
                clearTimeout(aggressivePollingRef.current);
                aggressivePollingRef.current = null;
            }
            setIsPollingAggressively(false);
            console.log("Stopped aggressive polling");
        }
    }, [game, attempts, isPollingAggressively, refreshGameState]);

    // Initial game load and refresh when game changes
    useEffect(() => {
        if (signer && chainId) {
            console.log("Loading initial game state");
            refreshGameState().then(() => {
                // After initial load, check for pending guesses
                setTimeout(() => checkPendingGuesses(), 100);
            });
        } else {
            console.warn("No signer or chainId available");
            setGame(undefined);
            setAttempts([]);
        }
    }, [signer, chainId, nbNewGames, refreshGameState, checkPendingGuesses]);

    // Refresh attempts when nbNewGuesses changes
    useEffect(() => {
        if (signer && chainId && nbNewGuesses > 0) {
            console.log("Refreshing attempts after new guess");
            refreshGameState().then(() => {
                // After refresh, check for pending guesses and start polling if needed
                setTimeout(() => checkPendingGuesses(), 100);
            });
        }
    }, [nbNewGuesses, refreshGameState, signer, chainId, checkPendingGuesses]);


    // Check for pending guesses whenever attempts or game changes
    useEffect(() => {
        if (game && attempts.length > 0) {
            checkPendingGuesses();
        }
    }, [game, attempts, checkPendingGuesses]);

    // Regular background polling (every 30 seconds when not aggressively polling)
    useEffect(() => {
        if (!isPollingAggressively) {
            pollingIntervalRef.current = setInterval(() => {
                refreshGameState().then(() => {
                    setTimeout(() => checkPendingGuesses(), 100);
                });
            }, 30 * 1000);
        }

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [isPollingAggressively, refreshGameState, checkPendingGuesses]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
            if (aggressivePollingRef.current) {
                clearTimeout(aggressivePollingRef.current);
            }
        };
    }, []);

    const refreshGuesses = useCallback(() => {
        console.log("New guess submitted - triggering immediate refresh");
        setNbNewGuesses(prev => prev + 1);
        // Immediately refresh and check for pending guesses
        refreshGameState().then(() => {
            setTimeout(() => checkPendingGuesses(), 100);
        });
    }, [refreshGameState, checkPendingGuesses]);

    const refreshGame = useCallback(() => {
        setNbNewGames(prev => prev + 1);
        refreshGameState();
    }, [refreshGameState]);

    const getAttempts =  () => {
        if (game == undefined || attempts==undefined){
            return [];
        }
        return attempts.filter(a => a.gameNumber == game.game_number);
    };

    return (
        <GameContext.Provider value={{ game, getAttempts, refreshGuesses, refreshGame, refreshGameState }} >
            {children}
        </GameContext.Provider>
    );

}