import React, { useState } from 'react';
import { Box, Button, Popover, Typography, Chip } from '@mui/material';
import { ConnectionStatus, NetworkInfo } from './connection-status';
import { ExpandMore, ExpandLess } from '@mui/icons-material';

// Composant LED indicateur
function StatusLED({ status }: { status: 'connected' | 'connecting' | 'disconnected' }) {
  const getColor = () => {
    switch (status) {
      case 'connected': return '#4caf50'; // Vert
      case 'connecting': return '#ff9800'; // Orange
      case 'disconnected': return '#f44336'; // Rouge
      default: return '#f44336';
    }
  };

  const color = getColor();

  return (
    <div
      style={{
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        backgroundColor: color,
        boxShadow: `0 0 8px ${color}`,
        flexShrink: 0,
        display: 'inline-block',
        animation: status === 'connected' ? 'pulse 2s infinite' : 'none',
      }}
    />
  );
}

export function ConnectionStatusCompact() {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [isConnected, setIsConnected] = useState(true); // TODO: Get real connection status
  const [isConnecting, setIsConnecting] = useState(false); // TODO: Get real connection status

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  // Détermine le statut pour l'indicateur LED
  const getStatus = (): 'connected' | 'connecting' | 'disconnected' => {
    if (isConnecting) return 'connecting';
    if (isConnected) return 'connected';
    return 'disconnected';
  };

  return (
    <>
      <Button
        onClick={handleClick}
        variant="contained"
        size="small"
        className="connection-status-button"
        sx={{
          minWidth: 'auto',
          padding: '6px 12px',
          backgroundColor: '#d4af37 !important',
          color: '#000000 !important',
          border: 'none !important',
          boxShadow: 'none !important',
          background: '#d4af37 !important',
          '&:hover': {
            backgroundColor: '#b8860b !important',
            background: '#b8860b !important',
            boxShadow: 'none !important',
          },
          '&:focus': {
            backgroundColor: '#d4af37 !important',
            background: '#d4af37 !important',
          },
          '&:active': {
            backgroundColor: '#b8860b !important',
            background: '#b8860b !important',
          }
        }}
        endIcon={open ? <ExpandLess /> : <ExpandMore />}
      >
        <StatusLED status={getStatus()} />
        <Typography variant="body2" sx={{ ml: 1, display: { xs: 'none', sm: 'inline' } }}>
          {getStatus() === 'connected' ? 'Network Status' : getStatus() === 'connecting' ? 'Connecting...' : 'Disconnected'}
        </Typography>
      </Button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
          }
        }}
      >
        <Box sx={{ p: 2, minWidth: 300 }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#d4af37' }}>
            🔗 Connection Status
          </Typography>

          <Box sx={{ mb: 2 }}>
            <ConnectionStatus />
          </Box>

          <Box sx={{ mb: 2 }}>
            <NetworkInfo />
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label="Blockchain"
              size="small"
              sx={{
                backgroundColor: getStatus() === 'connected' ? 'rgba(76, 175, 80, 0.1)' : getStatus() === 'connecting' ? 'rgba(255, 152, 0, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                color: getStatus() === 'connected' ? '#4caf50' : getStatus() === 'connecting' ? '#ff9800' : '#f44336',
                border: `1px solid ${getStatus() === 'connected' ? '#4caf50' : getStatus() === 'connecting' ? '#ff9800' : '#f44336'}`
              }}
            />
            <Chip
              label="PASETO Network"
              size="small"
              sx={{
                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                color: '#d4af37',
                border: '1px solid #d4af37'
              }}
            />
          </Box>
        </Box>
      </Popover>
    </>
  );
}