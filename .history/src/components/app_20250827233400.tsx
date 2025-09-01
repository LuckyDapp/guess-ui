import {config} from "../config";
import "../styles/globals.css";
import {ChainProvider, ReactiveDotProvider, SignerProvider} from "@reactive-dot/react";
import {Suspense} from "react";
import {ConnectionButton} from "dot-connect/react.js";
import {Game} from "./game.tsx";
import {Toaster} from "react-hot-toast";
import {GameContextProvider} from "../contexts/game-context.tsx";
import {AccountSelect} from "./account-select.tsx";
import {TransactionProvider} from "./transaction-provider.tsx";
import {ConnectionStatus, NetworkInfo} from "./connection-status.tsx";

export function App() {

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
                                    <GameContextProvider>
                                        <Game/>
                                    </GameContextProvider>
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