import { useCallback } from 'react';
import { useTransactionHistory } from '../contexts/transaction-history-context';
import { getOrCreateContract } from '../contract';
import { useChainId, useSigner } from '@reactive-dot/react';
import type { TransactionHistory } from '../types';

export function useTransactionWithHistory() {
  const { addTransaction, updateTransaction, addEventToTransaction } = useTransactionHistory();
  const chainId = useChainId();
  const signer = useSigner();

  const makeGuessWithHistory = useCallback(async (
    guess: number,
    onSuccess: () => void
  ): Promise<string | null> => {
    if (!signer || !chainId) {
      console.error('No signer or chainId available');
      return null;
    }

    const contract = getOrCreateContract(chainId);
    
    // Créer l'entrée d'historique d'abord
    const txId = addTransaction({
      call: 'guess',
      parameters: { guess },
      status: 'pending'
    });

    console.log('Created transaction with ID:', txId);

    const callback = {
      onSuccess,
      onTransactionCreated: (id: string) => {
        console.log('Transaction created callback called with ID:', id);
        return id;
      },
      onTransactionUpdate: (id: string, updates: Partial<TransactionHistory>) => {
        console.log('Updating transaction:', id, updates);
        updateTransaction(id, updates);
      },
      onBlockEvents: (id: string, events: any[]) => {
        console.log('📦 Block events received for transaction:', id, events);
        events.forEach(event => {
          console.log('🎯 Adding event to transaction:', event);
          addEventToTransaction(id, event);
        });
      }
    };

    try {
      const result = await contract.makeAGuessWithHistory(signer, guess, callback, txId, chainId);
      console.log('Contract method returned:', result);
      return result || txId;
    } catch (error) {
      console.error('Error in makeGuessWithHistory:', error);
      updateTransaction(txId, { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return null;
    }
  }, [signer, chainId, addTransaction, updateTransaction]);

  const startNewGameWithHistory = useCallback(async (
    minNumber: number,
    maxNumber: number,
    onSuccess: () => void
  ): Promise<string | null> => {
    if (!signer || !chainId) {
      console.error('No signer or chainId available');
      return null;
    }

    const contract = getOrCreateContract(chainId);
    
    // Créer l'entrée d'historique d'abord
    const txId = addTransaction({
      call: 'start_new_game',
      parameters: { min_number: minNumber, max_number: maxNumber },
      status: 'pending'
    });

    console.log('Created transaction with ID:', txId);

    const callback = {
      onSuccess,
      onTransactionCreated: (id: string) => {
        console.log('Transaction created callback called with ID:', id);
        return id;
      },
      onTransactionUpdate: (id: string, updates: Partial<TransactionHistory>) => {
        console.log('Updating transaction:', id, updates);
        updateTransaction(id, updates);
      },
      onBlockEvents: (id: string, events: any[]) => {
        console.log('📦 Block events received for transaction:', id, events);
        events.forEach(event => {
          console.log('🎯 Adding event to transaction:', event);
          addEventToTransaction(id, event);
        });
      }
    };

    try {
      const result = await contract.startNewGameWithHistory(signer, minNumber, maxNumber, callback, txId, chainId);
      console.log('Contract method returned:', result);
      return result || txId;
    } catch (error) {
      console.error('Error in startNewGameWithHistory:', error);
      updateTransaction(txId, { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return null;
    }
  }, [signer, chainId, addTransaction, updateTransaction]);

  return {
    makeGuessWithHistory,
    startNewGameWithHistory
  };
}
