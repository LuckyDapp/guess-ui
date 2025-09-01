import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { Shuffle, Security, Cloud } from '@mui/icons-material';

export function GameIntro() {
    return (
        <Box className="flex items-center justify-center fade-in">
            <Box
                className="content-block pulse"
                sx={{
                    textAlign: 'center',
                    p: { xs: 2, sm: 3 },
                    borderRadius: '20px',
                    maxWidth: '700px',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: 'linear-gradient(90deg, #64b5f6, #4caf50, #ff9800)',
                        borderRadius: '20px 20px 0 0'
                    }
                }}
            >
                <Typography
                    variant="h4"
                    sx={{
                        color: '#64b5f6',
                        fontWeight: 700,
                        mb: 2,
                        fontSize: { xs: '1.25rem', sm: '1.75rem' },
                        background: 'linear-gradient(135deg, #64b5f6, #4caf50)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}
                >
                    🎯 Guess the Number
                </Typography>

                <Typography
                    variant="body1"
                    sx={{
                        color: '#b0b0b0',
                        mb: 3,
                        fontSize: { xs: '0.85rem', sm: '0.95rem' },
                        lineHeight: 1.6,
                        maxWidth: '500px',
                        mx: 'auto'
                    }}
                >
                    Challenge yourself with blockchain-powered random number generation!
                    Use strategy to find the secret number in the fewest attempts.
                </Typography>

                <Box sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 1.5,
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexWrap: 'wrap'
                }}>
                    <Chip
                        icon={<Shuffle />}
                        label="VRF Random"
                        variant="outlined"
                        sx={{
                            borderColor: '#64b5f6',
                            color: '#64b5f6',
                            '& .MuiChip-icon': { color: '#64b5f6' },
                            fontSize: '0.75rem',
                            height: '32px'
                        }}
                        size="small"
                    />
                    <Chip
                        icon={<Security />}
                        label="Secure"
                        variant="outlined"
                        sx={{
                            borderColor: '#4caf50',
                            color: '#4caf50',
                            '& .MuiChip-icon': { color: '#4caf50' },
                            fontSize: '0.75rem',
                            height: '32px'
                        }}
                        size="small"
                    />
                    <Chip
                        icon={<Cloud />}
                        label="Phala"
                        variant="outlined"
                        sx={{
                            borderColor: '#ff9800',
                            color: '#ff9800',
                            '& .MuiChip-icon': { color: '#ff9800' },
                            fontSize: '0.75rem',
                            height: '32px'
                        }}
                        size="small"
                    />
                </Box>
            </Box>
        </Box>
    );
}

