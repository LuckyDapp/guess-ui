import {contracts, pah} from "@polkadot-api/descriptors";
import {getWsProvider} from "@polkadot-api/ws-provider/web";
import {defineConfig, defineContract} from "@reactive-dot/core";
import {InjectedWalletProvider} from "@reactive-dot/core/wallets.js";
import {registerDotConnect} from "dot-connect";

const PAH_RPC = "wss://testnet-passet-hub.polkadot.io";
const PAH_CONTRACT_ADDRESS = "0xe75cbD47620dBb2053CF2A98D06840f06baAf141";

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
    descriptor: contracts.guess_the_number,
});

export const getContractAddress = (chainId: string): string => {
    // @ts-ignore
    return config.chains[chainId]?.contractAddress;
}

export const getRpc = (chainId: string): string => {
    // @ts-ignore
    return config.chains[chainId]?.rpc;
}