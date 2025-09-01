import {config} from "../config";
import "../styles/globals.css";
import {ChainProvider, ReactiveDotProvider, SignerProvider} from "@reactive-dot/react";
import {Suspense, useState} from "react";
import {ConnectionButton} from "dot-connect/react.js";
import {Game} from "./game.tsx";
import {DebugPage} from "./debug-page.tsx";
import {ContractExplorer} from "./contract-explorer.tsx";
import {Toaster} from "react-hot-toast";
import {GameContextProvider} from "../contexts/game-context.tsx";
import {AccountSelect} from "./account-select.tsx";
import {TransactionProvider} from "./transaction-provider.tsx";
import {ConnectionStatus, NetworkInfo} from "./connection-status.tsx";
import { Box, Button, ButtonGroup, AppBar, Toolbar, Typography } from "@mui/material";
import { Games, BugReport, AccountBalance, SmartToy } from "@mui/icons-material";

export function App() {
    const [currentPage, setCurrentPage] = useState<'game' | 'debug' | 'explorer'>('game');

    return (
        <ReactiveDotProvider config={config}>
            <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #101010 0%, #1a1a1a 50%, #101010 100%)' }}>
                {/* Top Navigation Bar */}
                <AppBar
                    position="fixed"
                    sx={{
                        background: 'rgba(25, 27, 31, 0.95)',
                        backdropFilter: 'blur(20px)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        zIndex: 1100
                    }}
                >
                    <Toolbar sx={{ justifyContent: 'space-between' }}>
                        {/* Logo and Title */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <SmartToy sx={{ color: '#64b5f6', fontSize: '2rem' }} />
                            <Typography
                                variant="h6"
                                sx={{
                                    color: '#64b5f6',
                                    fontWeight: 700,
                                    fontSize: { xs: '1rem', sm: '1.25rem' }
                                }}
                            >
                                Guess the Number
                            </Typography>
                        </Box>

                        {/* Navigation Buttons */}
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                startIcon={<Games />}
                                onClick={() => setCurrentPage('game')}
                                variant={currentPage === 'game' ? 'contained' : 'outlined'}
                                size="small"
                                sx={{
                                    color: currentPage === 'game' ? 'white' : '#64b5f6',
                                    borderColor: '#64b5f6',
                                    '&:hover': {
                                        borderColor: '#1976d2',
                                        backgroundColor: currentPage === 'game' ? '#1976d2' : 'rgba(100, 181, 246, 0.1)'
                                    }
                                }}
                            >
                                Game
                            </Button>
                            <Button
                                startIcon={<AccountBalance />}
                                onClick={() => setCurrentPage('explorer')}
                                variant={currentPage === 'explorer' ? 'contained' : 'outlined'}
                                size="small"
                                sx={{
                                    color: currentPage === 'explorer' ? 'white' : '#4caf50',
                                    borderColor: '#4caf50',
                                    '&:hover': {
                                        borderColor: '#2e7d32',
                                        backgroundColor: currentPage === 'explorer' ? '#2e7d32' : 'rgba(76, 175, 80, 0.1)'
                                    }
                                }}
                            >
                                Explorer
                            </Button>
                            <Button
                                startIcon={<BugReport />}
                                onClick={() => setCurrentPage('debug')}
                                variant={currentPage === 'debug' ? 'contained' : 'outlined'}
                                size="small"
                                sx={{
                                    color: currentPage === 'debug' ? 'white' : '#ff9800',
                                    borderColor: '#ff9800',
                                    '&:hover': {
                                        borderColor: '#f57c00',
                                        backgroundColor: currentPage === 'debug' ? '#f57c00' : 'rgba(255, 152, 0, 0.1)'
                                    }
                                }}
                            >
                                Debug
                            </Button>
                        </Box>

                        {/* Connection Status and Wallet Button */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <ConnectionStatus compact={true} />
                            <Suspense fallback={
                                <Button
                                    variant="outlined"
                                    size="small"
                                    disabled
                                    sx={{ borderColor: '#64b5f6', color: '#64b5f6' }}
                                >
                                    Loading...
                                </Button>
                            }>
                                <ConnectionButton />
                            </Suspense>
                        </Box>
                    </Toolbar>
                </AppBar>

                {/* Main Content */}
                <Box sx={{ pt: 10, minHeight: '100vh' }}>
                    <ChainProvider chainId="pop">
                        <Suspense>
                            <AccountSelect>
                                {(selectedAccount) => (
                                    <SignerProvider signer={selectedAccount.polkadotSigner}>
                                        <TransactionProvider>
                                            {/* Connection Status Header */}
                                            <Box sx={{
                                                padding: '20px',
                                                maxWidth: '1200px',
                                                margin: '0 auto'
                                            }}>
                                                <ConnectionStatus />
                                                <NetworkInfo />
                                            </Box>

                                            {/* Page Content */}
                                            <Box sx={{ px: 2 }}>
                                                {currentPage === 'game' && (
                                                    <GameContextProvider>
                                                        <Game/>
                                                    </GameContextProvider>
                                                )}
                                                {currentPage === 'explorer' && (
                                                    <ContractExplorer />
                                                )}
                                                {currentPage === 'debug' && (
                                                    <DebugPage />
                                                )}
                                            </Box>
                                        </TransactionProvider>
                                    </SignerProvider>
                                )}
                            </AccountSelect>
                        </Suspense>
                    </ChainProvider>
                </Box>
            </Box>

            <Toaster
                position="bottom-right"
                toastOptions={{
                    className: "custom-toast",
                    style: {
                        background: '#363636',
                        color: '#fff',
                    },
                    success: {
                        style: {
                            background: 'green',
                        },
                    },
                    error: {
                        style: {
                            background: 'red',
                        },
                    },
                }}
            />
        </ReactiveDotProvider>
    );
}