import React, { useState, useEffect } from 'react';
import { Box, Typography, Chip, LinearProgress, Fade } from '@mui/material';
import { Wifi, WifiOff, Sync, CheckCircle, Error, AccountBalance } from '@mui/icons-material';
import { useChainId } from '@reactive-dot/react';

interface BlockchainStatusProps {
  showDetails?: boolean;
  compact?: boolean;
}

export function BlockchainStatus({ showDetails = false, compact = false }: BlockchainStatusProps) {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [networkName, setNetworkName] = useState<string>('Unknown');
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  const chainId = useChainId();

  // Simulate connection status monitoring
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Simulate network check
        const isConnected = Math.random() > 0.1; // 90% success rate for demo
        setConnectionStatus(isConnected ? 'connected' : 'disconnected');

        if (isConnected) {
          setNetworkName(chainId === 'pop' ? 'Pop Network' : 'Unknown Network');
          setBlockNumber(Math.floor(Math.random() * 1000000) + 1000000);
          setLatency(Math.floor(Math.random() * 200) + 50);
        }
      } catch (error) {
        setConnectionStatus('error');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [chainId]);

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi sx={{ color: '#4caf50' }} />;
      case 'connecting':
        return <Sync sx={{ color: '#ff9800', animation: 'spin 1s linear infinite' }} />;
      case 'disconnected':
        return <WifiOff sx={{ color: '#f44336' }} />;
      case 'error':
        return <Error sx={{ color: '#f44336' }} />;
      default:
        return <AccountBalance sx={{ color: '#64b5f6' }} />;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return '#4caf50';
      case 'connecting':
        return '#ff9800';
      case 'disconnected':
        return '#f44336';
      case 'error':
        return '#f44336';
      default:
        return '#64b5f6';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  };

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {getStatusIcon()}
        <Typography variant="body2" sx={{ color: getStatusColor(), fontWeight: 500 }}>
          {networkName}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '12px',
      p: 2,
      border: `1px solid ${getStatusColor()}33`
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getStatusIcon()}
          <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
            Network Status
          </Typography>
        </Box>
        <Chip
          label={getStatusText()}
          sx={{
            backgroundColor: `${getStatusColor()}22`,
            color: getStatusColor(),
            border: `1px solid ${getStatusColor()}66`
          }}
          size="small"
        />
      </Box>

      <Fade in={connectionStatus === 'connected'}>
        <Box>
          <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 1 }}>
            Network: <span style={{ color: '#64b5f6' }}>{networkName}</span>
          </Typography>

          {blockNumber && (
            <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 1 }}>
              Block: <span style={{ color: '#4caf50', fontFamily: 'monospace' }}>#{blockNumber.toLocaleString()}</span>
            </Typography>
          )}

          {latency && (
            <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 2 }}>
              Latency: <span style={{ color: latency < 100 ? '#4caf50' : latency < 200 ? '#ff9800' : '#f44336' }}>{latency}ms</span>
            </Typography>
          )}

          {/* Connection quality indicator */}
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ color: '#888', mb: 0.5, display: 'block' }}>
              Connection Quality
            </Typography>
            <LinearProgress
              variant="determinate"
              value={latency ? Math.max(0, 100 - (latency / 5)) : 0}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: latency && latency < 100 ? '#4caf50' : latency && latency < 200 ? '#ff9800' : '#f44336',
                  borderRadius: 3
                }
              }}
            />
          </Box>
        </Box>
      </Fade>

      {connectionStatus === 'connecting' && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ color: '#ff9800', mb: 1 }}>
            Establishing connection to blockchain network...
          </Typography>
          <LinearProgress
            sx={{
              height: 4,
              borderRadius: 2,
              backgroundColor: 'rgba(255, 152, 0, 0.2)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#ff9800',
                borderRadius: 2
              }
            }}
          />
        </Box>
      )}

      {(connectionStatus === 'disconnected' || connectionStatus === 'error') && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ color: '#f44336' }}>
            {connectionStatus === 'disconnected'
              ? 'Network connection lost. Please check your internet connection.'
              : 'Failed to connect to network. Please try again.'}
          </Typography>
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
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}