import {contracts, pah} from "@polkadot-api/descriptors";
import {getWsProvider} from "@polkadot-api/ws-provider/web";
import {defineConfig, defineContract} from "@reactive-dot/core";
import {InjectedWalletProvider} from "@reactive-dot/core/wallets.js";
import {registerDotConnect} from "dot-connect";
import { toChecksumAddress } from "./utils/address-converter";

// ============================================================================
// Application Constants
// ============================================================================

// Animation constants
export const ANIMATION_DURATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 1000,
} as const;

// Three.js constants
export const THREE_CONFIG = {
  PARTICLE_COUNT: 100,
  PARTICLE_SIZE: 0.05,
  PARTICLE_OPACITY: 0.6,
  CAMERA_FOV: 75,
  CAMERA_NEAR: 0.1,
  CAMERA_FAR: 1000,
  CAMERA_POSITION_Z: 5,
  ROTATION_SPEED_X: 0.01,
  ROTATION_SPEED_Y: 0.04,
} as const;

// Game constants
export const GAME_CONFIG = {
  MIN_RANGE: 1,
  MAX_RANGE: 1000,
  DEFAULT_MIN: 1,
  DEFAULT_MAX: 100,
  REFRESH_INTERVAL: 10000, // 10 seconds
} as const;

/** Marge supérieure des toasts (sous le header) - doit correspondre à --toast-top-offset dans variables.css */
export const TOAST_TOP_OFFSET_PX = 64;

// UI constants
export const UI_CONFIG = {
  CONTAINER_MAX_WIDTH: 1400,
  GAME_MAX_WIDTH: 800,
  GUESS_MAX_WIDTH: 600,
  CUBE_SIZE: 120,
  CUBE_CONTAINER_SIZE: 280,
} as const;

// Toast messages
export const TOAST_MESSAGES = {
  TRANSACTION_LOADING: "Submitting transaction...",
  TRANSACTION_SUCCESS: "Transaction successful",
  TRANSACTION_ERROR: "Transaction failed",
  VALIDATION_ERROR: "Please check your input",
  NETWORK_ERROR: "Network connection error",
  WALLET_ERROR: "Wallet connection error",
} as const;

// CSS class names
export const CSS_CLASSES = {
  CONTENT_BLOCK: "content-block",
  FADE_IN: "fade-in",
  FADE_IN_SCALE: "fade-in-scale",
  SLIDE_UP: "slide-up",
  CARD_HOVER: "card-hover",
  INTERACTIVE_BUTTON: "interactive-button",
} as const;

// Error messages
export const ERROR_MESSAGES = {
  INVALID_NUMBER: "The input must be a positive number",
  MIN_MAX_REQUIRED: "Please enter both min and max values",
  MIN_LESS_THAN_MAX: "Min must be less than Max",
  NO_GAME: "No game yet",
  LOADING_GAME: "Loading game...",
  SOMETHING_WRONG: "Oops, something went wrong!",
} as const;

// Network constants
export const NETWORK_CONFIG = {
  RPC_URL: "wss://query.substrate.fi/guess-the-number-node",
  CONTRACT_ADDRESS: "0x987b94aaff6c60d10002d76f7ec2fe3fef837559",
  /** ERC721 NFT contract address */
  NFT_CONTRACT_ADDRESS: "0xeb3c4a6d9dd4b62eca09f87e5de151f37c02c2e7",
  EXPLORER_URL: "https://polkadot.js.org/apps/",
  /** Squid indexer GraphQL endpoint for tokens */
  INDEXER_GRAPHQL_URL: "https://query2.substrate.fi/squid-guess/graphql",
} as const;

// ============================================================================
// Polkadot-API Configuration
// ============================================================================

export const config = defineConfig({
    chains: {
        pah: {
            descriptor: pah,
            provider: getWsProvider(NETWORK_CONFIG.RPC_URL),
            rpc: NETWORK_CONFIG.RPC_URL,
            contractAddress: NETWORK_CONFIG.CONTRACT_ADDRESS,
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

export const erc721Contract = defineContract({
    descriptor: contracts.erc721,
});

export const getContractAddress = (chainId: string): string => {
    // @ts-ignore
    return config.chains[chainId]?.contractAddress;
}

export const getRpc = (chainId: string): string => {
    // @ts-ignore
    return config.chains[chainId]?.rpc;
}

export const getNftContractAddress = (chainId: string): string => {
    return toChecksumAddress(NETWORK_CONFIG.NFT_CONTRACT_ADDRESS);
}