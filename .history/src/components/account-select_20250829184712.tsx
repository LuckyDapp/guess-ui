import type { WalletAccount } from "@reactive-dot/core/wallets.js";
import { useConnectedWallets, useAccounts } from "@reactive-dot/react";
import { type ReactNode, useState } from "react";

type AccountSelectProps = {
    children: (account: WalletAccount) => ReactNode;
};

export function AccountSelect({ children }: AccountSelectProps) {
    const connectedWallets = useConnectedWallets();
    const accounts = useAccounts();

    console.log('🔗 AccountSelect Debug:', {
        connectedWalletsCount: connectedWallets.length,
        accountsCount: accounts.length,
        accounts: accounts.map(acc => ({ name: acc.name, address: acc.address.slice(0, 10) + '...' }))
    });

    const [selectedAccountIndex, setSelectedAccountIndex] = useState(0);
    const selectedAccount =
        selectedAccountIndex === undefined
            ? undefined
            : accounts.at(selectedAccountIndex);

    return (
        <div>
            {connectedWallets.length === 0 ? (
                <div>
                    <p>🔌 Please connect a wallet</p>
                    <p style={{ fontSize: '12px', color: '#888' }}>
                        Connected wallets: {connectedWallets.length} | Accounts: {accounts.length}
                    </p>
                </div>
            ) : (
                <article>
                    <div style={{ marginBottom: '10px', fontSize: '12px', color: '#64b5f6' }}>
                        📱 Connected wallets: {connectedWallets.length} | Accounts: {accounts.length}
                    </div>
                    <select
                        value={selectedAccountIndex}
                        onChange={(event) =>
                            setSelectedAccountIndex(Number(event.target.value))
                        }
                        style={{
                            backgroundColor: '#1a1a1a',
                            color: 'white',
                            border: '1px solid #333',
                            padding: '8px',
                            borderRadius: '4px'
                        }}
                    >
                        {accounts.map((account, index) => (
                            // eslint-disable-next-line @eslint-react/no-array-index-key
                            <option key={index} value={index}>
                                {account.name ?? account.address.slice(0, 20) + '...'}
                            </option>
                        ))}
                    </select>
                </article>
            )}
            {selectedAccount !== undefined && (
                <div>
                    <div style={{ margin: '10px 0', fontSize: '12px', color: '#4caf50' }}>
                        ✅ Selected Account: {selectedAccount.name || selectedAccount.address.slice(0, 20) + '...'}
                    </div>
                    {children(selectedAccount)}
                </div>
            )}
        </div>
    );
}