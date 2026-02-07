import { useState, useEffect } from "react";
import { useConnectedWallets } from "@reactive-dot/react";
import { useChainSpecData } from "@reactive-dot/react";
import { getAccounts } from "@reactive-dot/core/internal/actions.js";
import type { WalletAccount } from "@reactive-dot/core/wallets.js";

/**
 * Returns all accounts from connected wallets without filtering by chain genesisHash.
 * Use this when you want to show every account (e.g. Talisman with 13 accounts)
 * instead of only accounts "allowed" for the current chain (useAccounts).
 */
export function useAllWalletAccounts(): WalletAccount[] {
  const connectedWallets = useConnectedWallets();
  const chainSpecData = useChainSpecData();
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);

  useEffect(() => {
    if (connectedWallets.length === 0 || !chainSpecData) {
      setAccounts([]);
      return;
    }

    let cancelled = false;

    const sub = getAccounts(
      connectedWallets,
      undefined, // no chainSpec => no genesisHash filter, keep all accounts
      chainSpecData
    ).subscribe({
      next: (list) => {
        if (!cancelled) setAccounts(list);
      },
      error: () => {
        if (!cancelled) setAccounts([]);
      },
    });

    return () => {
      cancelled = true;
      sub.unsubscribe();
    };
  }, [connectedWallets, chainSpecData]);

  return accounts;
}
