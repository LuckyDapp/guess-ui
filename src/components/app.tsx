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
import {BlockchainLoader} from "./blockchain-loader.tsx";
import { Box, Button, ButtonGroup, AppBar, Toolbar, Typography, Alert } from "@mui/material";
import { Games, BugReport, AccountBalance, SmartToy, Refresh } from "@mui/icons-material";
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

                    {/* Mode en ligne uniquement - Connexion directe au réseau PASETO */}
                    <ChainProvider chainId="pah">
                        <Suspense fallback={
                            <Box sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                minHeight: '400px',
                                flexDirection: 'column',
                                gap: 2
                            }}>
                                <BlockchainLoader message="Connecting to PASETO Network..." size="large" />
                                <Typography variant="h6" sx={{ color: '#64b5f6' }}>
                                    Establishing blockchain connection...
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#b0b0b0', textAlign: 'center' }}>
                                    Please wait while we connect to the PASETO network.<br/>
                                    This may take a few moments.
                                </Typography>
                            </Box>
                        }>
                            <ErrorBoundary
                                FallbackComponent={({ error, resetErrorBoundary }) => (
                                    <Box sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minHeight: '400px',
                                        gap: 2,
                                        p: 3
                                    }}>
                                        <Alert severity="error" sx={{ maxWidth: '600px' }}>
                                            <Typography variant="h6">Connection Failed</Typography>
                                            <Typography variant="body2">
                                                Unable to connect to PASETO network. Please check your internet connection and try again.
                                            </Typography>
                                            <br/>
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                Error: {error?.message || 'Unknown error'}
                                            </Typography>
                                        </Alert>
                                        <Button
                                            variant="contained"
                                            onClick={resetErrorBoundary}
                                            startIcon={<Refresh />}
                                        >
                                            Retry Connection
                                        </Button>
                                    </Box>
                                )}
                                onError={(error) => console.error('Blockchain connection error:', error)}
                            >
                                <AccountSelect>
                                    {(selectedAccount) => (
                                        <SignerProvider signer={selectedAccount.polkadotSigner}>
                                            <TransactionProvider>
                                                {/* Status de connexion */}
                                                <Box sx={{ mb: 2 }}>
                                                    <ConnectionStatus />
                                                    <NetworkInfo />
                                                </Box>

                                                {/* Contenu principal selon la page */}
                                                {currentPage === 'game' && (
                                                    <GameContextProvider>
                                                        <Game/>
                                                    </GameContextProvider>
                                                )}
                                                {currentPage === 'explorer' && <ContractExplorer />}
                                                {currentPage === 'debug' && <DebugPage />}
                                            </TransactionProvider>
                                        </SignerProvider>
                                    )}
                                </AccountSelect>
                            </ErrorBoundary>
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