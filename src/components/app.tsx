import {config} from "../config";
import "../styles/globals.css";
import {ChainProvider, ReactiveDotProvider, SignerProvider, useAccounts, useConnectedWallets, useWalletDisconnector} from "@reactive-dot/react";
import { pending } from "@reactive-dot/core";
import React, {Suspense, useState} from "react";
import { createPortal } from "react-dom";
import {ConnectionButton} from "dot-connect/react.js";
import {ConnectionButtonAutoClose} from "./connection-button-auto-close.tsx";
import { BlockchainGame, SiteFooter } from "./blockchain-game.tsx";


import {Toaster} from "react-hot-toast";
import {TOAST_TOP_OFFSET_PX} from "../config";
import {GameContextProvider} from "../contexts/game-context.tsx";
import {TransactionHistoryProvider} from "../contexts/transaction-history-context.tsx";
import {AccountSelect} from "./account-select.tsx";
import {DevAccountSelect} from "./dev-account-select.tsx";
import {AccountSelectCompact} from "./account-select-compact.tsx";
import {MapAccountPrompt} from "./map-account-prompt.tsx";
import {BalanceCheckPrompt} from "./balance-check-prompt.tsx";
import {SelectedAccountProvider} from "../contexts/selected-account-context.tsx";
import {TransactionProvider} from "./transaction-provider.tsx";
import {BlockchainLoader} from "./blockchain-loader.tsx";
import { Box, Button, ButtonGroup, AppBar, Toolbar, Typography, Alert, Tabs, Tab } from "@mui/material";
import { Games, BugReport, AccountBalance, SmartToy, Refresh, EmojiEvents } from "@mui/icons-material";
import { TabNavigationProvider, useTabNavigation } from "../contexts/tab-navigation-context";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { ThreeBackground } from "./three-background.tsx";

export function App() {
    return (
        <ReactiveDotProvider config={config}>
            <ThreeBackground />
            <Box sx={{ minHeight: '100vh', backgroundColor: '#101010', display: 'flex', flexDirection: 'column' }}>
                {/* Main Content */}
                <Box className="main-content" sx={{ 
                    pt: 8, // Padding top pour compenser le header
                    pb: 0, // Padding bottom sera ajusté dynamiquement par le debug panel
                    px: 2, // 16px sur les côtés
                    maxWidth: '1600px', 
                    margin: '0 auto',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
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
                                            <Typography variant="h6">An error occurred</Typography>
                                            <Typography variant="body2" sx={{ mt: 1, mb: 1 }}>
                                                {error?.message || 'An unexpected error occurred. Please try again.'}
                                            </Typography>
                                            {error?.stack && (
                                                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', mt: 1, color: 'rgba(255,255,255,0.7)' }}>
                                                    {error.stack.split('\n').slice(0, 3).join('\n')}
                                                </Typography>
                                            )}
                                        </Alert>
                                        <Button
                                            variant="contained"
                                            onClick={resetErrorBoundary}
                                            startIcon={<Refresh />}
                                        >
                                            Retry
                                        </Button>
                                    </Box>
                                )}
                                onError={(error) => console.error('Blockchain connection error:', error)}
                            >
                                <SelectedAccountProvider>
                                    <TabNavigationProvider>
                                        <AccountOrDevSelect
                                            renderContent={(selectedAccount) => (
                                                <SignerProvider signer={selectedAccount.polkadotSigner}>
                                                    <TransactionProvider>
                                                        <MapAccountPrompt />
                                                        <BalanceCheckPrompt />
                                                        <HeaderWithConnection />
                                                        <TransactionHistoryProvider>
                                                            <GameContextProvider>
                                                                <BlockchainGame/>
                                                            </GameContextProvider>
                                                        </TransactionHistoryProvider>
                                                    </TransactionProvider>
                                                </SignerProvider>
                                            )}
                                        />
                                    </TabNavigationProvider>
                                </SelectedAccountProvider>
                            </ErrorBoundary>
                        </Suspense>
                    </ChainProvider>
                </Box>
            </Box>

            {typeof document !== "undefined" &&
                createPortal(
                    <Toaster
                        position="top-right"
                        containerStyle={{
                            position: "fixed",
                            top: `${TOAST_TOP_OFFSET_PX}px`,
                            right: "16px",
                            left: "auto",
                            bottom: "auto",
                            padding: 0,
                            zIndex: 99999,
                            pointerEvents: "none",
                            overflow: "visible",
                        }}
                        toastOptions={{
                            className: "custom-toast",
                            style: {
                                background: "#363636",
                                color: "#fff",
                                pointerEvents: "auto",
                            },
                            success: {
                                style: {
                                    background: "green",
                                    pointerEvents: "auto",
                                },
                            },
                            error: {
                                style: {
                                    background: "red",
                                    pointerEvents: "auto",
                                },
                            },
                        }}
                    />,
                    document.body
                )}
        </ReactiveDotProvider>
    );
}

const headerSx = {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    zIndex: 10000,
    padding: '8px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 2,
    minHeight: '56px',
};

/** Choisit AccountSelect (wallet), DevAccountSelect (comptes dev), ou message de connexion */
function AccountOrDevSelect({
    renderContent,
}: {
    renderContent: (account: { polkadotSigner: import("polkadot-api/signer").PolkadotSigner; address?: string; name?: string }) => React.ReactNode;
}) {
    const connectedWallets = useConnectedWallets();
    const hasWallet = connectedWallets.length > 0;

    if (hasWallet) {
        return (
            <AccountSelect>
                {(account) => renderContent(account)}
            </AccountSelect>
        );
    }

    return (
        <DevAccountSelect
            header={<HeaderWithConnection />}
            footer={<SiteFooter />}
        >
            {(account) => renderContent(account)}
        </DevAccountSelect>
    );
}


// Composant Header avec status de connexion (à l'intérieur du contexte blockchain)
function HeaderWithConnection() {
    const { currentTab, setCurrentTab } = useTabNavigation();
    const connectedWallets = useConnectedWallets();
    const [disconnectState, disconnectWallets] = useWalletDisconnector(connectedWallets);

    return (
        <Box sx={headerSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <EmojiEvents sx={{ color: 'var(--color-primary)', fontSize: '1.8rem' }} />
                <Typography variant="h5" sx={{ 
                    color: '#fff', 
                    fontWeight: 400, 
                    fontSize: '1.5rem',
                    fontFamily: "'Rum Raisin', sans-serif",
                    textShadow: '0 0 10px rgba(212, 175, 55, 0.3)',
                    letterSpacing: '0.5px'
                }}>
                    Guess the Number
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flex: 1, justifyContent: 'space-between', px: 3 }}>
                <Tabs
                    value={currentTab}
                    onChange={(_, v) => setCurrentTab(v)}
                    sx={{ 
                        minHeight: 'auto',
                        "& .MuiTab-root": { 
                            color: "rgba(255,255,255,0.7)",
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            minHeight: 'auto',
                            padding: '6px 16px',
                            textTransform: 'none'
                        }, 
                        "& .Mui-selected": { 
                            color: "var(--color-primary)",
                            fontWeight: 600
                        },
                        "& .MuiTabs-indicator": {
                            backgroundColor: "var(--color-primary)"
                        }
                    }}
                >
                    <Tab label="Game" />
                    <Tab label="NFT" />
                </Tabs>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Suspense fallback={<div>Loading...</div>}>
                        <AccountSelectCompact />
                    </Suspense>
                    {connectedWallets.length === 0 ? (
                        <Suspense fallback={<div>Loading...</div>}>
                            <ConnectionButtonAutoClose />
                        </Suspense>
                    ) : (
                        <Button
                            variant="contained"
                            size="small"
                            disabled={disconnectState === pending}
                            onClick={() => disconnectWallets()}
                            sx={{
                                backgroundColor: '#d4af37',
                                color: '#000',
                                '&:hover': {
                                    backgroundColor: '#b8860b',
                                },
                            }}
                        >
                            {disconnectState === pending ? 'Disconnecting...' : 'Disconnect'}
                        </Button>
                    )}
                </Box>
            </Box>
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
                <p>🔌 Please connect a wallet to continue</p>
            </div>
        );
    }

    return <>{children(selectedAccount)}</>;
}

