import {config} from "../config";
import "../styles/globals.css";
import {ChainProvider, ReactiveDotProvider, SignerProvider, useAccounts} from "@reactive-dot/react";
import {Suspense, useState} from "react";
import {ConnectionButton} from "dot-connect/react.js";
import {BlockchainGame} from "./blockchain-game.tsx";
import {DebugPage} from "./debug-page.tsx";
import {Toaster} from "react-hot-toast";
import {GameContextProvider} from "../contexts/game-context.tsx";
import {AccountSelect} from "./account-select.tsx";
import {TransactionProvider} from "./transaction-provider.tsx";
import {ConnectionStatus, NetworkInfo} from "./connection-status.tsx";
import {ConnectionStatusCompact} from "./connection-status-compact.tsx";
import {BlockchainLoader} from "./blockchain-loader.tsx";
import { Box, Button, ButtonGroup, AppBar, Toolbar, Typography, Alert } from "@mui/material";
import { Games, BugReport, AccountBalance, SmartToy, Refresh } from "@mui/icons-material";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";

export function App() {
    const [currentPage, setCurrentPage] = useState<'game' | 'debug'>('game');

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
                    <Typography variant="h6" sx={{ color: '#d4af37', fontFamily: 'Cinzel, serif', fontWeight: 700 }}>
                        🔮 Blockchain Oracle
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
                <Box sx={{ pt: 8, padding: '20px', maxWidth: '1600px', margin: '0 auto' }}>

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
                                <AutoAccountSelect>
                                    {(selectedAccount) => (
                                        <SignerProvider signer={selectedAccount.polkadotSigner}>
                                            <TransactionProvider>
                                                {/* Status de connexion compact */}
                                                <ConnectionStatusCompact />

                                                {/* Contenu principal selon la page */}
                                                {currentPage === 'game' && (
                                                    <GameContextProvider>
                                                        <BlockchainGame/>
                                                    </GameContextProvider>
                                                )}
                                                {currentPage === 'debug' && <DebugPage />}
                                            </TransactionProvider>
                                        </SignerProvider>
                                    )}
                                </AutoAccountSelect>
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

// Composant qui sélectionne automatiquement le premier compte disponible
function AutoAccountSelect({ children }: { children: (account: any) => React.ReactNode }) {
    const accounts = useAccounts();

    // Utilise automatiquement le premier compte disponible
    const selectedAccount = accounts.length > 0 ? accounts[0] : undefined;

    if (!selectedAccount) {
        return (
            <div style={{ textAlign: 'center', padding: '20px', color: '#b0b0b0' }}>
                <p>🔌 Veuillez connecter un wallet pour continuer</p>
            </div>
        );
    }

    return <>{children(selectedAccount)}</>;
}
