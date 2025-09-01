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
                    <ChainProvider chainId="pop">
                        <Suspense>
                            <AccountSelect>
                                {(selectedAccount) => (
                                    <SignerProvider signer={selectedAccount.polkadotSigner}>
                                        <TransactionProvider>
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