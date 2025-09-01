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
import { Box, Button, ButtonGroup } from "@mui/material";
import { Games, BugReport, AccountBalance } from "@mui/icons-material";

export function App() {
    const [currentPage, setCurrentPage] = useState<'game' | 'debug' | 'explorer'>('game');

    return (
        <ReactiveDotProvider config={config}>
            <Suspense fallback="Loading wallet connection...">
                <ConnectionButton/>
            </Suspense>
            <ChainProvider chainId="pop">
                {/* Make sure there is at least one Suspense boundary wrapping the app */}
                <Suspense>
                    <AccountSelect >
                        {(selectedAccount) => (
                            <SignerProvider signer={selectedAccount.polkadotSigner}>
                                <TransactionProvider>
                                    {/* Navigation */}
                                    <Box sx={{
                                        position: 'fixed',
                                        top: 20,
                                        left: 20,
                                        zIndex: 1000,
                                        background: 'rgba(25, 27, 31, 0.95)',
                                        backdropFilter: 'blur(20px)',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        p: 1
                                    }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
                                    </Box>

                                    {/* Connection Status Header */}
                                    <Box sx={{
                                        padding: '20px',
                                        maxWidth: '800px',
                                        margin: '0 auto',
                                        pt: 8 // Add top padding to account for fixed navigation
                                    }}>
                                        <ConnectionStatus />
                                        <NetworkInfo />
                                    </Box>

                                    {/* Page Content */}
                                    {currentPage === 'game' ? (
                                        <GameContextProvider>
                                            <Game/>
                                        </GameContextProvider>
                                    ) : (
                                        <DebugPage />
                                    )}
                                </TransactionProvider>
                            </SignerProvider>
                        )}
                    </AccountSelect>
                </Suspense>
            </ChainProvider>
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