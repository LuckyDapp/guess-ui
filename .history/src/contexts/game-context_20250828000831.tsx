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
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const aggressivePollingRef = useRef<NodeJS.Timeout | null>(null);

    const refreshGameState = useCallback(async () => {
        if (!signer || !chainId) return;

        try {
            const currentGame = await getOrCreateContract(chainId).getCurrentGame(signer);
            setGame(currentGame);
            setAttempts(prevAttempts => updateAttempts([...prevAttempts], currentGame));
            return currentGame;
        } catch (error) {
            console.error("Error refreshing game state:", error);
            setGame(undefined);
            setAttempts([]);
            return null;
        }
    }, [signer, chainId]);

    // Function to start aggressive polling when needed
    const startAggressivePolling = useCallback(() => {
        if (isPollingAggressively) return;

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

            refreshGameState().then((currentGame) => {
                pollCount++;

                // Simple logic: continue polling until we hit max polls
                // The UI will update naturally when the smart contract state changes
                if (pollCount < maxPolls) {
                    const delay = pollCount <= 4 ? Math.pow(2, pollCount - 1) * 1000 : 10000;
                    aggressivePollingRef.current = setTimeout(pollWithBackoff, delay);
                } else {
                    if (aggressivePollingRef.current) {
                        clearTimeout(aggressivePollingRef.current);
                        aggressivePollingRef.current = null;
                    }
                    setIsPollingAggressively(false);
                    console.log("Stopped aggressive polling - max polls reached");
                }
            }).catch(() => {
                // If refresh fails, still continue polling but with longer delay
                pollCount++;
                if (pollCount < maxPolls) {
                    const delay = pollCount <= 4 ? Math.pow(2, pollCount - 1) * 1000 : 10000;
                    aggressivePollingRef.current = setTimeout(pollWithBackoff, delay);
                } else {
                    if (aggressivePollingRef.current) {
                        clearTimeout(aggressivePollingRef.current);
                        aggressivePollingRef.current = null;
                    }
                    setIsPollingAggressively(false);
                }
            });
        };

        pollWithBackoff();
    }, [isPollingAggressively, refreshGameState]);


    // Initial game load and refresh when game changes
    useEffect(() => {
        if (signer && chainId) {
            console.log("Loading initial game state");
            refreshGameState();
        } else {
            console.warn("No signer or chainId available");
            setGame(undefined);
            setAttempts([]);
        }
    }, [signer, chainId, nbNewGames, refreshGameState]);

    // Refresh attempts when nbNewGuesses changes
    useEffect(() => {
        if (signer && chainId && nbNewGuesses > 0) {
            console.log("Refreshing attempts after new guess");
            refreshGameState().then(() => {
                // Start aggressive polling after a new guess
                setTimeout(() => startAggressivePolling(), 500);
            });
        }
    }, [nbNewGuesses, refreshGameState, signer, chainId, startAggressivePolling]);

    // Regular background polling (every 30 seconds when not aggressively polling)
    useEffect(() => {
        if (!isPollingAggressively) {
            pollingIntervalRef.current = setInterval(() => {
                refreshGameState();
            }, 30 * 1000);
        }

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [isPollingAggressively, refreshGameState]);

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
        // Immediately refresh and start aggressive polling
        refreshGameState().then(() => {
            setTimeout(() => startAggressivePolling(), 100);
        });
    }, [refreshGameState, startAggressivePolling]);

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