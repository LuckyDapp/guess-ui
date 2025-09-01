import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Box } from '@mui/material';
import { TransactionStatus, useTransactionStatus, TransactionState } from './transaction-status';

interface TransactionContextType {
  addTransaction: (id: string, state: TransactionState, message: string) => void;
  updateTransaction: (id: string, updates: any) => void;
  removeTransaction: (id: string) => void;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const { transactions, addTransaction, updateTransaction, removeTransaction } = useTransactionStatus();

  return (
    <TransactionContext.Provider value={{ addTransaction, updateTransaction, removeTransaction }}>
      {children}
      <Box
        sx={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 1000,
          maxWidth: '400px'
        }}
      >
        {transactions.map((tx) => (
          <TransactionStatus
            key={tx.id}
            {...tx}
            onComplete={() => removeTransaction(tx.id)}
          />
        ))}
      </Box>
    </TransactionContext.Provider>
  );
}

export function useTransactionContext() {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactionContext must be used within TransactionProvider');
  }
  return context;
}