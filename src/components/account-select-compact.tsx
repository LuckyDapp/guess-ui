import type { WalletAccount } from "@reactive-dot/core/wallets.js";
import { useConnectedWallets, useAccounts } from "@reactive-dot/react";
import { useState, useEffect } from "react";
import { Select, MenuItem, FormControl, Box, Typography } from "@mui/material";
import { AccountCircle } from "@mui/icons-material";
import { useSelectedAccount } from "../contexts/selected-account-context";

type AccountSelectCompactProps = {
    onAccountChange?: (account: WalletAccount) => void;
};

export function AccountSelectCompact({ onAccountChange }: AccountSelectCompactProps) {
    const connectedWallets = useConnectedWallets();
    const accounts = useAccounts();
    const { selectedAccount, setSelectedAccount } = useSelectedAccount();
    const [selectedAccountIndex, setSelectedAccountIndex] = useState<number>(0);

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
            if (onAccountChange) {
                onAccountChange(account);
            }
        }
    };

    // Ne rien afficher si aucun wallet n'est connecté
    if (connectedWallets.length === 0 || accounts.length === 0) {
        return null;
    }

    // Si un seul compte, l'afficher sans select
    if (accounts.length === 1) {
        const account = accounts[0];
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccountCircle sx={{ color: '#d4af37', fontSize: 20 }} />
                <Typography variant="body2" sx={{ color: '#fff', fontSize: '0.875rem' }}>
                    {account.name || account.address.slice(0, 8) + '...'}
                </Typography>
            </Box>
        );
    }

    // Afficher le select pour plusieurs comptes
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
