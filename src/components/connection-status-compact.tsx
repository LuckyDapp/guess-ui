import React, { useState } from 'react';
import { Box, Button, Popover, Typography, Chip } from '@mui/material';
import { ConnectionStatus, NetworkInfo } from './connection-status';
import { Wifi, WifiOff, ExpandMore, ExpandLess } from '@mui/icons-material';

export function ConnectionStatusCompact() {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [isConnected, setIsConnected] = useState(true); // TODO: Get real connection status

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <Button
        onClick={handleClick}
        variant="outlined"
        size="small"
        sx={{
          minWidth: 'auto',
          padding: '6px 12px',
          borderColor: isConnected ? '#4caf50' : '#f44336',
          color: isConnected ? '#4caf50' : '#f44336',
          '&:hover': {
            borderColor: isConnected ? '#4caf50' : '#f44336',
            backgroundColor: isConnected ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
          }
        }}
        endIcon={open ? <ExpandLess /> : <ExpandMore />}
      >
        {isConnected ? <Wifi fontSize="small" /> : <WifiOff fontSize="small" />}
        <Typography variant="body2" sx={{ ml: 1, display: { xs: 'none', sm: 'inline' } }}>
          {isConnected ? 'Connected' : 'Disconnected'}
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
                backgroundColor: isConnected ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                color: isConnected ? '#4caf50' : '#f44336',
                border: `1px solid ${isConnected ? '#4caf50' : '#f44336'}`
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