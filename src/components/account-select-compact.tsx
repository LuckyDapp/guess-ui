import type { WalletAccount } from "@reactive-dot/core/wallets.js";
import { useConnectedWallets, useAccounts } from "@reactive-dot/react";
import { useState, useEffect } from "react";
import { Select, MenuItem, FormControl, Box, Typography } from "@mui/material";
import { AccountCircle } from "@mui/icons-material";
import { useSelectedAccount } from "../contexts/selected-account-context";
import { useDevAccount } from "../contexts/dev-account-context";
import { useAllWalletAccounts } from "../hooks/use-all-wallet-accounts";

type AccountSelectCompactProps = {
    onAccountChange?: (account: WalletAccount) => void;
};

export function AccountSelectCompact({ onAccountChange }: AccountSelectCompactProps) {
    const connectedWallets = useConnectedWallets();
    const accountsFilteredByChain = useAccounts();
    const allWalletAccounts = useAllWalletAccounts();
    const accounts = connectedWallets.length > 0 ? allWalletAccounts : accountsFilteredByChain;
    const { selectedAccount, setSelectedAccount, getStoredAccount, storeAccount } = useSelectedAccount();
    const devAccount = useDevAccount();
    const [selectedAccountIndex, setSelectedAccountIndex] = useState<number>(0);

    // Charger le compte sauvegardé au démarrage
    useEffect(() => {
        if (accounts.length === 0) return;
        const stored = getStoredAccount();
        if (stored && stored.type === 'wallet') {
            const index = accounts.findIndex(acc => acc.address === stored.identifier);
            if (index >= 0) {
                setSelectedAccountIndex(index);
                setSelectedAccount(accounts[index]);
                return;
            }
        }
        // Sinon utiliser le premier compte
        if (accounts.length > 0 && !selectedAccount) {
            setSelectedAccountIndex(0);
            setSelectedAccount(accounts[0]);
            storeAccount('wallet', accounts[0].address);
        }
    }, [accounts, getStoredAccount, setSelectedAccount, storeAccount, selectedAccount]);

    // Synchroniser l'index avec le compte sélectionné dans le contexte
    useEffect(() => {
        if (selectedAccount && accounts.length > 0) {
            const index = accounts.findIndex(acc => acc.address === selectedAccount.address);
            if (index !== -1 && index !== selectedAccountIndex) {
                setSelectedAccountIndex(index);
            }
        }
    }, [selectedAccount, accounts, selectedAccountIndex]);

    // Réinitialiser la sélection quand les comptes changent
    useEffect(() => {
        if (accounts.length > 0 && selectedAccountIndex >= accounts.length) {
            setSelectedAccountIndex(0);
        }
    }, [accounts.length, selectedAccountIndex]);

    // Mettre à jour le contexte quand l'utilisateur change de compte
    const handleAccountChange = (index: number) => {
        setSelectedAccountIndex(index);
        const account = accounts[index];
        if (account) {
            setSelectedAccount(account);
            storeAccount('wallet', account.address);
            if (onAccountChange) {
                onAccountChange(account);
            }
        }
    };

    // Restaurer le compte dev sauvegardé quand le contexte devAccount est disponible
    useEffect(() => {
        if (connectedWallets.length === 0 && devAccount?.devAccounts?.length && !selectedAccount) {
            const stored = getStoredAccount();
            if (stored && stored.type === 'dev') {
                const storedAccount = devAccount.devAccounts.find(acc => acc.name === stored.identifier);
                if (storedAccount) {
                    // Restaurer le compte sauvegardé dans le contexte devAccount et SelectedAccountContext
                    devAccount.selectDevAccount(storedAccount);
                    setSelectedAccount(storedAccount as any);
                }
            }
        }
    }, [connectedWallets.length, devAccount, getStoredAccount, selectedAccount, setSelectedAccount]);

    // Afficher le sélecteur de comptes dev - identique au sélecteur Talisman (nom + adresse)
    if (connectedWallets.length === 0 && selectedAccount && devAccount?.devAccounts?.length) {
        const devAccounts = devAccount.devAccounts;
        // Charger le compte dev sauvegardé
        const stored = getStoredAccount();
        
        // Priorité : compte sauvegardé > compte sélectionné dans devAccount > compte sélectionné dans selectedAccount
        let selectedIndex = -1;
        if (stored && stored.type === 'dev') {
            const storedIndex = devAccounts.findIndex(acc => acc.name === stored.identifier);
            if (storedIndex >= 0) {
                selectedIndex = storedIndex;
            }
        }
        if (selectedIndex < 0) {
            selectedIndex = devAccounts.findIndex(
                (a) => a.address === devAccount.selectedDevAccount?.address || a.name === devAccount.selectedDevAccount?.name
            );
        }
        if (selectedIndex < 0) {
            selectedIndex = devAccounts.findIndex(
                (a) => a.address === selectedAccount?.address || a.name === (selectedAccount as any)?.name
            );
        }
        
        const safeIndex = selectedIndex >= 0 ? selectedIndex : 0;
        const displayAccount = devAccounts[safeIndex] ?? devAccount.selectedDevAccount ?? selectedAccount;
        return (
            <FormControl
                size="small"
                sx={{
                    minWidth: 150,
                    '& .MuiOutlinedInput-root': {
                        backgroundColor: '#2a2a2a',
                        color: '#fff',
                        '& fieldset': { borderColor: '#444' },
                        '&:hover fieldset': { borderColor: '#d4af37' },
                        '&.Mui-focused fieldset': { borderColor: '#d4af37' },
                    },
                    '& .MuiSelect-icon': { color: '#d4af37' },
                }}
            >
                <Select
                    value={safeIndex}
                    onChange={(e) => {
                        const idx = Number(e.target.value);
                        const acc = devAccounts[idx];
                        if (acc) {
                            // Mettre à jour les deux contextes et sauvegarder
                            devAccount.selectDevAccount(acc);
                            setSelectedAccount(acc as any);
                            storeAccount('dev', acc.name);
                        }
                    }}
                    displayEmpty
                    renderValue={() => (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AccountCircle sx={{ color: '#d4af37', fontSize: 18 }} />
                            <Typography variant="body2" sx={{ color: '#fff' }}>
                                {displayAccount?.name || displayAccount?.address?.slice(0, 8) + '...'}
                            </Typography>
                        </Box>
                    )}
                >
                    {devAccounts.map((account, index) => (
                        <MenuItem
                            key={account.id}
                            value={index}
                            sx={{
                                backgroundColor: '#2a2a2a',
                                color: '#fff',
                                '&:hover': { backgroundColor: '#3a3a3a' },
                                '&.Mui-selected': {
                                    backgroundColor: '#4a4a4a',
                                    '&:hover': { backgroundColor: '#4a4a4a' },
                                },
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AccountCircle sx={{ color: '#d4af37', fontSize: 18 }} />
                                <Box>
                                    <Typography variant="body2" sx={{ color: '#fff' }}>
                                        {account.name || 'Unnamed Account'}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#888', fontSize: '0.7rem' }}>
                                        {account.address.slice(0, 10)}...{account.address.slice(-8)}
                                    </Typography>
                                </Box>
                            </Box>
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        );
    }

    // Ne rien afficher si aucun wallet connecté et pas de compte dev
    if (connectedWallets.length === 0 || accounts.length === 0) {
        return null;
    }

    // Wallet connecté : toujours afficher le select (un ou plusieurs comptes)
    const displayAccount = accounts[selectedAccountIndex] || selectedAccount;

    return (
        <FormControl 
            size="small" 
            sx={{ 
                minWidth: 150,
                '& .MuiOutlinedInput-root': {
                    backgroundColor: '#2a2a2a',
                    color: '#fff',
                    '& fieldset': {
                        borderColor: '#444',
                    },
                    '&:hover fieldset': {
                        borderColor: '#d4af37',
                    },
                    '&.Mui-focused fieldset': {
                        borderColor: '#d4af37',
                    },
                },
                '& .MuiSelect-icon': {
                    color: '#d4af37',
                },
            }}
        >
            <Select
                value={selectedAccountIndex}
                onChange={(e) => handleAccountChange(Number(e.target.value))}
                displayEmpty
                renderValue={() => (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccountCircle sx={{ color: '#d4af37', fontSize: 18 }} />
                        <Typography variant="body2" sx={{ color: '#fff' }}>
                            {displayAccount?.name || displayAccount?.address.slice(0, 8) + '...'}
                        </Typography>
                    </Box>
                )}
            >
                {accounts.map((account, index) => (
                    <MenuItem 
                        key={index} 
                        value={index}
                        sx={{
                            backgroundColor: '#2a2a2a',
                            color: '#fff',
                            '&:hover': {
                                backgroundColor: '#3a3a3a',
                            },
                            '&.Mui-selected': {
                                backgroundColor: '#4a4a4a',
                                '&:hover': {
                                    backgroundColor: '#4a4a4a',
                                },
                            },
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AccountCircle sx={{ color: '#d4af37', fontSize: 18 }} />
                            <Box>
                                <Typography variant="body2" sx={{ color: '#fff' }}>
                                    {account.name || 'Unnamed Account'}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#888', fontSize: '0.7rem' }}>
                                    {account.address.slice(0, 10)}...{account.address.slice(-8)}
                                </Typography>
                            </Box>
                        </Box>
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
}
