import {contracts, pah} from "@polkadot-api/descriptors";
import {getWsProvider} from "@polkadot-api/ws-provider/web";
import {defineConfig, defineContract} from "@reactive-dot/core";
import {InjectedWalletProvider} from "@reactive-dot/core/wallets.js";
import {registerDotConnect} from "dot-connect";

const PAH_RPC = "wss://westend-asset-hub-rpc.polkadot.io";
const PAH_CONTRACT_ADDRESS = "0x6fb458aF1ef0ec5fb31246C592ec69a3f7B00bd0";

// Fallback RPC en cas d'erreur de connexion
const FALLBACK_RPC = "wss://rpc.polkadot.io";

export const config = defineConfig({
    chains: {
        pah: {
            descriptor: pah,
            provider: getWsProvider(PAH_RPC),
            rpc: PAH_RPC,
            contractAddress: PAH_CONTRACT_ADDRESS,
        },
    },
    targetChains: ["pah"],
    wallets: [
        new InjectedWalletProvider(),
    ],
});

// @ts-ignore
registerDotConnect({wallets: config.wallets,})

export const gtnContract = defineContract({
    descriptor: contracts.guess_the_number_westend,
});

export const getContractAddress = (chainId: string): string => {
    // @ts-ignore
    return config.chains[chainId]?.contractAddress;
}

export const getRpc = (chainId: string): string => {
    // @ts-ignore
    return config.chains[chainId]?.rpc;
}