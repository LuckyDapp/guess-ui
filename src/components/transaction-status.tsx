import React, { useEffect, useState } from 'react';
import { Box, LinearProgress, Typography, Paper, Chip } from '@mui/material';
import { CheckCircle, Error, Schedule, Send } from '@mui/icons-material';
import { BlockchainLoader } from './blockchain-loader';

export type TransactionState = 'pending' | 'submitted' | 'finalized' | 'error';

interface TransactionStatusProps {
  id: string;
  state: TransactionState;
  message: string;
  txHash?: string;
  error?: string;
  onComplete?: () => void;
}

export function TransactionStatus({
  id,
  state,
  message,
  txHash,
  error,
  onComplete
}: TransactionStatusProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (state === 'pending' || state === 'submitted') {
      const timer = setInterval(() => {
        setProgress((oldProgress) => {
          if (oldProgress >= 90) {
            return 90; // Cap at 90% until finalized
          }
          return Math.min(oldProgress + Math.random() * 15, 90);
        });
      }, 500);

      return () => {
        clearInterval(timer);
      };
    } else if (state === 'finalized') {
      setProgress(100);
      setTimeout(() => {
        onComplete?.();
      }, 2000);
    }
  }, [state, onComplete]);

  const getStateIcon = () => {
    switch (state) {
      case 'pending':
        return <Schedule color="action" />;
      case 'submitted':
        return <Send color="primary" />;
      case 'finalized':
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
      default:
        return <Schedule color="action" />;
    }
  };

  const getStateColor = () => {
    switch (state) {
      case 'pending':
        return '#ff9800';
      case 'submitted':
        return '#2196f3';
      case 'finalized':
        return '#4caf50';
      case 'error':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  const getStateLabel = () => {
    switch (state) {
      case 'pending':
        return 'Preparing...';
      case 'submitted':
        return 'Submitted';
      case 'finalized':
        return 'Confirmed';
      case 'error':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        mb: 2,
        borderLeft: `4px solid ${getStateColor()}`,
        background: 'rgba(25, 27, 31, 0.95)',
        backdropFilter: 'blur(10px)',
        minWidth: '300px'
      }}
    >
      <Box display="flex" alignItems="center" mb={1}>
        {getStateIcon()}
        <Typography variant="h6" sx={{ ml: 1, color: 'white' }}>
          Transaction Status
        </Typography>
        <Chip
          label={getStateLabel()}
          size="small"
          sx={{
            ml: 'auto',
            backgroundColor: getStateColor(),
            color: 'white'
          }}
        />
      </Box>

      <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 2 }}>
        {message}
      </Typography>

      {(state === 'pending' || state === 'submitted') && (
        <Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: getStateColor(),
                borderRadius: 4
              }
            }}
          />
          <Typography variant="caption" sx={{ color: '#888', mt: 1, display: 'block' }}>
            {state === 'pending' ? 'Preparing transaction...' : 'Waiting for confirmation...'}
          </Typography>
        </Box>
      )}

      {state === 'submitted' && (
        <Box mt={2}>
          <BlockchainLoader
            message="Processing on blockchain..."
            size="small"
          />
        </Box>
      )}

      {txHash && (
        <Typography
          variant="caption"
          sx={{
            color: '#64b5f6',
            mt: 1,
            display: 'block',
            wordBreak: 'break-all',
            cursor: 'pointer'
          }}
          onClick={() => navigator.clipboard.writeText(txHash)}
        >
          Hash: {txHash}
        </Typography>
      )}

      {error && (
        <Typography
          variant="body2"
          sx={{
            color: '#f44336',
            mt: 1,
            p: 1,
            backgroundColor: 'rgba(244, 67, 54, 0.1)',
            borderRadius: 1
          }}
        >
          Error: {error}
        </Typography>
      )}
    </Paper>
  );
}

// Hook for managing transaction status
export function useTransactionStatus() {
  const [transactions, setTransactions] = useState<Map<string, TransactionStatusProps>>(new Map());

  const addTransaction = (id: string, initialState: TransactionState, message: string) => {
    setTransactions(prev => new Map(prev.set(id, {
      id,
      state: initialState,
      message
    })));
  };

  const updateTransaction = (id: string, updates: Partial<TransactionStatusProps>) => {
    setTransactions(prev => {
      const current = prev.get(id);
      if (!current) return prev;

      return new Map(prev.set(id, { ...current, ...updates }));
    });
  };

  const removeTransaction = (id: string) => {
    setTransactions(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  };

  return {
    transactions: Array.from(transactions.values()),
    addTransaction,
    updateTransaction,
    removeTransaction
  };
}