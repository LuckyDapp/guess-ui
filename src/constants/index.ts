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
  ROTATION_SPEED_X: 0.001,
  ROTATION_SPEED_Y: 0.002,
} as const;

// Game constants
export const GAME_CONFIG = {
  MIN_RANGE: 1,
  MAX_RANGE: 1000,
  DEFAULT_MIN: 1,
  DEFAULT_MAX: 100,
  REFRESH_INTERVAL: 10000, // 10 seconds
} as const;

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
  RPC_URL: "wss://testnet-passet-hub.polkadot.io",
  CONTRACT_ADDRESS: "0xe75cbD47620dBb2053CF2A98D06840f06baAf141",
  EXPLORER_URL: "https://polkadot.js.org/apps/",
} as const;
