# Guess The Number UI

A decentralized web application for playing "Guess the Number" on the Polkadot blockchain using Ink! smart contracts. The application integrates with a GraphQL indexer to provide a complete game history and NFT token management.

## Features

### Game Tab
- **Start New Game**: Create a new game by specifying a number range (min-max)
- **Make Guesses**: Submit guesses and receive hints (More/Less/Found)
- **Attempts History**: View complete history of all attempts with results from the GraphQL indexer
- **Game Management**: Abandon current game and start a new one
- **Account Mapping**: Automatic detection and mapping of unmapped accounts for Revive pallet

### NFT Tab
- **View Tokens**: Browse all tokens or filter by your owned tokens
- **Mint Tokens**: Create new NFT tokens with customizable max attempts
- **Transfer Tokens**: Transfer your tokens to other addresses
- **Burn Tokens**: Destroy tokens you own
- **Token Details**: View token ID, max attempts, owner address, and mint date

### Account Management
- **Wallet Integration**: Connect with Talisman or other Polkadot wallets
- **Development Accounts**: Use development accounts when connected to dev RPC
- **Account Persistence**: Last selected account is saved in localStorage
- **Account Switching**: Easy switching between multiple accounts

### UI/UX
- **Responsive Design**: Modern, compact interface with Material-UI components
- **Toast Notifications**: Real-time transaction status updates
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Loading States**: Clear loading indicators during transactions
- **Tab Navigation**: Persistent tab selection (Game/NFT) stored in localStorage

## Tech Stack

- **React** - UI framework
- **TypeScript** - Type safety
- **Material-UI (MUI)** - Component library
- **Polkadot-API** - Blockchain interaction
- **@polkadot-api/sdk-ink** - Ink! smart contract SDK
- **@reactive-dot/react** - React hooks for Polkadot
- **react-hot-toast** - Toast notifications
- **GraphQL** - Indexer data queries
- **Vite** - Build tool and dev server

## Development

### Prerequisites

- Node.js (v18 or higher)
- Yarn package manager

### Installation

```bash
yarn install
```

This will automatically:
- Install all dependencies
- Generate Polkadot-API descriptors
- Add contract metadata for the game and NFT contracts

### Running the Development Server

```bash
yarn dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production

```bash
yarn build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
yarn serve
```

## Project Structure

```
src/
├── components/          # React components
│   ├── app.tsx         # Main app component with header and routing
│   ├── game.tsx        # Game component (without history)
│   ├── game-with-history.tsx  # Game component with full history
│   ├── nft-tab.tsx     # NFT management interface
│   └── ...
├── contexts/           # React contexts for state management
│   ├── game-context.tsx
│   ├── selected-account-context.tsx
│   ├── tab-navigation-context.tsx
│   └── ...
├── services/           # Business logic services
│   ├── token-indexer.ts  # GraphQL indexer queries
│   └── ...
├── contract.tsx        # Smart contract interaction layer
├── nft-contract.ts     # NFT contract interaction layer
├── config.ts           # Configuration (RPC, contract addresses)
└── constants/          # Application constants
```

## Configuration

### Network Settings

The application connects to:
- **RPC**: `wss://query.substrate.fi/guess-the-number-node`
- **Game Contract**: `0x987b94aaff6c60d10002d76f7ec2fe3fef837559`
- **NFT Contract**: `0xeb3c4a6d9dd4b62eca09f87e5de151f37c02c2e7`
- **GraphQL Indexer**: `https://query2.substrate.fi/squid-guess/graphql`

Configuration can be modified in `src/config.ts` and `src/constants/index.ts`.

## Features Details

### GraphQL Indexer Integration

The application uses a Subsquid GraphQL indexer to:
- Fetch complete game history with all attempts
- Query NFT token data
- Get player statistics (maxMaxAttempts)

### Address Format

The application uses the **Revive** address format (H160/EVM-compatible addresses derived from SS58 using Keccak-256 hashing) for all contract interactions.

### Account Persistence

- Selected wallet accounts are saved in localStorage
- Selected development accounts are saved in localStorage
- Active tab (Game/NFT) is persisted across page reloads

## Scripts

- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn serve` - Preview production build
- `yarn generate` - Regenerate Polkadot-API descriptors and contract metadata
- `yarn clean` - Remove build artifacts and generated files

## License

Apache-2.0
