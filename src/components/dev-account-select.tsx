import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { Keyring } from "@polkadot/keyring";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { encodeAddress } from "@polkadot/keyring";
import { getPolkadotSigner } from "polkadot-api/signer";
import { Box, FormControl, MenuItem, Select, Typography } from "@mui/material";
import { AccountCircle } from "@mui/icons-material";
import { getRpc } from "../config.ts";
import { NETWORK_CONFIG } from "../config";
import { useSelectedAccount } from "../contexts/selected-account-context";
import { DevAccountProvider, DEV_ACCOUNT_NAMES } from "../contexts/dev-account-context.tsx";
import type { DevAccount } from "../contexts/dev-account-context.tsx";

const DEV_ACCOUNTS = DEV_ACCOUNT_NAMES;

function createDevAccount(
  name: string,
  keyringPair: { sign: (p: Uint8Array) => Uint8Array; publicKey: Uint8Array }
): DevAccount {
  const polkadotSigner = getPolkadotSigner(
    keyringPair.publicKey,
    "Sr25519",
    (input) => keyringPair.sign(input)
  );
  return {
    id: `dev-${name.toLowerCase()}`,
    name,
    address: encodeAddress(keyringPair.publicKey),
    polkadotSigner,
  };
}

export function DevAccountSelect({ children }: { children: (account: DevAccount) => ReactNode }) {
  const [keyring, setKeyring] = useState<Keyring | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<DevAccount | null>(null);
  const { setSelectedAccount: setContextAccount, getStoredAccount, storeAccount } = useSelectedAccount();
  const hasInitialized = useRef(false);

  const isDevRpc = getRpc("pah") === NETWORK_CONFIG.RPC_URL;

  useEffect(() => {
    // Éviter les exécutions multiples
    if (hasInitialized.current) return;
    
    let cancelled = false;
    (async () => {
      await cryptoWaitReady();
      if (cancelled) return;
      const kr = new Keyring({ type: "sr25519", ss58Format: 42 });
      setKeyring(kr);
      
      // Charger le compte sauvegardé
      const stored = getStoredAccount();
      if (stored && stored.type === 'dev' && DEV_ACCOUNTS.includes(stored.identifier as any)) {
        // Restaurer le compte sauvegardé
        const pair = kr.createFromUri(`//${stored.identifier}`, { name: stored.identifier });
        const account = createDevAccount(stored.identifier, pair);
        if (!cancelled) {
          setSelectedAccount(account);
          setContextAccount(account as any);
          hasInitialized.current = true;
        }
      } else {
        // Si aucun compte dev sauvegardé, ne pas pré-sélectionner de compte
        // L'utilisateur devra choisir manuellement
        if (!cancelled) {
          hasInitialized.current = true;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []); // Exécuter une seule fois au montage

  const selectAccount = useCallback(
    (name: (typeof DEV_ACCOUNTS)[number]) => {
      if (!keyring) return;
      const pair = keyring.createFromUri(`//${name}`, { name });
      const account = createDevAccount(name, pair);
      setSelectedAccount(account);
      setContextAccount(account as any);
      storeAccount('dev', name);
    },
    [keyring, setContextAccount, storeAccount]
  );

  if (!isDevRpc) {
    return (
      <div style={{ textAlign: "center", padding: "20px", color: "#b0b0b0" }}>
        <p>🔌 Please connect a wallet to continue</p>
      </div>
    );
  }

  if (selectedAccount && keyring) {
    const allDevAccounts: DevAccount[] = DEV_ACCOUNTS.map((name) => {
      const pair = keyring.createFromUri(`//${name}`, { name });
      return createDevAccount(name, pair);
    });
    
    return (
      <DevAccountProvider
        value={{
          devAccounts: allDevAccounts,
          selectedDevAccount: selectedAccount,
          selectDevAccount: (account) => {
            setSelectedAccount(account);
            setContextAccount(account as any);
            storeAccount('dev', account.name);
          },
        }}
      >
        {children(selectedAccount)}
      </DevAccountProvider>
    );
  }

  if (!keyring) {
    return (
      <Box sx={{ textAlign: "center", p: 3, color: "#b0b0b0" }}>
        <Typography>Loading development accounts...</Typography>
      </Box>
    );
  }

  const allDevAccounts: DevAccount[] = DEV_ACCOUNTS.map((name) => {
    const pair = keyring.createFromUri(`//${name}`, { name });
    return createDevAccount(name, pair);
  });

  const stored = getStoredAccount();
  const initialValue = stored && stored.type === 'dev' 
    ? allDevAccounts.findIndex(acc => acc.name === stored.identifier)
    : -1;

  const selectSx = {
    minWidth: 200,
    mt: 1,
    "& .MuiOutlinedInput-root": {
      backgroundColor: "#2a2a2a",
      color: "#fff",
      "& fieldset": { borderColor: "#444" },
      "&:hover fieldset": { borderColor: "#d4af37" },
      "&.Mui-focused fieldset": { borderColor: "#d4af37" },
    },
    "& .MuiSelect-icon": { color: "#d4af37" },
  };

  return (
    <Box sx={{ textAlign: "center", p: 3, maxWidth: 400, margin: "0 auto" }}>
      <Typography variant="h6" sx={{ color: "#d4af37", mb: 2 }}>
        Development accounts
      </Typography>
      <Typography variant="body2" sx={{ color: "#b0b0b0", mb: 2 }}>
        This RPC is in dev mode. Select an account or connect a wallet.
      </Typography>
      <FormControl size="small" fullWidth sx={selectSx}>
        <Select
          value={initialValue >= 0 ? initialValue : ""}
          displayEmpty
          onChange={(e) => {
            const idx = Number(e.target.value);
            const acc = allDevAccounts[idx];
            if (acc) {
              setSelectedAccount(acc);
              setContextAccount(acc as any);
              storeAccount('dev', acc.name);
            }
          }}
          renderValue={(v) =>
            (v as string) === "" ? (
              <Typography variant="body2" sx={{ color: "#888" }}>
                Choose an account...
              </Typography>
            ) : (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <AccountCircle sx={{ color: "#d4af37", fontSize: 18 }} />
                <Typography variant="body2" sx={{ color: "#fff" }}>
                  {allDevAccounts[Number(v)]?.name || "..."}
                </Typography>
              </Box>
            )
          }
        >
          {allDevAccounts.map((account, index) => (
            <MenuItem
              key={account.id}
              value={index}
              sx={{
                backgroundColor: "#2a2a2a",
                color: "#fff",
                "&:hover": { backgroundColor: "#3a3a3a" },
                "&.Mui-selected": {
                  backgroundColor: "#4a4a4a",
                  "&:hover": { backgroundColor: "#4a4a4a" },
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <AccountCircle sx={{ color: "#d4af37", fontSize: 18 }} />
                <Box>
                  <Typography variant="body2" sx={{ color: "#fff" }}>
                    {account.name || "Unnamed Account"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#888", fontSize: "0.7rem" }}>
                    {account.address.slice(0, 10)}...{account.address.slice(-8)}
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
