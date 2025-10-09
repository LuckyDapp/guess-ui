import {config} from "../config";
import "../styles/globals.css";
import {ChainProvider, ReactiveDotProvider, SignerProvider, useAccounts} from "@reactive-dot/react";
import React, {Suspense, useState} from "react";
import { createPortal } from 'react-dom';
import {ConnectionButton} from "dot-connect/react.js";
import {BlockchainGame} from "./blockchain-game.tsx";


import {DebugPanel} from "./debug-panel.tsx";
import {Toaster} from "react-hot-toast";
import {GameContextProvider} from "../contexts/game-context.tsx";
import {TransactionHistoryProvider} from "../contexts/transaction-history-context.tsx";
import {AccountSelect} from "./account-select.tsx";
import {TransactionProvider} from "./transaction-provider.tsx";
import {ConnectionStatus, NetworkInfo} from "./connection-status.tsx";
import {ConnectionStatusCompact} from "./connection-status-compact.tsx";
import {BlockchainLoader} from "./blockchain-loader.tsx";
import { Box, Button, ButtonGroup, AppBar, Toolbar, Typography, Alert } from "@mui/material";
import { Games, BugReport, AccountBalance, SmartToy, Refresh } from "@mui/icons-material";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";

export function App() {
    // Créer un conteneur complètement isolé pour le debug panel
    React.useEffect(() => {
        // Supprimer l'ancien conteneur s'il existe
        const oldContainer = document.getElementById('debug-panel-root');
        if (oldContainer) {
            oldContainer.remove();
        }

        // Créer un nouveau conteneur complètement isolé
        const debugRoot = document.createElement('div');
        debugRoot.id = 'debug-panel-root';
        
        // Style le conteneur avec toutes les protections possibles
        debugRoot.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            pointer-events: none !important;
            z-index: 2147483647 !important;
            transform: translateZ(0) !important;
            overflow: visible !important;
            contain: none !important;
        `;
        
        // L'ajouter directement à la racine du document
        document.documentElement.appendChild(debugRoot);
        
        // Nettoyer au démontage
        return () => {
            const container = document.getElementById('debug-panel-root');
            if (container) {
                container.remove();
            }
        };
    }, []);

    return (
        <ReactiveDotProvider config={config}>
            <Box sx={{ minHeight: '100vh', backgroundColor: '#101010' }}>
                {/* Simple Top Bar */}
                <Header />

                {/* Main Content */}
                <Box className="main-content" sx={{ 
                    pt: 10, // 80px en haut pour compenser le header fixe
                    pb: 0, // Padding bottom sera ajusté dynamiquement par le debug panel
                    px: 2.5, // 20px sur les côtés
                    maxWidth: '1600px', 
                    margin: '0 auto',
                    minHeight: 'calc(100vh - 80px)', // Ajusté pour la nouvelle hauteur
                    overflow: 'visible' // Permettre le scroll
                }}>

                    {/* Mode en ligne uniquement - Connexion directe au réseau PASETO */}
                    <ChainProvider chainId="pah">
                        <Suspense fallback={<div />}>
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
                                                {/* Header avec status de connexion */}
                                                <HeaderWithConnection />
                                                
                                                {/* Contenu principal - Jeu uniquement */}
                                                <TransactionHistoryProvider>
                                                    <GameContextProvider>
                                                        <BlockchainGame/>
                                                    </GameContextProvider>
                                                    
                                                    {/* Debug Panel - toujours actif - rendu dans le conteneur isolé */}
                                                    {typeof document !== 'undefined' && (() => {
                                                        const container = document.getElementById('debug-panel-root');
                                                        return container ? createPortal(<DebugPanel />, container) : null;
                                                    })()}
                                                </TransactionHistoryProvider>
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

// Composant Header simple (sans connexion blockchain)
function Header() {
    return (
        <Box sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: '#1a1a1a',
            borderBottom: 'none',
            zIndex: 10000,
            padding: '10px 20px',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center'
        }}>
            <Suspense fallback={<div>Loading...</div>}>
                <ConnectionButton />
            </Suspense>
        </Box>
    );
}

// Composant Header avec status de connexion (à l'intérieur du contexte blockchain)
function HeaderWithConnection() {
    return (
        <Box sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: '#1a1a1a',
            borderBottom: 'none',
            zIndex: 10000,
            padding: '10px 20px',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 2
        }}>
            <Suspense fallback={<div>Loading...</div>}>
                <ConnectionStatusCompact />
            </Suspense>
            <Suspense fallback={<div>Loading...</div>}>
                <ConnectionButton />
            </Suspense>
        </Box>
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
