import React, { useEffect, useState } from 'react';
import { Box, Chip, Typography, Paper, LinearProgress } from '@mui/material';
import { Wifi, WifiOff, AccountCircle, Link, LinkOff } from '@mui/icons-material';
import { useChainId, useSigner } from '@reactive-dot/react';
import { encodeAddress } from '@polkadot/keyring';
import { BlockchainLoader } from './blockchain-loader';

interface ConnectionStatusProps {
  compact?: boolean;
}

export function ConnectionStatus({ compact = false }: ConnectionStatusProps) {
  const chainId = useChainId();
  const signer = useSigner();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionHealth, setConnectionHealth] = useState<'good' | 'fair' | 'poor'>('good');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Simulate connection health monitoring
    const healthCheck = setInterval(() => {
      // In a real app, you would ping the blockchain node here
      const health = Math.random();
      if (health > 0.7) setConnectionHealth('good');
      else if (health > 0.4) setConnectionHealth('fair');
      else setConnectionHealth('poor');
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(healthCheck);
    };
  }, []);

  const getConnectionColor = () => {
    if (!isOnline) return '#f44336';
    if (!signer) return '#ff9800';
    if (!chainId) return '#ff9800';
    switch (connectionHealth) {
      case 'good': return '#4caf50';
      case 'fair': return '#ff9800';
      case 'poor': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getConnectionStatus = () => {
    if (!isOnline) return { text: 'Offline', icon: <WifiOff />, variant: 'error' as const };
    if (!signer) return { text: 'Wallet Not Connected', icon: <AccountCircle />, variant: 'warning' as const };
    if (!chainId) return { text: 'Connecting to Network...', icon: <LinkOff />, variant: 'warning' as const };

    const networkName = chainId === 'pop' ? 'Pop Network' : String(chainId).toUpperCase();
    return {
      text: `Connected to ${networkName}`,
      icon: <Link />,
      variant: 'success' as const
    };
  };

  const status = getConnectionStatus();

  if (compact) {
    return (
      <Chip
        icon={status.icon}
        label={status.text}
        variant="outlined"
        sx={{
          borderColor: getConnectionColor(),
          color: getConnectionColor(),
          '& .MuiChip-icon': {
            color: getConnectionColor()
          }
        }}
        size="small"
      />
    );
  }

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        mb: 2,
        background: 'rgba(25, 27, 31, 0.95)',
        backdropFilter: 'blur(10px)',
        borderLeft: `4px solid ${getConnectionColor()}`
      }}
    >
      <Box display="flex" alignItems="center" mb={1}>
        {status.icon}
        <Typography variant="h6" sx={{ ml: 1, color: 'white' }}>
          Connection Status
        </Typography>
        <Chip
          label={status.text}
          size="small"
          sx={{
            ml: 'auto',
            backgroundColor: getConnectionColor(),
            color: 'white'
          }}
        />
      </Box>

      <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 2 }}>
        {chainId && signer ? (
          <>
            Network: <span style={{ color: '#64b5f6' }}>{chainId === 'pop' ? 'Pop Network (Polkadot)' : String(chainId).toUpperCase()}</span><br/>
            Account: <span style={{ color: '#64b5f6' }}>{encodeAddress(signer.publicKey).slice(0, 6)}...{encodeAddress(signer.publicKey).slice(-4)}</span>
          </>
        ) : (
          'Please connect your wallet and ensure network connectivity'
        )}
      </Typography>

      {isOnline && signer && chainId && (
        <Box>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="caption" sx={{ color: '#888' }}>
              Connection Health
            </Typography>
            <Typography variant="caption" sx={{ color: getConnectionColor() }}>
              {connectionHealth.toUpperCase()}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={connectionHealth === 'good' ? 100 : connectionHealth === 'fair' ? 60 : 30}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: getConnectionColor(),
                borderRadius: 3
              }
            }}
          />
        </Box>
      )}

      {!isOnline && (
        <Box mt={2}>
          <BlockchainLoader
            message="Reconnecting..."
            size="small"
          />
        </Box>
      )}
    </Paper>
  );
}

// Network info component
export function NetworkInfo() {
  const chainId = useChainId();

  if (!chainId) return null;

  const networkInfo = {
    pop: {
      name: 'Pop Network',
      type: 'Polkadot Parachain',
      rpc: 'wss://rpc1.paseo.popnetwork.xyz',
      description: 'Decentralized gaming network powered by Phala Cloud'
    }
  };

  const info = networkInfo[chainId as keyof typeof networkInfo];

  if (!info) return null;

  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        mb: 2,
        background: 'rgba(25, 27, 31, 0.8)',
        backdropFilter: 'blur(10px)'
      }}
    >
      <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
        {info.name} ({info.type})
      </Typography>
      <Typography variant="caption" sx={{ color: '#b0b0b0' }}>
        {info.description}
      </Typography>
    </Paper>
  );
}