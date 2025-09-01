import React from 'react';
import { Box, Typography } from '@mui/material';
import './blockchain-loader.css';

interface BlockchainLoaderProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

export function BlockchainLoader({
  message = "Processing on Phala Cloud...",
  size = 'medium'
}: BlockchainLoaderProps) {
  const sizeClasses = {
    small: 'blockchain-loader-small',
    medium: 'blockchain-loader-medium',
    large: 'blockchain-loader-large'
  };

  return (
    <Box className={`blockchain-loader-container ${sizeClasses[size]}`}>
      <div className="blockchain-loader">
        <div className="blockchain-nodes">
          <div className="node node-1"></div>
          <div className="node node-2"></div>
          <div className="node node-3"></div>
          <div className="node node-4"></div>
          <div className="node node-5"></div>
        </div>
        <div className="blockchain-chains">
          <div className="chain chain-1"></div>
          <div className="chain chain-2"></div>
          <div className="chain chain-3"></div>
          <div className="chain chain-4"></div>
        </div>
        <div className="particles">
          <div className="particle particle-1"></div>
          <div className="particle particle-2"></div>
          <div className="particle particle-3"></div>
          <div className="particle particle-4"></div>
          <div className="particle particle-5"></div>
          <div className="particle particle-6"></div>
        </div>
      </div>
      <Typography
        variant="body2"
        className="blockchain-loader-message"
        sx={{
          color: '#64b5f6',
          textAlign: 'center',
          mt: 2,
          fontFamily: 'Poppins, sans-serif',
          fontWeight: 300
        }}
      >
        {message}
      </Typography>
    </Box>
  );
}