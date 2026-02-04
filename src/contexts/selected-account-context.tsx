import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { WalletAccount } from '@reactive-dot/core/wallets.js';

const STORAGE_KEY = 'guess-the-number-selected-account';

type StoredAccount = {
    type: 'dev' | 'wallet';
    identifier: string; // nom pour dev, adresse SS58 pour wallet
};

type SelectedAccountContextType = {
    selectedAccount: WalletAccount | null;
    setSelectedAccount: (account: WalletAccount | null) => void;
    getStoredAccount: () => StoredAccount | null;
    storeAccount: (type: 'dev' | 'wallet', identifier: string) => void;
};

const SelectedAccountContext = createContext<SelectedAccountContextType | undefined>(undefined);

export const SelectedAccountProvider = ({ children }: { children: ReactNode }) => {
    const [selectedAccount, setSelectedAccount] = useState<WalletAccount | null>(null);

    const getStoredAccount = (): StoredAccount | null => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return null;
            return JSON.parse(stored) as StoredAccount;
        } catch {
            return null;
        }
    };

    const storeAccount = (type: 'dev' | 'wallet', identifier: string) => {
        try {
            const data = JSON.stringify({ type, identifier });
            localStorage.setItem(STORAGE_KEY, data);
        } catch (e) {
            // Si le quota est dépassé, essayer de nettoyer et réessayer une fois
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                try {
                    // Nettoyer uniquement notre clé et réessayer
                    localStorage.removeItem(STORAGE_KEY);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify({ type, identifier }));
                } catch (retryError) {
                    console.error('Failed to store account in localStorage after cleanup:', retryError);
                }
            } else {
                console.warn('Failed to store account in localStorage:', e);
            }
        }
    };

    return (
        <SelectedAccountContext.Provider value={{ selectedAccount, setSelectedAccount, getStoredAccount, storeAccount }}>
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
