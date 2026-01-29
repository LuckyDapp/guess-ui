import { createContext, useContext, useState, ReactNode } from 'react';
import type { WalletAccount } from '@reactive-dot/core/wallets.js';

type SelectedAccountContextType = {
    selectedAccount: WalletAccount | null;
    setSelectedAccount: (account: WalletAccount | null) => void;
};

const SelectedAccountContext = createContext<SelectedAccountContextType | undefined>(undefined);

export const SelectedAccountProvider = ({ children }: { children: ReactNode }) => {
    const [selectedAccount, setSelectedAccount] = useState<WalletAccount | null>(null);

    return (
        <SelectedAccountContext.Provider value={{ selectedAccount, setSelectedAccount }}>
            {children}
        </SelectedAccountContext.Provider>
    );
};

export const useSelectedAccount = (): SelectedAccountContextType => {
    const context = useContext(SelectedAccountContext);
    if (!context) {
        throw new Error('useSelectedAccount must be used within SelectedAccountProvider');
    }
    return context;
};
