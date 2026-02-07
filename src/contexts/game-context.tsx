import { createContext, useEffect, useState, useMemo, useCallback, useRef, type ReactNode } from 'react';
import { signerToRevive } from "../utils/address-converter.ts";
 

import type { Attempt, Game, GameContextType } from "../types.ts";
import { getOrCreateContract } from "../contract.tsx";
import { encodeAddress } from "@polkadot/keyring";
import { useChainId, useSigner } from "@reactive-dot/react";

// Système de log conditionnel (seulement en développement)
const isDev = process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && window.location.hostname === 'localhost');
const debugLog = (...args: any[]) => {
    if (isDev) console.log(...args);
};
const debugWarn = (...args: any[]) => {
    if (isDev) console.warn(...args);
};
const debugError = (...args: any[]) => {
    console.error(...args); // Toujours logger les erreurs
};

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
    const [indexerGameInfo, setIndexerGameInfo] = useState<any>(null);
    const [gameOverTarget, setGameOverTarget] = useState<number | null>(null);

    // Memoization de l'adresse SS58 pour éviter les recalculs
    const ss58Address = useMemo(() => {
        return signer ? encodeAddress(signer.publicKey) : null;
    }, [signer]);

    useEffect(() => {
        if (signer && chainId) {
            debugLog("refresh game");
            getOrCreateContract(chainId)
                .getCurrentGame(signer)
                .then(
                    (game) => {
                        if (game && typeof game === 'object' && 'game_number' in game) {
                            setGame(game);
                            setAttempts(updateAttempts([], game));
                        } else {
                            setGame(undefined);
                            setAttempts([]);
                        }
                    }
                ).catch((e) => {
                    debugWarn("Error loading game:", e);
                    setGame(undefined);
                    setAttempts([]);
                });
        }
    }, [signer, chainId, nbNewGames]);

    // Memoization de l'adresse Revive pour éviter les recalculs coûteux (Keccak-256)
    const reviveAddress = useMemo(() => {
        return signer ? signerToRevive(signer) : null;
    }, [signer]);

    // Debounce pour les requêtes GraphQL (éviter les requêtes multiples rapides)
    const graphqlTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    useEffect(() => {
        if (game && signer && reviveAddress) {
            // Annuler la requête précédente si elle existe
            if (graphqlTimeoutRef.current) {
                clearTimeout(graphqlTimeoutRef.current);
            }

            // Debounce de 500ms pour éviter les requêtes multiples
            graphqlTimeoutRef.current = setTimeout(() => {
                try {
                    // Convertir game_number en BigInt pour la requête GraphQL
                    const gameNumber = typeof game.game_number === 'bigint' 
                        ? game.game_number 
                        : BigInt(game.game_number);

                    // Utiliser des variables GraphQL pour éviter l'injection SQL
                    const query = `
                      query GetGame($playerAddress: String!, $gameNumber: BigInt!) {
                        games(where: {playerAddress_eq: $playerAddress, gameNumber_eq: $gameNumber}) {
                          createdAt
                          playerAddress
                          attempt
                          createdAtBlock
                          gameNumber
                          isOver
                          lastClue
                          lastGuess
                          maxAttempts
                          maxNumber
                          minNumber
                          target
                          won
                          cancelled
                          id
                          guessHistory {
                            attemptNumber
                            guess
                            result
                          }
                        }
                        gameOverEvents(where: {gameNumber_eq: $gameNumber}) {
                          gameNumber
                          target
                          timestamp
                        }
                      }
                    `;
                    
                    const variables = {
                        playerAddress: reviveAddress.toLowerCase(),
                        gameNumber: gameNumber.toString()
                    };
                    
                    const requestBody = { query, variables };
                    
                    debugLog('GraphQL query for gameNumber:', gameNumber.toString());

                    fetch('https://query2.substrate.fi/squid-guess/graphql', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestBody)
                    })
                        .then(async (res) => {
                            const data = await res.json();
                            if (data.errors) {
                                debugError('GraphQL errors:', data.errors);
                                // Vérifier si c'est une erreur de serveur (connexion DB)
                                const isServerError = data.errors.some((err: any) => 
                                    err.message?.includes('getaddrinfo') || 
                                    err.message?.includes('EAI_AGAIN') ||
                                    err.extensions?.code === 'INTERNAL_SERVER_ERROR'
                                );
                                if (isServerError) {
                                    debugWarn('Indexer service temporarily unavailable');
                                }
                                setIndexerGameInfo(data);
                                return;
                            }
                            setIndexerGameInfo(data);
                            const games = data?.data?.games;
                            const idxGame = Array.isArray(games) ? games[0] : null;
                            const overEvent = data?.data?.gameOverEvents?.[0];
                            if (idxGame?.isOver === true && overEvent?.target != null) {
                                setGameOverTarget(Number(overEvent.target));
                            }
                            debugLog('Indexer data received');
                        })
                        .catch(err => {
                            debugError('Error fetching indexer data:', err);
                            setIndexerGameInfo({ errors: [{ message: err.message }] });
                        });
                } catch (error) {
                    debugError('Error converting address for indexer query:', error);
                }
            }, 500);
        }

        return () => {
            if (graphqlTimeoutRef.current) {
                clearTimeout(graphqlTimeoutRef.current);
            }
        };
    }, [game?.game_number, reviveAddress]);

    useEffect(() => {
        if (!game || !indexerGameInfo?.data?.games?.length) return;
        const idxGame = indexerGameInfo.data.games.find(
            (g: any) => g && String(g.gameNumber) === String(game.game_number)
        );
        if (!idxGame) return;
        const needUpdate =
            (idxGame.cancelled !== undefined && game.cancelled !== idxGame.cancelled) ||
            (idxGame.maxAttempts !== undefined && game.max_attempts !== Number(idxGame.maxAttempts));
        if (!needUpdate) return;
        setGame(prev => {
            if (!prev) return prev;
            const ma = idxGame.maxAttempts;
            return {
                ...prev,
                cancelled: idxGame.cancelled ?? prev.cancelled,
                max_attempts: ma != null && Number(ma) > 0 ? Number(ma) : prev.max_attempts
            };
        });
    }, [game?.game_number, game?.cancelled, game?.max_attempts, indexerGameInfo]);

    useEffect(() => {
        if (signer && chainId) {
            debugLog("refresh attempts");
            getOrCreateContract(chainId)
                .getCurrentGame(signer)
                .then(
                    (game) => {
                        if (game && typeof game === 'object' && 'game_number' in game) {
                            setGame(game);
                            setAttempts(prevAttempts => updateAttempts(prevAttempts, game));
                        } else {
                            setAttempts([]);
                        }
                    }
                ).catch((e) => {
                    debugWarn("Error refreshing attempts:", e);
                    setAttempts([]);
                });
        }
    }, [nbNewGuesses, signer, chainId]);

    const refreshInBackground = useCallback(async () => {
        if (signer && chainId) {
            debugLog("periodically refresh attempts");
            getOrCreateContract(chainId)
                .getCurrentGame(signer)
                .then(
                    (game) => {
                        if (game && typeof game === 'object' && 'game_number' in game) {
                            setGame(game);
                            setAttempts(prevAttempts => updateAttempts(prevAttempts, game));
                        }
                    }
                ).catch((e) => {
                    debugWarn("Error in background refresh:", e);
                });
        }
    }, [signer, chainId]);

    useEffect(() => {
        if (!signer || !chainId) return;
        
        // Réduire la fréquence de polling de 10s à 30s pour améliorer les performances
        const backgroundSyncInterval = setInterval(() => {
            refreshInBackground();
        }, 30 * 1000); // every 30 seconds (au lieu de 10)

        return () => {
            clearInterval(backgroundSyncInterval);
        }
    }, [signer, chainId, refreshInBackground]);

    const refreshGuesses = () => {
        setNbNewGuesses(nbNewGuesses + 1);
    }

    const refreshGame = useCallback(() => {
        setNbNewGames(n => n + 1);
    }, []);

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<{ gameNumber?: bigint; cancelled?: boolean; maxAttempts?: number }>)?.detail;
            if (detail?.gameNumber !== undefined && (detail.cancelled !== undefined || detail.maxAttempts !== undefined)) {
                setGame(prev => {
                    if (!prev || String(prev.game_number) !== String(detail.gameNumber)) return prev;
                    return {
                        ...prev,
                        cancelled: detail.cancelled ?? prev.cancelled,
                        max_attempts: detail.maxAttempts !== undefined ? Number(detail.maxAttempts) : prev.max_attempts
                    };
                });
            }
            refreshGame();
        };
        window.addEventListener('game-state-changed', handler);
        return () => window.removeEventListener('game-state-changed', handler);
    }, [refreshGame]);

    const gameNumberRef = useRef<bigint | undefined>(game?.game_number);
    gameNumberRef.current = game?.game_number;

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<{ gameNumber?: bigint; target?: number }>)?.detail;
            if (detail?.gameNumber == null || detail?.target == null) return;
            if (gameNumberRef.current != null && String(detail.gameNumber) === String(gameNumberRef.current)) {
                setGameOverTarget(detail.target);
            }
        };
        window.addEventListener('game-over', handler);
        return () => window.removeEventListener('game-over', handler);
    }, []);

    useEffect(() => {
        setGameOverTarget(null);
    }, [game?.game_number]);

    const getAttempts =  () => {
        if (game == undefined || attempts==undefined){
            return [];
        }
        return attempts.filter(a => a.gameNumber === game.game_number);
    };

    const isGameCompleted = useCallback(() => {
        try {
            if (game == undefined || attempts == undefined) {
                return false;
            }
            if (game.cancelled === true) {
                return true;
            }
            if (game.last_clue && game.last_clue.type === "Found") {
                return true;
            }
            const currentGameAttempts = attempts.filter(a => a.gameNumber === game.game_number);
            return currentGameAttempts.some(attempt => attempt.clue && attempt.clue.type === "Found");
        } catch (error) {
            debugWarn("Error in isGameCompleted:", error);
            return false;
        }
    }, [game, attempts]);

    return (
        <GameContext.Provider value={{ game, getAttempts, refreshGuesses, refreshGame, isGameCompleted, indexerGameInfo, reviveAddress, gameOverTarget }} >
            {children}
        </GameContext.Provider>
    );

}