import { createContext, useEffect, useState, type ReactNode } from 'react';
import type { Attempt, Game, GameContextType } from "../types.ts";
import { getOrCreateContract } from "../contract.tsx";
import { encodeAddress } from "@polkadot/keyring";
import { useChainId, useSigner } from "@reactive-dot/react";

export const GameContext = createContext<GameContextType | undefined>(undefined);

interface GameContextProviderProps {
  children: ReactNode;
}

function updateAttempts(attempts: Attempt[], game: Game){
    if (game == undefined){
        return attempts;
    }
    
    // Vérifier que le jeu a la structure attendue
    if (typeof game !== 'object' || !('game_number' in game) || !('attempt' in game)) {
        console.warn("Invalid game structure in updateAttempts:", game);
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

export const GameContextProvider = ({ children }: GameContextProviderProps) => {

    const chainId = useChainId();
    const signer = useSigner();
    const [game, setGame] = useState<Game>();
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [nbNewGames, setNbNewGames] = useState(0);
    const [nbNewGuesses, setNbNewGuesses] = useState(0);

    useEffect(() => {
        if (signer && chainId) {
            console.log("address: " + encodeAddress(signer.publicKey));
            console.log("refresh game");
            getOrCreateContract(chainId)
                .getCurrentGame(signer)
                .then(
                    (game) => {
                        // Vérifier que le jeu a la structure attendue
                        if (game && typeof game === 'object' && 'game_number' in game) {
                            setGame(game);
                            setAttempts(updateAttempts([], game));
                        } else {
                            console.warn("Invalid game data structure:", game);
                            setGame(undefined);
                            setAttempts([]);
                        }
                    }
                ).catch((e) => {
                    console.warn("Error loading game:", e);
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
                        // Vérifier que le jeu a la structure attendue
                        if (game && typeof game === 'object' && 'game_number' in game) {
                            setGame(game);
                            setAttempts(updateAttempts(attempts, game));
                        } else {
                            console.warn("Invalid game data structure when refreshing attempts:", game);
                            setAttempts([]);
                        }
                    }
                ).catch((e) => {
                    console.warn("Error refreshing attempts:", e);
                    setAttempts([]);
                });
        }
    }, [nbNewGuesses]);

    const refreshInBackground = async () => {
        if (signer && chainId) {
            console.log("periodically refresh attempts");
            getOrCreateContract(chainId)
                .getCurrentGame(signer)
                .then(
                    (game) => {
                        setGame(game);
                        setAttempts(updateAttempts(attempts, game));
                    }
                ).catch((e) => {
                    console.warn("Error in background refresh:", e);
                    setAttempts([]);
                });
        }
    };

    useEffect(() => {
        const backgroundSyncInterval = setInterval(() => {
            refreshInBackground();
        }, 10 * 1000); // every 10 seconds

        return () => {
            clearInterval(backgroundSyncInterval);
        }
    }, [signer, chainId]);

    const refreshGuesses = () => {
        setNbNewGuesses(nbNewGuesses + 1);
    }

    const refreshGame = () => {
        setNbNewGames(nbNewGames + 1);
    }

    const getAttempts =  () => {
        if (game == undefined || attempts==undefined){
            return [];
        }
        return attempts.filter(a => a.gameNumber == game.game_number);
    };

    return (
        <GameContext.Provider value={{ game, getAttempts, refreshGuesses, refreshGame }} >
            {children}
        </GameContext.Provider>
    );

}