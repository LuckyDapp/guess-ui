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
  const [connectionHealth, setConnectionHealth] = useState<{
    status: 'good' | 'fair' | 'poor';
    latency: number;
    blockHeight: number;
    peers: number;
    lastBlockTime: number;
  }>({
    status: 'good',
    latency: 0,
    blockHeight: 0,
    peers: 0,
    lastBlockTime: 0
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Enhanced connection health monitoring
    const healthCheck = setInterval(async () => {
      if (!chainId) return;

      try {
        const startTime = Date.now();

        // Simulate blockchain health check (in real app, this would be actual RPC calls)
        const simulatedLatency = Math.random() * 500 + 50; // 50-550ms
        const simulatedPeers = Math.floor(Math.random() * 50) + 10; // 10-60 peers
        const simulatedBlockHeight = 1000000 + Math.floor(Math.random() * 1000);

        const latency = Date.now() - startTime;

        // Calculate health score based on multiple factors
        const latencyScore = Math.max(0, 1 - (latency / 1000)); // Better if < 1s
        const peerScore = Math.min(1, simulatedPeers / 30); // Better if > 30 peers
        const overallScore = (latencyScore + peerScore) / 2;

        let status: 'good' | 'fair' | 'poor';
        if (overallScore > 0.7) status = 'good';
        else if (overallScore > 0.4) status = 'fair';
        else status = 'poor';

        setConnectionHealth({
          status,
          latency: Math.round(simulatedLatency),
          blockHeight: simulatedBlockHeight,
          peers: simulatedPeers,
          lastBlockTime: Date.now() - Math.random() * 60000 // Within last minute
        });

      } catch (error) {
        setConnectionHealth(prev => ({ ...prev, status: 'poor' }));
      }
    }, 3000); // Check every 3 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(healthCheck);
    };
  }, [chainId]);

  const getConnectionColor = () => {
    if (!isOnline) return '#f44336';
    if (!signer) return '#ff9800';
    if (!chainId) return '#ff9800';
    switch (connectionHealth.status) {
      case 'good': return '#4caf50';
      case 'fair': return '#ff9800';
      case 'poor': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getConnectionStatus = () => {
    if (!isOnline) return { text: 'Offline', icon: <WifiOff />, variant: 'error' as const };
    if (!signer) return { text: 'Not Connected', icon: <AccountCircle />, variant: 'warning' as const };
    if (!chainId) return { text: 'Connecting...', icon: <LinkOff />, variant: 'warning' as const };

    const networkName = chainId === 'pah' ? 'PASETO' : chainId === 'pop' ? 'Pop' : String(chainId).toUpperCase();
    return {
      text: `${networkName} ✓`,
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
          },
          fontSize: '0.75rem',
          height: '28px'
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
            Network: <span style={{ color: '#64b5f6' }}>{chainId === 'pah' ? 'PASETO (Polkadot)' : chainId === 'pop' ? 'Pop Network (Polkadot)' : String(chainId).toUpperCase()}</span><br/>
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
              {connectionHealth.status.toUpperCase()}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={connectionHealth.status === 'good' ? 100 : connectionHealth.status === 'fair' ? 60 : 30}
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

          {/* Detailed Health Metrics */}
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <Typography variant="caption" sx={{ color: '#888', mb: 1, display: 'block' }}>
              Network Metrics
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#888', fontSize: '0.7rem' }}>
                  Latency
                </Typography>
                <Typography variant="body2" sx={{ color: connectionHealth.latency < 200 ? '#4caf50' : connectionHealth.latency < 500 ? '#ff9800' : '#f44336' }}>
                  {connectionHealth.latency}ms
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#888', fontSize: '0.7rem' }}>
                  Peers
                </Typography>
                <Typography variant="body2" sx={{ color: connectionHealth.peers > 20 ? '#4caf50' : connectionHealth.peers > 10 ? '#ff9800' : '#f44336' }}>
                  {connectionHealth.peers}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#888', fontSize: '0.7rem' }}>
                  Block Height
                </Typography>
                <Typography variant="body2" sx={{ color: '#64b5f6', fontFamily: 'monospace' }}>
                  #{connectionHealth.blockHeight.toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#888', fontSize: '0.7rem' }}>
                  Last Block
                </Typography>
                <Typography variant="body2" sx={{ color: Date.now() - connectionHealth.lastBlockTime < 30000 ? '#4caf50' : '#ff9800' }}>
                  {Math.round((Date.now() - connectionHealth.lastBlockTime) / 1000)}s ago
                </Typography>
              </Box>
            </Box>
          </Box>
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
    pah: {
      name: 'PASETO Network',
      type: 'Polkadot Parachain',
      rpc: 'wss://testnet-passet-hub.polkadot.io',
      description: 'Decentralized gaming network powered by Phala Cloud'
    },
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