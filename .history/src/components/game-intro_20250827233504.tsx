import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { Shuffle, Security, Cloud } from '@mui/icons-material';

export function GameIntro() {
    return (
        <Box className="flex items-center justify-center fade-in">
            <Box
                className="content-block"
                sx={{
                    textAlign: 'center',
                    p: { xs: 3, sm: 4 },
                    borderRadius: '20px',
                    maxWidth: '600px'
                }}
            >
                <Typography
                    variant="h4"
                    sx={{
                        color: '#64b5f6',
                        fontWeight: 700,
                        mb: 2,
                        fontSize: { xs: '1.5rem', sm: '2rem' }
                    }}
                >
                    🔮 Guess the Number
                </Typography>

                <Typography
                    variant="body1"
                    sx={{
                        color: '#b0b0b0',
                        mb: 3,
                        fontSize: { xs: '0.9rem', sm: '1rem' },
                        lineHeight: 1.6
                    }}
                >
                    A random number is generated using Verifiable Random Function (VRF) technology.
                    Your challenge: find it through intelligent guessing!
                </Typography>

                <Box sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 2,
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexWrap: 'wrap'
                }}>
                    <Chip
                        icon={<Shuffle />}
                        label="VRF Generated"
                        variant="outlined"
                        sx={{
                            borderColor: '#64b5f6',
                            color: '#64b5f6',
                            '& .MuiChip-icon': { color: '#64b5f6' }
                        }}
                    />
                    <Chip
                        icon={<Security />}
                        label="Blockchain Secure"
                        variant="outlined"
                        sx={{
                            borderColor: '#4caf50',
                            color: '#4caf50',
                            '& .MuiChip-icon': { color: '#4caf50' }
                        }}
                    />
                    <Chip
                        icon={<Cloud />}
                        label="Phala Cloud"
                        variant="outlined"
                        sx={{
                            borderColor: '#ff9800',
                            color: '#ff9800',
                            '& .MuiChip-icon': { color: '#ff9800' }
                        }}
                    />
                </Box>
            </Box>
        </Box>
    );
}

