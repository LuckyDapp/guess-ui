import React from 'react';
import { Box, Typography, LinearProgress, Chip } from '@mui/material';
import { CheckCircle, Error, Pending, AccountBalance } from '@mui/icons-material';

interface BlockchainToastProps {
  type: 'success' | 'error' | 'loading' | 'info';
  title: string;
  message: string;
  txHash?: string;
  progress?: number;
  duration?: number;
}

export function BlockchainToast({
  type,
  title,
  message,
  txHash,
  progress,
  duration
}: BlockchainToastProps) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle sx={{ color: '#4caf50', mr: 1 }} />;
      case 'error':
        return <Error sx={{ color: '#f44336', mr: 1 }} />;
      case 'loading':
        return <Pending sx={{ color: '#ff9800', mr: 1, animation: 'spin 1s linear infinite' }} />;
      case 'info':
        return <AccountBalance sx={{ color: '#2196f3', mr: 1 }} />;
      default:
        return null;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'rgba(76, 175, 80, 0.1)';
      case 'error':
        return 'rgba(244, 67, 54, 0.1)';
      case 'loading':
        return 'rgba(255, 152, 0, 0.1)';
      case 'info':
        return 'rgba(33, 150, 243, 0.1)';
      default:
        return 'rgba(255, 255, 255, 0.1)';
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return '#4caf50';
      case 'error':
        return '#f44336';
      case 'loading':
        return '#ff9800';
      case 'info':
        return '#2196f3';
      default:
        return '#64b5f6';
    }
  };

  return (
    <Box
      sx={{
        minWidth: 300,
        maxWidth: 400,
        backgroundColor: '#1a1a1a',
        border: `1px solid ${getBorderColor()}`,
        borderRadius: '12px',
        p: 2,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(10px)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Animated background for loading state */}
      {type === 'loading' && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(90deg, transparent, rgba(255, 152, 0, 0.1), transparent)',
            animation: 'shimmer 2s infinite'
          }}
        />
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        {getIcon()}
        <Typography
          variant="subtitle2"
          sx={{
            color: 'white',
            fontWeight: 600,
            fontSize: '0.875rem'
          }}
        >
          {title}
        </Typography>
      </Box>

      <Typography
        variant="body2"
        sx={{
          color: '#b0b0b0',
          fontSize: '0.75rem',
          mb: txHash || progress !== undefined ? 1 : 0
        }}
      >
        {message}
      </Typography>

      {/* Transaction hash */}
      {txHash && (
        <Box sx={{ mb: 1 }}>
          <Typography
            variant="caption"
            sx={{
              color: '#64b5f6',
              fontFamily: 'monospace',
              fontSize: '0.7rem',
              wordBreak: 'break-all'
            }}
          >
            {txHash.length > 20 ? `${txHash.slice(0, 10)}...${txHash.slice(-8)}` : txHash}
          </Typography>
        </Box>
      )}

      {/* Progress bar for loading state */}
      {progress !== undefined && (
        <Box sx={{ mt: 1 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 4,
              borderRadius: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: getBorderColor(),
                borderRadius: 2
              }
            }}
          />
          <Typography
            variant="caption"
            sx={{
              color: '#888',
              fontSize: '0.7rem',
              mt: 0.5,
              display: 'block',
              textAlign: 'center'
            }}
          >
            {progress}%
          </Typography>
        </Box>
      )}

      {/* Duration indicator */}
      {duration && (
        <Box sx={{ position: 'absolute', bottom: 4, right: 8 }}>
          <Chip
            label={`${duration}s`}
            size="small"
            sx={{
              height: 16,
              fontSize: '0.6rem',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#b0b0b0'
            }}
          />
        </Box>
      )}
    </Box>
  );
}

// CSS for animations
const styles = `
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}