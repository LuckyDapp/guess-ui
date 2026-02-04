import type { WalletAccount } from "@reactive-dot/core/wallets.js";
import { useConnectedWallets, useAccounts } from "@reactive-dot/react";
import { type ReactNode, useEffect } from "react";
import { useSelectedAccount } from "../contexts/selected-account-context";

type AccountSelectProps = {
    children: (account: WalletAccount) => ReactNode;
};

export function AccountSelect({ children }: AccountSelectProps) {
    const connectedWallets = useConnectedWallets();
    const accounts = useAccounts();
    const { selectedAccount, setSelectedAccount, getStoredAccount, storeAccount } = useSelectedAccount();

    // Charger le compte sauvegardé ou initialiser avec le premier compte
    useEffect(() => {
        if (accounts.length === 0) return;
        
        const stored = getStoredAccount();
        if (stored && stored.type === 'wallet') {
            // Chercher le compte sauvegardé par adresse
            const savedAccount = accounts.find(acc => acc.address === stored.identifier);
            if (savedAccount) {
                setSelectedAccount(savedAccount);
                return;
            }
        }
        
        // Si aucun compte sauvegardé trouvé, utiliser le premier compte
        if (!selectedAccount) {
            setSelectedAccount(accounts[0]);
            if (accounts[0]) {
                storeAccount('wallet', accounts[0].address);
            }
        }
    }, [accounts, selectedAccount, setSelectedAccount, getStoredAccount, storeAccount]);

    // Sauvegarder quand le compte change
    useEffect(() => {
        if (selectedAccount) {
            storeAccount('wallet', selectedAccount.address);
        }
    }, [selectedAccount, storeAccount]);

    // Si aucun wallet n'est connecté, afficher un message
    if (connectedWallets.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '20px', color: '#b0b0b0' }}>
                <p>🔌 Please connect a wallet to continue</p>
            </div>
        );
    }

    // Si aucun compte n'est disponible, afficher un message
    if (!selectedAccount) {
        return (
            <div style={{ textAlign: 'center', padding: '20px', color: '#b0b0b0' }}>
                <p>⏳ Loading accounts...</p>
            </div>
        );
    }

    // Afficher directement le contenu avec le compte sélectionné
    return <>{children(selectedAccount)}</>;
}