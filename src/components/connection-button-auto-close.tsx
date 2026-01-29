import { useState, useEffect, useRef } from 'react';
import { ConnectionDialog } from 'dot-connect/react.js';
import { useConnectedWallets } from '@reactive-dot/react';
import { Button } from '@mui/material';

export function ConnectionButtonAutoClose() {
    const [open, setOpen] = useState(false);
    const connectedWallets = useConnectedWallets();
    const previousWalletsCount = useRef(connectedWallets.length);

    // Détecter quand un wallet se connecte (le nombre de wallets connectés augmente)
    useEffect(() => {
        if (open && connectedWallets.length > previousWalletsCount.current) {
            // Un nouveau wallet vient de se connecter, fermer la modale après un court délai
            setTimeout(() => {
                setOpen(false);
            }, 500); // Petit délai pour que l'utilisateur voie la confirmation
        }
        previousWalletsCount.current = connectedWallets.length;
    }, [connectedWallets.length, open]);

    return (
        <>
            <ConnectionDialog 
                open={open} 
                onClose={() => setOpen(false)} 
            />
            <Button
                variant="contained"
                onClick={() => setOpen(true)}
                sx={{
                    backgroundColor: '#d4af37',
                    color: '#000',
                    '&:hover': {
                        backgroundColor: '#b8860b',
                    }
                }}
            >
                {connectedWallets.length > 0 ? 'Change Wallet' : 'Connect Wallet'}
            </Button>
        </>
    );
}
