# Documentation : Architecture d'Indexation Blockchain

## Vue d'ensemble

Cette documentation détaille l'architecture complète utilisée dans l'application "Guess the Number" pour récupérer, traiter et indexer les blocs, transactions et événements de la blockchain Passet-Hub (Polkadot).

## 1. Configuration et Connexion

### 1.1 Configuration de base

```typescript
// src/config.ts
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
});
```

### 1.2 Client API Singleton

```typescript
// src/api-client.ts
import { createClient } from "polkadot-api";

let apiClient: any = null;

export const createApiClient = async () => {
    if (!apiClient) {
        const rpc = getRpc('0x5102'); // Passet-Hub chainId
        apiClient = createClient(rpc);
        
        // Test de connexion
        const chain = await apiClient.getChain();
        console.log('🔗 Connected to chain:', chain);
    }
    return apiClient;
};
```

## 2. Récupération des Blocs

### 2.1 Abonnement aux Blocs Finalisés

L'application utilise `client.finalizedBlock$` pour s'abonner aux nouveaux blocs finalisés :

```typescript
// src/global-event-subscriber.ts
export function setupFinalizedBlocksWatcher(
  chainId: string,
  onDecoded?: (evt: Omit<GameEvent, 'id' | 'timestamp'>) => void,
): Unsubscribe | null {
  
  const subscription = client.finalizedBlock$.subscribe(async (finalizedBlock) => {
    console.log('🔭 BlockWatcher: new finalized block', finalizedBlock.number, finalizedBlock.hash);
    
    // Structure du bloc finalisé :
    // {
    //   hash: "0x...",
    //   number: 1234567,
    //   parent: "0x..."
    // }
    
    // Récupération des événements du bloc
    const events = await typedApi.query.System.Events.getValue({
      at: finalizedBlock.hash
    });
    
    // Traitement des événements...
  });
}
```

### 2.2 Structure des Blocs

```typescript
interface FinalizedBlock {
  hash: string;      // Hash du bloc
  number: number;    // Numéro du bloc
  parent: string;    // Hash du bloc parent
}
```

## 3. Récupération des Transactions

### 3.1 Soumission de Transactions

```typescript
// src/contract.tsx
export class MyContract {
  async makeAGuessWithHistory(
    guess: number,
    signer: PolkadotSigner,
    callbacks: TransactionCallback
  ): Promise<string> {
    
    // 1. Création de l'observateur d'événements
    const observer = this.buildEventObserverWithHistory(txId, callbacks);
    
    // 2. Soumission de la transaction
    const tx = this.contract.send.makeAGuess({
      origin: signer.address,
      data: { guess }
    });
    
    // 3. Abonnement aux événements de la transaction
    tx.subscribe(observer);
    
    return txId;
  }
}
```

### 3.2 Observateur d'Événements de Transaction

```typescript
// src/contract.tsx
private buildEventObserverWithHistory(
  txId: string, 
  callbacks: TransactionCallback
): Observer<TxEvent> {
  
  return {
    next: (event) => {
      switch (event.type) {
        case "signed":
          // Transaction signée
          callbacks.onSigned?.(txId, event.txHash);
          break;
          
        case "broadcasted":
          // Transaction diffusée
          callbacks.onBroadcasted?.(txId, event.txHash);
          break;
          
        case "txBestBlocksState":
          // Transaction dans un bloc
          callbacks.onInBlock?.(txId, event.txHash, event.block);
          break;
          
        case "finalized":
          // Transaction finalisée
          callbacks.onFinalized?.(txId, event.txHash, event.block);
          
          // Traitement des événements du bloc
          if (event.events) {
            processBlockEvents(event.events, txId, event.block?.number, event.txHash, callbacks.onBlockEvents);
          }
          break;
      }
    }
  };
}
```

## 4. Récupération et Traitement des Événements

### 4.1 Structure des Événements Blockchain

Les événements dans Polkadot-API ont cette structure :

```typescript
interface BlockEvent {
  type: string;           // Nom du pallet (ex: "Revive", "Balances")
  value: {
    type: string;         // Type d'événement (ex: "ContractEmitted")
    value: {
      contract: Binary;   // Adresse du contrat
      data: Binary;       // Données de l'événement
      topics: Binary[];   // Topics indexés
    }
  };
  topics: Binary[];       // Topics globaux
}
```

### 4.2 Filtrage des Événements de Contrat

```typescript
// src/block-event-processor.ts
export const processBlockEvents = (
    blockEvents: any[], 
    txId: string, 
    blockNumber?: number, 
    txHash?: string,
    onEventDetected?: (txId: string, event: Omit<GameEvent, 'id' | 'timestamp'>) => void
): void => {
    
    blockEvents.forEach((record: any) => {
        const palletName = record.type;
        const eventValue = record.value;
        
        // Filtrer les événements du pallet Revive (contrats)
        if (palletName === 'Revive' && eventValue?.type === 'ContractEmitted') {
            
            const contractData = eventValue.value;
            const contractAddress = contractData?.contract;
            const eventData = contractData?.data;
            const topics = contractData?.topics;
            
            // Décoder l'adresse du contrat
            const contractAddressHex = contractAddress?.asHex?.();
            
            // Vérifier si c'est notre contrat
            if (contractAddressHex === getContractAddress(chainId)) {
                
                // Décoder les données de l'événement
                const eventDataBytes = eventData?.asBytes?.();
                const topicsDecoded = topics?.map((topic: any) => topic?.asBytes?.());
                
                // Décoder l'événement
                const decodedEvent = decodeContractEvent(eventDataBytes, topicsDecoded);
                
                if (decodedEvent) {
                    decodedEvent.blockNumber = blockNumber;
                    decodedEvent.txHash = txHash;
                    onEventDetected?.(txId, decodedEvent);
                }
            }
        }
    });
};
```

### 4.3 Décodage des Événements de Contrat

```typescript
// src/event-decoder.ts

// Signatures des événements (premier topic)
const EVENT_SIGNATURES = {
    '0xc8a7c5d86cdaf43555273e08a00e4cdaa93cf22046685231d5eb1b6c0d29fa92': 'NewGame',
    '0xbfe3e4de23c556408a7c400baf6b27364bdb763595ac8f3547c20db70131083a': 'GuessMade',
    '0xd30c753e3012d98d428abde3eebaae62a09d7d043d8018f1ecb4e6c5d3dc9429': 'ClueGiven'
};

export const decodeContractEvent = (
    eventBytes: Uint8Array, 
    topics: Uint8Array[]
): Omit<GameEvent, 'id' | 'timestamp'> | null => {
    
    // Le premier topic est la signature de l'événement
    const signatureTopic = topics[0];
    const signatureHex = '0x' + Array.from(signatureTopic)
        .map(b => b.toString(16).padStart(2, '0')).join('');
    
    const eventType = EVENT_SIGNATURES[signatureHex];
    
    if (!eventType) return null;
    
    // Décodage manuel selon le type d'événement
    switch (eventType) {
        case 'NewGame': {
            // Structure: game_number (u128), player (H160), min_number (u16), max_number (u16)
            const gameNumber = decodeU128LittleEndian(eventBytes, 0);
            const player = decodeAddress(eventBytes, 16);
            const minNumber = decodeU16LittleEndian(eventBytes, 36);
            const maxNumber = decodeU16LittleEndian(eventBytes, 38);
            
            return {
                eventType: 'game_started',
                data: { gameNumber, minNumber, maxNumber }
            };
        }
        
        case 'GuessMade': {
            // Structure: game_number (u128), attempt (u32), guess (u16)
            const gameNumber = decodeU128LittleEndian(eventBytes, 0);
            const attempt = decodeU32LittleEndian(eventBytes, 16);
            const guess = decodeU16LittleEndian(eventBytes, 20);
            
            return {
                eventType: 'guess_submitted',
                data: { gameNumber, attemptNumber: attempt, guess }
            };
        }
        
        case 'ClueGiven': {
            // Structure: game_number (u128), attempt (u32), guess (u16), clue (enum)
            const gameNumber = decodeU128LittleEndian(eventBytes, 0);
            const attempt = decodeU32LittleEndian(eventBytes, 16);
            const guess = decodeU16LittleEndian(eventBytes, 20);
            const clueValue = eventBytes[22];
            const clue = ['More', 'Less', 'Found'][clueValue];
            
            return {
                eventType: 'guess_result',
                data: { gameNumber, attemptNumber: attempt, guess, result: clue }
            };
        }
    }
};
```

### 4.4 Fonctions de Décodage Binaire

```typescript
// Fonctions utilitaires pour décoder les données binaires
function decodeU128LittleEndian(bytes: Uint8Array, offset: number): bigint {
    const slice = bytes.slice(offset, offset + 16);
    return BigInt('0x' + Array.from(slice).reverse()
        .map(b => b.toString(16).padStart(2, '0')).join(''));
}

function decodeU32LittleEndian(bytes: Uint8Array, offset: number): number {
    return bytes[offset] | (bytes[offset + 1] << 8) | 
           (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
}

function decodeU16LittleEndian(bytes: Uint8Array, offset: number): number {
    return bytes[offset] | (bytes[offset + 1] << 8);
}

function decodeAddress(bytes: Uint8Array, offset: number): string {
    const slice = bytes.slice(offset, offset + 20);
    return '0x' + Array.from(slice)
        .map(b => b.toString(16).padStart(2, '0')).join('');
}
```

## 5. Gestion de l'Historique et Persistance

### 5.1 Structure des Données

```typescript
// src/types.ts
export interface TransactionHistory {
  id: string;
  timestamp: number;
  txHash?: string;
  blockNumber?: number;
  call: string;
  parameters: any;
  status: 'pending' | 'submitted' | 'finalized' | 'failed';
  events?: GameEvent[];
}

export interface GameEvent {
  id: string;
  timestamp: number;
  blockNumber?: number;
  eventType: 'guess_submitted' | 'guess_result' | 'game_started';
  data: {
    gameNumber?: bigint;
    attemptNumber?: number;
    guess?: number;
    result?: 'More' | 'Less' | 'Found';
    minNumber?: number;
    maxNumber?: number;
  };
  txHash?: string;
}
```

### 5.2 Persistance en LocalStorage

```typescript
// src/contexts/transaction-history-context.tsx
export const TransactionHistoryProvider = ({ children }) => {
  const [transactions, setTransactions] = useState<TransactionHistory[]>([]);
  
  // Chargement depuis localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const deserialized = deserializeTransactions(parsed);
        setTransactions(deserialized);
      } catch (error) {
        console.error('Failed to load transaction history:', error);
      }
    }
  }, []);
  
  // Sauvegarde vers localStorage
  const saveTransactions = useCallback((newTransactions: TransactionHistory[]) => {
    try {
      const serialized = serializeTransactions(newTransactions);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
    } catch (error) {
      console.error('Failed to save transaction history:', error);
    }
  }, []);
};
```

### 5.3 Optimisation du Stockage

```typescript
// Optimisation pour éviter les erreurs de quota localStorage
const MAX_HISTORY_SIZE = 50;

const minifyTransaction = (tx: TransactionHistory) => ({
  i: tx.id,           // id
  t: tx.timestamp,    // timestamp
  h: tx.txHash,       // txHash
  b: tx.blockNumber,  // blockNumber
  c: tx.call,         // call
  s: tx.status,       // status
  p: JSON.stringify(tx.parameters), // parameters (stringified)
  e: tx.events?.map(minifyEvent)    // events
});

const minifyEvent = (event: GameEvent) => ({
  et: event.eventType,  // eventType
  d: JSON.stringify(event.data), // data (stringified)
  b: event.blockNumber, // blockNumber
  h: event.txHash       // txHash
});
```

## 6. Scripts d'Indexation Standalone

### 6.1 Script de Scan de Blocs

```javascript
// src/scripts/scan-blocks.mjs
import { ApiPromise, WsProvider } from '@polkadot/api';

const RPC = "wss://testnet-passet-hub.polkadot.io";
const CONTRACT = "0xe75cbd47620dbb2053cf2a98d06840f06baaf141";

async function scanBlock(api, blockNumber) {
  const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
  const at = await api.at(blockHash);
  const allEvents = await at.query.system.events();
  
  console.log(`\n# Block ${blockNumber} (${String(blockHash)}) - ${allEvents.length} events`);

  for (const { event, phase } of allEvents) {
    const { section, method, data } = event;
    if (section === 'revive' && method === 'ContractEmitted') {
      const [contract, eventData, topics] = data;
      const addr = String(contract).toLowerCase();
      if (addr !== CONTRACT) continue;
      
      // Décoder l'événement...
      const decoded = decodeEventData(topics[0], eventData.toHex());
      console.log(`- ContractEmitted ${decoded.__kind}`);
    }
  }
}
```

### 6.2 Script de Recherche de Transaction

```javascript
// src/scripts/find-tx.mjs
async function findInFinalized(api, hashHex, depth) {
  let blockHash = await api.rpc.chain.getFinalizedHead();
  
  for (let i = 0; i < depth; i++) {
    const block = await api.rpc.chain.getBlock(blockHash);
    const blockNumber = block.block.header.number.toNumber();
    
    for (let j = 0; j < block.block.extrinsics.length; j++) {
      const tx = block.block.extrinsics[j];
      if (tx.hash.toHex() === hashHex) {
        return { blockHash, blockNumber, index: j };
      }
    }
    
    blockHash = block.block.header.parentHash;
    if (!blockHash) break;
  }
  return null;
}
```

## 7. Architecture d'Indexation Recommandée

### 7.1 Application d'Indexation Autonome

Pour créer une application d'indexation autonome, voici l'architecture recommandée :

```typescript
class BlockchainIndexer {
  private api: ApiPromise;
  private contractAddress: string;
  private eventHandlers: Map<string, Function>;
  
  constructor(rpc: string, contractAddress: string) {
    this.contractAddress = contractAddress;
    this.eventHandlers = new Map();
  }
  
  async initialize() {
    this.api = await ApiPromise.create({ 
      provider: new WsProvider(this.rpc) 
    });
  }
  
  // Abonnement aux blocs finalisés
  async subscribeToFinalizedBlocks() {
    await this.api.rpc.chain.subscribeFinalizedHeads(async (header) => {
      const blockNumber = header.number.toNumber();
      const blockHash = header.hash;
      
      await this.processBlock(blockNumber, blockHash);
    });
  }
  
  // Traitement d'un bloc
  async processBlock(blockNumber: number, blockHash: string) {
    const at = await this.api.at(blockHash);
    const events = await at.query.system.events();
    
    for (const { event, phase } of events) {
      if (event.section === 'revive' && event.method === 'ContractEmitted') {
        const [contract, eventData, topics] = event.data;
        
        if (String(contract).toLowerCase() === this.contractAddress.toLowerCase()) {
          await this.processContractEvent(blockNumber, blockHash, eventData, topics);
        }
      }
    }
  }
  
  // Traitement d'un événement de contrat
  async processContractEvent(blockNumber: number, blockHash: string, eventData: any, topics: any[]) {
    const signature = topics[0].toHex();
    const eventType = this.getEventType(signature);
    
    if (eventType) {
      const decoded = this.decodeEvent(eventType, eventData.toHex());
      await this.storeEvent(blockNumber, blockHash, eventType, decoded);
    }
  }
  
  // Stockage des événements
  async storeEvent(blockNumber: number, blockHash: string, eventType: string, data: any) {
    // Implémentation du stockage (base de données, fichier, etc.)
    console.log(`Stored ${eventType} event from block ${blockNumber}:`, data);
  }
}
```

### 7.2 Base de Données Recommandée

Pour une application d'indexation robuste, utilisez :

- **PostgreSQL** avec extension `pg_crypto` pour les hashes
- **Index** sur `block_number`, `contract_address`, `event_type`
- **Tables** :
  - `blocks` (hash, number, timestamp, parent_hash)
  - `transactions` (hash, block_number, index, sender, data)
  - `contract_events` (block_number, tx_hash, event_type, data, topics)

### 7.3 Gestion des Erreurs et Reconnexion

```typescript
class RobustIndexer extends BlockchainIndexer {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  
  async start() {
    while (this.reconnectAttempts < this.maxReconnectAttempts) {
      try {
        await this.initialize();
        await this.subscribeToFinalizedBlocks();
        this.reconnectAttempts = 0; // Reset on success
      } catch (error) {
        this.reconnectAttempts++;
        console.error(`Connection failed (attempt ${this.reconnectAttempts}):`, error);
        await this.delay(5000 * this.reconnectAttempts);
      }
    }
  }
  
  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## 8. Points Clés pour l'Implémentation

### 8.1 Dépendances Principales

```json
{
  "dependencies": {
    "@polkadot/api": "^10.x.x",
    "polkadot-api": "^0.x.x",
    "@polkadot-api/descriptors": "^0.x.x",
    "ws": "^8.x.x"
  }
}
```

### 8.2 Configuration RPC

- **Passet-Hub Testnet** : `wss://testnet-passet-hub.polkadot.io`
- **Passet-Hub Mainnet** : `wss://rpc.passet-hub.polkadot.io`
- **Fallback** : `wss://rpc.polkadot.io`

### 8.3 Signatures d'Événements

Les signatures d'événements sont générées à partir du metadata du contrat et sont spécifiques à chaque déploiement. Elles doivent être extraites du metadata ou calculées.

### 8.4 Gestion de la Mémoire

- Limiter la taille de l'historique en mémoire
- Utiliser des streams pour les gros volumes de données
- Implémenter un système de pagination pour les requêtes

Cette documentation fournit une base solide pour créer une application d'indexation autonome basée sur l'architecture existante de l'application "Guess the Number".
