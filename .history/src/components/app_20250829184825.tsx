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
import { Box, Button, ButtonGroup, AppBar, Toolbar, Typography, Alert } from "@mui/material";
import { Games, BugReport, AccountBalance, SmartToy } from "@mui/icons-material";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";

export function App() {
    const [currentPage, setCurrentPage] = useState<'game' | 'debug' | 'explorer'>('game');

    return (
        <ReactiveDotProvider config={config}>
            <Box sx={{ minHeight: '100vh', backgroundColor: '#101010' }}>
                {/* Simple Top Bar */}
                <Box sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: '#1a1a1a',
                    borderBottom: '1px solid #333',
                    zIndex: 1000,
                    padding: '10px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <Typography variant="h6" sx={{ color: '#64b5f6' }}>
                        Guess the Number
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Button
                            onClick={() => setCurrentPage('game')}
                            variant={currentPage === 'game' ? 'contained' : 'outlined'}
                            size="small"
                        >
                            Game
                        </Button>
                        <Button
                            onClick={() => setCurrentPage('explorer')}
                            variant={currentPage === 'explorer' ? 'contained' : 'outlined'}
                            size="small"
                        >
                            Explorer
                        </Button>
                        <Button
                            onClick={() => setCurrentPage('debug')}
                            variant={currentPage === 'debug' ? 'contained' : 'outlined'}
                            size="small"
                        >
                            Debug
                        </Button>


                        <Suspense fallback={<Button disabled>Loading...</Button>}>
                            <ConnectionButton />
                        </Suspense>
                    </Box>
                </Box>

                {/* Main Content */}
                <Box sx={{ pt: 8, padding: '20px' }}>
                    {/* Debug Info */}
                    <Box sx={{ mb: 2 }}>
                        <Alert severity="info" sx={{ mb: 1 }}>
                            <strong>Debug Info:</strong> Current Page: {currentPage}
                        </Alert>
                    </Box>

                    <ChainProvider chainId="pop">
                        <Suspense fallback={
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                <Typography variant="h6" sx={{ color: '#64b5f6', mb: 2 }}>
                                    🔄 Loading Application...
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                                    Initializing blockchain connection...
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#ff9800', mt: 1 }}>
                                    ⚠️ If this takes too long, check your internet connection
                                </Typography>
                            </Box>
                        }>
                            <ErrorBoundary
                                FallbackComponent={({ error, resetErrorBoundary }) => (
                                    <Box sx={{ textAlign: 'center', py: 4, maxWidth: 600, mx: 'auto' }}>
                                        <Typography variant="h6" sx={{ color: '#f44336', mb: 2 }}>
                                            🚨 Connection Error
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 2 }}>
                                            {error?.message || 'Failed to connect to Pop Network'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#888', mb: 3, fontSize: '0.8rem' }}>
                                            This usually happens when:
                                            <br/>• The RPC endpoint is down
                                            <br/>• Your internet connection is unstable
                                            <br/>• Firewall is blocking WebSocket connections
                                        </Typography>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            onClick={resetErrorBoundary}
                                            sx={{ mr: 1 }}
                                        >
                                            🔄 Retry Connection
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            onClick={() => setCurrentPage('debug')}
                                        >
                                            🐛 Open Debug Page
                                        </Button>
                                    </Box>
                                )}
                                onReset={() => console.log('🔄 Retrying blockchain connection...')}
                            >
                            <AccountSelect>
                                {(selectedAccount) => (
                                    <SignerProvider signer={selectedAccount.polkadotSigner}>
                                        <TransactionProvider>
                                            <Box sx={{ mb: 2 }}>
                                                <Alert severity="success">
                                                    ✅ Account Connected: {selectedAccount.name || selectedAccount.address.slice(0, 10)}...
                                                </Alert>
                                            </Box>

                                            {currentPage === 'game' && (
                                                <GameContextProvider>
                                                    <Box sx={{ mb: 2 }}>
                                                        <Alert severity="info">
                                                            🎮 Loading Game Page...
                                                        </Alert>
                                                    </Box>
                                                    <Game/>
                                                </GameContextProvider>
                                            )}
                                            {currentPage === 'explorer' && (
                                                <>
                                                    <Box sx={{ mb: 2 }}>
                                                        <Alert severity="info">
                                                            🔍 Loading Explorer Page...
                                                        </Alert>
                                                    </Box>
                                                    <ContractExplorer />
                                                </>
                                            )}
                                            {currentPage === 'debug' && (
                                                <>
                                                    <Box sx={{ mb: 2 }}>
                                                        <Alert severity="info">
                                                            🐛 Loading Debug Page...
                                                        </Alert>
                                                    </Box>
                                                    <DebugPage />
                                                </>
                                            )}
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