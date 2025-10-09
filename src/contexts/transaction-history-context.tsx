import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { TransactionHistory, TransactionHistoryContextType } from '../types';

const TransactionHistoryContext = createContext<TransactionHistoryContextType | undefined>(undefined);

interface TransactionHistoryProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = 'guess-the-number-transaction-history';
const MAX_HISTORY_SIZE = 100; // Limiter l'historique à 100 transactions

export const TransactionHistoryProvider = ({ children }: TransactionHistoryProviderProps) => {
  const [transactions, setTransactions] = useState<TransactionHistory[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fonction pour sérialiser les bigint
  const serializeTransactions = (txs: TransactionHistory[]): string => {
    return JSON.stringify(txs, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    });
  };

  // Fonction pour désérialiser les bigint
  const deserializeTransactions = (data: string): TransactionHistory[] => {
    return JSON.parse(data, (key, value) => {
      // Convertir les strings qui ressemblent à des bigint en bigint
      if (typeof value === 'string' && /^\d+$/.test(value) && value.length > 15) {
        return BigInt(value);
      }
      return value;
    });
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
    clearHistory,
    getTransactionsByCall,
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
