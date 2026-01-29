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
    const { selectedAccount, setSelectedAccount } = useSelectedAccount();

    // Initialiser avec le premier compte si aucun n'est sélectionné
    useEffect(() => {
        if (accounts.length > 0 && !selectedAccount) {
            setSelectedAccount(accounts[0]);
        }
    }, [accounts, selectedAccount, setSelectedAccount]);

    // Si aucun wallet n'est connecté, afficher un message
    if (connectedWallets.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '20px', color: '#b0b0b0' }}>
                <p>🔌 Veuillez connecter un wallet pour continuer</p>
            </div>
        );
    }

    // Si aucun compte n'est disponible, afficher un message
    if (!selectedAccount) {
        return (
            <div style={{ textAlign: 'center', padding: '20px', color: '#b0b0b0' }}>
                <p>⏳ Chargement des comptes...</p>
            </div>
        );
    }

    // Afficher directement le contenu avec le compte sélectionné
    return <>{children(selectedAccount)}</>;
}