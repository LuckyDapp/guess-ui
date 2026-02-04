import { createContext, useContext, type ReactNode } from "react";
import type { PolkadotSigner } from "polkadot-api/signer";

export type DevAccount = {
  id: string;
  name: string;
  address: string;
  polkadotSigner: PolkadotSigner;
  wallet?: unknown;
};

const DEV_ACCOUNT_NAMES = ["Alice", "Bob", "Charlie", "Dave", "Eve", "Ferdie"] as const;

type DevAccountContextType = {
  devAccounts: DevAccount[];
  selectedDevAccount: DevAccount | null;
  selectDevAccount: (account: DevAccount) => void;
};

const DevAccountContext = createContext<DevAccountContextType | null>(null);

export function DevAccountProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: DevAccountContextType;
}) {
  return (
    <DevAccountContext.Provider value={value}>{children}</DevAccountContext.Provider>
  );
}

export function useDevAccount() {
  return useContext(DevAccountContext);
}

export { DEV_ACCOUNT_NAMES };
