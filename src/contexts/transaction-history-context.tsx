import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { setupGlobalEventSubscription, setupFinalizedBlocksWatcher } from '../global-event-subscriber';
import { getContractAddress } from '../config';
import type { TransactionHistory, TransactionHistoryContextType, GameEvent } from '../types';

const TransactionHistoryContext = createContext<TransactionHistoryContextType | undefined>(undefined);

interface TransactionHistoryProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = 'guess-the-number-transaction-history';
const MAX_HISTORY_SIZE = 50; // Limiter l'historique à 50 transactions pour économiser l'espace

export const TransactionHistoryProvider = ({ children }: TransactionHistoryProviderProps) => {
  const [transactions, setTransactions] = useState<TransactionHistory[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [unsubGlobal, setUnsubGlobal] = useState<(() => void) | null>(null);
  const [unsubBlocks, setUnsubBlocks] = useState<(() => void) | null>(null);
  const transactionsRef = useRef<TransactionHistory[]>([]);

  // Fonction pour minifier les paramètres
  const minifyParams = (params: any): any => {
    if (!params || typeof params !== 'object') return params;
    const result: any = {};
    for (const [key, value] of Object.entries(params)) {
      // Raccourcir les clés communes
      const shortKey = key === 'game_number' ? 'gn' :
                       key === 'min_number' ? 'mn' :
                       key === 'max_number' ? 'mx' :
                       key === 'guess' ? 'g' :
                       key === 'attempt' ? 'a' : key;
      result[shortKey] = typeof value === 'bigint' ? value.toString() : value;
    }
    return result;
  };

  // Fonction pour restaurer les paramètres
  const expandParams = (params: any): any => {
    if (!params || typeof params !== 'object') return params;
    const result: any = {};
    for (const [key, value] of Object.entries(params)) {
      // Restaurer les clés complètes
      const fullKey = key === 'gn' ? 'game_number' :
                      key === 'mn' ? 'min_number' :
                      key === 'mx' ? 'max_number' :
                      key === 'g' ? 'guess' :
                      key === 'a' ? 'attempt' : key;
      result[fullKey] = typeof value === 'string' && /^\d+$/.test(value) && value.length > 15 
        ? BigInt(value) 
        : value;
    }
    return result;
  };

  // Fonction pour minifier les données d'événement
  const minifyEventData = (data: any): any => {
    if (!data || typeof data !== 'object') return data;
    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Raccourcir les clés communes
      const shortKey = key === 'gameNumber' ? 'gn' :
                       key === 'attemptNumber' ? 'an' :
                       key === 'guess' ? 'g' :
                       key === 'result' ? 'r' :
                       key === 'minNumber' ? 'mn' :
                       key === 'maxNumber' ? 'mx' : key;
      result[shortKey] = typeof value === 'bigint' ? value.toString() : value;
    }
    return result;
  };

  // Fonction pour restaurer les données d'événement
  const expandEventData = (data: any): any => {
    if (!data || typeof data !== 'object') return data;
    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Restaurer les clés complètes
      const fullKey = key === 'gn' ? 'gameNumber' :
                      key === 'an' ? 'attemptNumber' :
                      key === 'g' ? 'guess' :
                      key === 'r' ? 'result' :
                      key === 'mn' ? 'minNumber' :
                      key === 'mx' ? 'maxNumber' : key;
      result[fullKey] = typeof value === 'string' && /^\d+$/.test(value) && value.length > 15 
        ? BigInt(value) 
        : value;
    }
    return result;
  };

  // Fonction pour créer une version minimaliste d'une transaction pour le stockage
  const minifyTransaction = (tx: TransactionHistory): any => {
    return {
      i: tx.id,
      t: tx.timestamp,
      h: tx.txHash,
      b: tx.blockNumber,
      c: tx.call,
      s: tx.status,
      // Minifier les paramètres avec clés raccourcies
      p: tx.parameters ? minifyParams(tx.parameters) : undefined,
      // Minifier les événements avec clés raccourcies
      e: tx.events?.map(evt => ({
        i: evt.id,
        t: evt.timestamp,
        b: evt.blockNumber,
        et: evt.eventType,
        d: minifyEventData(evt.data),
        h: evt.txHash,
      })),
      // Ne pas stocker error, gasUsed, fee pour économiser l'espace
    };
  };

  // Fonction pour restaurer une transaction depuis sa version minimaliste
  const expandTransaction = (mini: any): TransactionHistory => {
    return {
      id: mini.i,
      timestamp: mini.t,
      txHash: mini.h,
      blockNumber: mini.b,
      call: mini.c,
      status: mini.s,
      parameters: mini.p ? expandParams(mini.p) : undefined,
      events: mini.e?.map((evt: any) => ({
        id: evt.i,
        timestamp: evt.t,
        blockNumber: evt.b,
        eventType: evt.et,
        data: expandEventData(evt.d),
        txHash: evt.h,
      })),
    };
  };

  // Fonction pour sérialiser les transactions de manière minimaliste
  const serializeTransactions = (txs: TransactionHistory[]): string => {
    const minified = txs.map(minifyTransaction);
    return JSON.stringify(minified);
  };

  // Fonction pour désérialiser les transactions
  const deserializeTransactions = (data: string): TransactionHistory[] => {
    const parsed = JSON.parse(data);
    // Si c'est l'ancien format (tableau d'objets complets), le convertir
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
      // Ancien format, retourner tel quel mais limiter la taille
      return parsed.slice(0, MAX_HISTORY_SIZE);
    }
    // Nouveau format minifié
    return parsed.map(expandTransaction);
  };

  // Charger l'historique depuis le localStorage au montage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = deserializeTransactions(stored);
        // Vérifier que les données sont valides
        if (Array.isArray(parsed)) {
          console.log('Loaded transactions from localStorage:', parsed.length);
          setTransactions(parsed);
        }
      }
      setIsInitialized(true);
    } catch (error) {
      console.warn('Failed to load transaction history from localStorage:', error);
      setIsInitialized(true);
    }
  }, []);

  // Garder une référence toujours fraîche des transactions pour les callbacks asynchrones
  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  // Abonnement global aux événements Revive.ContractEmitted du contrat
  useEffect(() => {
    if (!isInitialized) return;
    // hardcoded chain id used across the app
    const chainId = 'pah';
    const address = getContractAddress(chainId);
    if (!address) return;
    if (!unsubGlobal) {
      const unsub = setupGlobalEventSubscription(chainId);
      if (unsub) {
        console.log('🔗 Global event subscription active');
        setUnsubGlobal(() => unsub);
      }
    }
    if (!unsubBlocks) {
      const unsub = setupFinalizedBlocksWatcher(chainId, (evt) => {
        try {
          // Corréler par game_number au dernier tx actif
          const gameNumber = (evt?.data as any)?.gameNumber as bigint | undefined;
          if (!gameNumber) return;

          // Chercher la dernière transaction liée à ce jeu (par événements existants ou paramètres)
          const source = transactionsRef.current || [];
          const matchingTx = [...source]
            .sort((a, b) => b.timestamp - a.timestamp)
            .find((tx) => {
              if (tx.events && tx.events.length > 0) {
                // si déjà des events avec gameNumber
                const lastEvtWithGame = [...tx.events].reverse().find(e => (e.data as any)?.gameNumber === gameNumber);
                if (lastEvtWithGame) return true;
              }
              // fallback: tenter via paramètres si présents
              const p: any = tx.parameters;
              if (p && typeof p === 'object') {
                if (p.game_number && typeof p.game_number === 'bigint' && p.game_number === gameNumber) return true;
                if (p.min_number !== undefined || p.max_number !== undefined) {
                  if (['guess_result', 'guess_submitted', 'game_cancelled', 'max_attempts_updated'].includes(evt.eventType)) return true;
                }
              }
              return false;
            });

          if (matchingTx) {
            addEventToTransaction(matchingTx.id, evt);
            const d = evt.data as any;
            if (evt.eventType === 'game_cancelled' || evt.eventType === 'max_attempts_updated') {
              window.dispatchEvent(new CustomEvent('game-state-changed', {
                detail: {
                  gameNumber: d?.gameNumber,
                  cancelled: evt.eventType === 'game_cancelled' ? true : undefined,
                  maxAttempts: evt.eventType === 'max_attempts_updated' ? d?.maxAttempts : undefined
                }
              }));
            }
            if (evt.eventType === 'game_over' && d?.win === false && d?.target != null) {
              window.dispatchEvent(new CustomEvent('game-over', {
                detail: { gameNumber: d.gameNumber, target: Number(d.target) }
              }));
            }
          }
        } catch {}
      });
      if (unsub) {
        console.log('🔭 Finalized blocks watcher active');
        setUnsubBlocks(() => unsub);
      }
    }

    return () => {
      try { unsubGlobal && unsubGlobal(); } catch {}
      try { unsubBlocks && unsubBlocks(); } catch {}
      setUnsubGlobal(null);
      setUnsubBlocks(null);
    };
  }, [isInitialized]);

  // Sauvegarder l'historique dans le localStorage à chaque changement
  // Mais seulement après l'initialisation pour éviter d'écraser les données au chargement
  useEffect(() => {
    if (!isInitialized) {
      return; // Ne pas sauvegarder avant l'initialisation
    }
    
    try {
      const serialized = serializeTransactions(transactions);
      localStorage.setItem(STORAGE_KEY, serialized);
      console.log('Saved transactions to localStorage:', transactions.length);
    } catch (error) {
      console.warn('Failed to save transaction history to localStorage:', error);
    }
  }, [transactions, isInitialized]);

  // Définir la fonction addEventToTransaction en premier avec useCallback
  const addEventToTransaction = useCallback((txId: string, event: Omit<GameEvent, 'id' | 'timestamp'>) => {
    console.log(`🔧 Adding event to transaction ${txId}:`, event);
    
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newEvent: GameEvent = {
      ...event,
      id: eventId,
      timestamp: Date.now(),
    };

    console.log(`🆔 Generated event ID: ${eventId}`);
    console.log(`📊 New event object:`, newEvent);

    setTransactions(prev => {
      const updated = prev.map(tx => {
        if (tx.id === txId) {
          const currentEvents = tx.events || [];
          console.log(`📋 Transaction ${txId} currently has ${currentEvents.length} events`);
          
          // Vérifier si un événement similaire existe déjà (même type, même blockNumber, mêmes données clés)
          const isDuplicate = currentEvents.some(existingEvent => {
            console.log(`🔍 Checking duplicate: existing type=${existingEvent.eventType}, new type=${newEvent.eventType}`);
            console.log(`🔍 Existing block=${existingEvent.blockNumber}, new block=${newEvent.blockNumber}`);
            
            if (existingEvent.eventType !== newEvent.eventType) return false;
            if (existingEvent.blockNumber !== newEvent.blockNumber) return false;
            
            // Pour guess_submitted, vérifier gameNumber et guess
            if (newEvent.eventType === 'guess_submitted') {
              const existingData = existingEvent.data as any;
              const newData = newEvent.data as any;
              console.log(`🔍 Comparing guess_submitted: existing gn=${existingData?.gameNumber} (${typeof existingData?.gameNumber}) g=${existingData?.guess}, new gn=${newData?.gameNumber} (${typeof newData?.gameNumber}) g=${newData?.guess}`);
              
              // Comparer en convertissant en string pour gérer bigint vs string
              const existingGn = String(existingData?.gameNumber || '');
              const newGn = String(newData?.gameNumber || '');
              const existingGuess = Number(existingData?.guess);
              const newGuess = Number(newData?.guess);
              
              const match = existingGn === newGn && existingGuess === newGuess;
              console.log(`🔍 Match result: ${match} (gn: ${existingGn} === ${newGn}, guess: ${existingGuess} === ${newGuess})`);
              return match;
            }
            
            // Pour guess_result, vérifier gameNumber, guess et result
            if (newEvent.eventType === 'guess_result') {
              const existingData = existingEvent.data as any;
              const newData = newEvent.data as any;
              console.log(`🔍 Comparing guess_result: existing gn=${existingData?.gameNumber} (${typeof existingData?.gameNumber}) g=${existingData?.guess} r=${existingData?.result}, new gn=${newData?.gameNumber} (${typeof newData?.gameNumber}) g=${newData?.guess} r=${newData?.result}`);
              
              // Comparer en convertissant en string pour gérer bigint vs string
              const existingGn = String(existingData?.gameNumber || '');
              const newGn = String(newData?.gameNumber || '');
              const existingGuess = Number(existingData?.guess);
              const newGuess = Number(newData?.guess);
              
              const match = existingGn === newGn && 
                     existingGuess === newGuess &&
                     existingData?.result === newData?.result;
              console.log(`🔍 Match result: ${match} (gn: ${existingGn} === ${newGn}, guess: ${existingGuess} === ${newGuess}, result: ${existingData?.result} === ${newData?.result})`);
              return match;
            }
            
            return false;
          });
          
          console.log(`🔍 isDuplicate final result: ${isDuplicate}`);
          
          if (isDuplicate) {
            console.log(`⏭️ Skipping duplicate event for transaction ${txId}`);
            return tx;
          }
          
          const updatedTx = {
            ...tx,
            events: [...currentEvents, newEvent]
          };
          if (newEvent.eventType === 'game_cancelled' || newEvent.eventType === 'max_attempts_updated') {
            const d = newEvent.data as any;
            window.dispatchEvent(new CustomEvent('game-state-changed', {
              detail: {
                gameNumber: d?.gameNumber,
                cancelled: newEvent.eventType === 'game_cancelled' ? true : undefined,
                maxAttempts: newEvent.eventType === 'max_attempts_updated' ? d?.maxAttempts : undefined
              }
            }));
          }
          console.log(`📋 Transaction ${txId} now has ${updatedTx.events.length} events`);
          return updatedTx;
        }
        return tx;
      });
      
      console.log(`🔄 Updated transactions state with new event`);
      return updated;
    });
  }, []); // Pas de dépendances car on utilise setTransactions avec une fonction

  // Les événements sont maintenant capturés directement depuis les transactions finalisées
  // Plus besoin d'EventService global

  const addTransaction = (transaction: Omit<TransactionHistory, 'id' | 'timestamp'>): string => {
    const id = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newTransaction: TransactionHistory = {
      ...transaction,
      id,
      timestamp: Date.now(),
    };

    setTransactions(prev => {
      const updated = [newTransaction, ...prev];
      // Garder seulement les MAX_HISTORY_SIZE dernières transactions
      return updated.slice(0, MAX_HISTORY_SIZE);
    });

    return id;
  };

  const updateTransaction = (id: string, updates: Partial<TransactionHistory>) => {
    setTransactions(prev =>
      prev.map(tx =>
        tx.id === id ? { ...tx, ...updates } : tx
      )
    );
  };

  const clearHistory = () => {
    setTransactions([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('Cleared transaction history from localStorage');
    } catch (error) {
      console.warn('Failed to clear transaction history from localStorage:', error);
    }
  };

  const getTransactionsByCall = (call: string): TransactionHistory[] => {
    return transactions.filter(tx => tx.call === call);
  };

  const getGameEvents = (): GameEvent[] => {
    const allEvents: GameEvent[] = [];
    transactions.forEach(tx => {
      if (tx.events) {
        allEvents.push(...tx.events);
      }
    });
    return allEvents.sort((a, b) => b.timestamp - a.timestamp);
  };

  // Fonction de debug pour vérifier le localStorage
  const debugLocalStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      console.log('localStorage content:', stored);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('Parsed localStorage:', parsed);
        console.log('Number of transactions in localStorage:', parsed.length);
      }
      console.log('Current state - transactions:', transactions.length);
      console.log('Current state - isInitialized:', isInitialized);
    } catch (error) {
      console.error('Error reading localStorage:', error);
    }
  };

  // Exposer la fonction de debug
  (window as any).debugTransactionHistory = debugLocalStorage;

  const value: TransactionHistoryContextType = {
    transactions,
    addTransaction,
    updateTransaction,
    addEventToTransaction,
    clearHistory,
    getTransactionsByCall,
    getGameEvents,
  };

  return (
    <TransactionHistoryContext.Provider value={value}>
      {children}
    </TransactionHistoryContext.Provider>
  );
};

export const useTransactionHistory = (): TransactionHistoryContextType => {
  const context = useContext(TransactionHistoryContext);
  if (context === undefined) {
    throw new Error('useTransactionHistory must be used within a TransactionHistoryProvider');
  }
  return context;
};
