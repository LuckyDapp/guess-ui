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

    useEffect(() => {
        if (signer && chainId) {
            console.log("address: " + encodeAddress(signer.publicKey));
            console.log("refresh game");
            getOrCreateContract(chainId)
                .getCurrentGame(signer)
                .then(
                    (game) => {
                        setGame(game);
                        setAttempts(updateAttempts([], game));
                    }
                ).catch((e) => {
                    setGame(undefined);
                    setAttempts([]);
                });
        } else {
            console.warn("no selected address");
        }
    }, [signer, chainId, nbNewGames]);

    useEffect(() => {
        if (signer && chainId) {
            console.log("refresh attempts");
            getOrCreateContract(chainId)
                .getCurrentGame(signer)
                .then(
                    (game) => {
                        setAttempts(updateAttempts(attempts, game));
                    }
                ).catch((e) => {
                    setAttempts([]);
                });
        }
    }, [game, nbNewGuesses]);

    const refreshGameState = useCallback(async () => {
        if (!signer || !chainId) return;

        try {
            const currentGame = await getOrCreateContract(chainId).getCurrentGame(signer);
            setGame(currentGame);
            setAttempts(prevAttempts => updateAttempts([...prevAttempts], currentGame));

            // Check if there are any pending guesses (attempts without clues)
            const currentAttempts = getAttempts();
            const hasPendingGuesses = currentAttempts.some(attempt => attempt.clue == undefined);

            if (hasPendingGuesses && !isPollingAggressively) {
                startAggressivePolling();
            } else if (!hasPendingGuesses && isPollingAggressively) {
                stopAggressivePolling();
            }
        } catch (error) {
            console.error("Error refreshing game state:", error);
            setGame(undefined);
            setAttempts([]);
        }
    }, [signer, chainId, attempts, isPollingAggressively]);

    const startAggressivePolling = useCallback(() => {
        if (isPollingAggressively) return;

        console.log("Starting aggressive polling for pending guesses");
        setIsPollingAggressively(true);

        let pollCount = 0;
        const maxPolls = 30; // Maximum 30 polls (about 2 minutes with exponential backoff)

        const pollWithBackoff = () => {
            if (pollCount >= maxPolls) {
                console.log("Stopping aggressive polling - max polls reached");
                stopAggressivePolling();
                return;
            }

            refreshGameState();
            pollCount++;

            // Exponential backoff: 1s, 2s, 4s, 8s, then every 10s
            const delay = pollCount <= 4 ? Math.pow(2, pollCount - 1) * 1000 : 10000;

            aggressivePollingRef.current = setTimeout(pollWithBackoff, delay);
        };

        // Start polling immediately
        pollWithBackoff();
    }, [isPollingAggressively, refreshGameState]);

    const stopAggressivePolling = useCallback(() => {
        if (aggressivePollingRef.current) {
            clearTimeout(aggressivePollingRef.current);
            aggressivePollingRef.current = null;
        }
        setIsPollingAggressively(false);
        console.log("Stopped aggressive polling");
    }, []);

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
        console.log("New guess submitted - triggering immediate refresh and aggressive polling");
        setNbNewGuesses(prev => prev + 1);
        // Immediately refresh and start aggressive polling
        refreshGameState();
        startAggressivePolling();
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