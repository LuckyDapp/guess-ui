import {contracts, pah} from "@polkadot-api/descriptors"
import {createClient, type TxEvent} from "polkadot-api"
import {withPolkadotSdkCompat} from "polkadot-api/polkadot-sdk-compat"
import {type PolkadotSigner} from "polkadot-api/signer"
import {getWsProvider} from "polkadot-api/ws-provider/web"
import {createReviveSdk} from "@polkadot-api/sdk-ink"
import {encodeAddress} from "@polkadot/keyring"
import {toast} from "react-hot-toast"
import {type Observer} from "rxjs"
import {getContractAddress, getRpc} from "./config.ts";
import type { TransactionHistory, GameEvent, Game } from "./types";
import { processBlockEvents } from "./block-event-processor";

/** Normalize contract response (camelCase or snake_case) to Game type */
function normalizeGameResponse(raw: any): Game | null {
    if (!raw || typeof raw !== 'object') return null;
    const gn = raw.game_number ?? raw.gameNumber;
    const mn = raw.min_number ?? raw.minNumber;
    const mx = raw.max_number ?? raw.maxNumber;
    const att = raw.attempt;
    const lg = raw.last_guess ?? raw.lastGuess;
    const lc = raw.last_clue ?? raw.lastClue;
    const ma = raw.max_attempts ?? raw.maxAttempts;
    if (gn == null || mn == null || mx == null || att == null) return null;
    return {
        game_number: typeof gn === 'bigint' ? gn : BigInt(gn),
        min_number: Number(mn),
        max_number: Number(mx),
        attempt: Number(att),
        last_guess: lg != null ? Number(lg) : undefined,
        last_clue: lc != null
            ? { type: (typeof lc === 'object' ? (lc.type ?? (lc as any)) : lc) as 'More' | 'Less' | 'Found', value: undefined }
            : undefined,
        max_attempts: ma != null ? Number(ma) : undefined,
        cancelled: raw.cancelled
    };
}

function isAccountUnmappedError(value: unknown): boolean {
    const errType = (value as any)?.value?.value?.type ?? (value as any)?.value?.type ?? (value as any)?.type;
    const errStr = JSON.stringify(value ?? "");
    return String(errType) === "AccountUnmapped" || errStr.includes("AccountUnmapped");
}

export type AccountUnmappedDetail = 
    | { type: "start_new_game"; min: number; max: number }
    | { type: "guess"; guess: number }
    | { type: "map_account" };

function emitAccountUnmapped(detail?: AccountUnmappedDetail): void {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("account-unmapped", { detail: detail ?? { type: "map_account" } }));
    }
}

// Fonction pour générer l'URL de l'explorer
function getExplorerUrl(txHash: string, chainId: string): string {
    if (!txHash) {
        return 'https://polkadot.js.org/apps/';
    }
    
    console.log('Generating explorer URL for hash:', txHash, 'chainId:', chainId);
    
    // Utiliser l'URL de décodage pour les transactions signées
    // qui commencent par 0x5102... (format des transactions signées)
    if (txHash.startsWith('0x5102')) {
        const decodeUrl = `https://polkadot.js.org/apps/#/extrinsics/decode/${txHash}`;
        console.log('Generated decode URL:', decodeUrl);
        return decodeUrl;
    }
    
    // Pour les autres hashes, utiliser l'URL normale des extrinsics
    const normalUrl = `https://polkadot.js.org/apps/#/extrinsics/${txHash}`;
    console.log('Generated normal URL:', normalUrl);
    return normalUrl;
}

let myContracts = new Map<string, MyContract>();

export function getOrCreateContract(chainId : string) : MyContract {
    const address = getContractAddress(chainId);
    if (!myContracts.has(address)) {
        const rpc = getRpc(chainId);
        myContracts.set(address, new MyContract(rpc, address));
    }
    // @ts-ignore
    return myContracts.get(address);
}

export class MyContract {

    contract: any
    private typedApi: any

    constructor(
        rpc: string,
        address: string,
    ) {
        const client = createClient(withPolkadotSdkCompat(getWsProvider(rpc)))
        const typedApi = client.getTypedApi(pah)
        this.typedApi = typedApi;
        const sdk = createReviveSdk(typedApi as any, contracts.guess_the_number_westend)
        this.contract = sdk.getContract(address)
    }

    /** Mappe le compte Substrate dans Revive (pallet Revive.map_account) */
    async mapAccount(signer: PolkadotSigner, chainId: string): Promise<boolean> {
        try {
            const reviveTx = (this.typedApi.tx as any)?.Revive ?? (this.typedApi.tx as any)?.revive;
            const tx = reviveTx?.map_account?.() ?? reviveTx?.mapAccount?.();
            if (!tx) {
                toast.error("Revive.map_account not available on this chain");
                return false;
            }
            return new Promise((resolve) => {
                const sub = tx.signSubmitAndWatch(signer).subscribe({
                    next: (e: TxEvent) => {
                        if (e.type === "finalized") {
                            toast.success("Account mapped successfully!");
                            sub.unsubscribe();
                            resolve(true);
                        }
                    },
                    error: (err: unknown) => {
                        toast.error("Map account error: " + (err instanceof Error ? err.message : String(err)));
                        resolve(false);
                    },
                    complete: () => resolve(false),
                });
            });
        } catch (err) {
            toast.error("Map account error: " + (err instanceof Error ? err.message : String(err)));
            return false;
        }
    }

    async getCurrentGame(sender: PolkadotSigner): Promise<any> {
        try {
            // Encoder la clé publique pour obtenir l'adresse SS58
            const senderAddress = encodeAddress(sender.publicKey)

            const {value, success} = await this.contract.query(
                "get_current_game",
                {
                    origin: senderAddress,
                },
            )
            if (!success) {
                console.warn("No current game found");
                return null;
            }
            
            if (!value || !value.response) {
                console.warn("No game data found");
                return null;
            }
            return normalizeGameResponse(value.response);
        } catch (error) {
            // Ignorer les erreurs de SDK (VectorEnc, etc.) qui n'empêchent pas le fonctionnement
            return null;
        }
    }


    async makeAGuess(signer: PolkadotSigner, guess: number, callback: Callback, chainId: string): Promise<any> {
        try {
            const signerAddress = encodeAddress(signer.publicKey)
            const tx = {
                origin: signerAddress,
                data: {guess},
            }

            console.log("Dry Run ...")
            try {
                const {value, success} = await this.contract.query("guess", tx);
                if (!success) {
                    if (isAccountUnmappedError(value)) {
                        emitAccountUnmapped();
                        return;
                    }
                    const errType = value?.value?.value?.type ?? value?.type;
                    console.error("Error when dry run tx ... ", value);
                    toast.error("Error: " + errType);
                    return;
                }
            } catch (e) {
                console.log("Dry run failed (SDK error), continuing anyway...");
            }

            console.log("Submitting tx ... ")
            const txToast = toast.loading("Submitting Transaction");
            this.contract
                .send("guess", tx)
                .signSubmitAndWatch(signer)
                .subscribe(buildEventObserver(txToast, "Number " + guess + " submitted", callback, chainId));
        } catch (error) {
            console.error("Error in makeAGuess:", error);
            toast.error("Error submitting guess: " + (error instanceof Error ? error.message : String(error)));
        }
    }


    async startNewGame(signer: PolkadotSigner, minNumber: number, maxNumber: number, callback: Callback, chainId: string): Promise<any> {
        try {
            const signerAddress = encodeAddress(signer.publicKey)
            const tx = {
                origin: signerAddress,
                data: {"min_number": minNumber, "max_number": maxNumber},
            }

            console.log("Dry Run ...")
            try {
                const {value, success} = await this.contract.query("start_new_game", tx,)
                if (!success) {
                    if (isAccountUnmappedError(value)) {
                        emitAccountUnmapped();
                        return;
                    }
                    const errType = value?.value?.value?.type ?? value?.type;
                    console.error("Error when dry run tx ... ", value);
                    toast.error("Error: " + errType);
                    return;
                }
            } catch (e) {
                console.log("Dry run failed (SDK error), continuing anyway...");
            }

            console.log("Submitting tx ... ")
            const txToast = toast.loading("Submitting Transaction");
            this.contract
                .send("start_new_game", tx)
                .signSubmitAndWatch(signer)
                .subscribe(buildEventObserver(txToast, "New game started", callback, chainId));
        } catch (error) {
            console.error("Error in startNewGame:", error);
            toast.error("Error starting new game: " + (error instanceof Error ? error.message : String(error)));
        }
    }

    // Nouvelles méthodes avec historique des transactions
    async makeAGuessWithHistory(
        signer: PolkadotSigner, 
        guess: number, 
        callback: TransactionCallback,
        txId?: string,
        chainId?: string
    ): Promise<string | null> {
        try {
            const signerAddress = encodeAddress(signer.publicKey)
            const tx = {
                origin: signerAddress,
                data: {guess},
            }

            console.log("Dry Run ...")
            try {
                const {value, success} = await this.contract.query("guess", tx);
                if (!success) {
                    if (isAccountUnmappedError(value)) {
                        emitAccountUnmapped({ type: "guess", guess });
                        return null;
                    }
                    const errType = value?.value?.value?.type ?? value?.type;
                    console.error("Error when dry run tx ... ", value);
                    toast.error("Error: " + errType);
                    return null;
                }
            } catch (e) {
                console.log("Dry run failed (SDK error), continuing anyway...");
            }

            // Utiliser l'ID fourni ou en créer un nouveau
            const finalTxId = txId || callback.onTransactionCreated?.(`tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`) || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            console.log("Submitting tx with ID:", finalTxId)
            const txToast = toast.loading("Submitting Transaction");
            this.contract
                .send("guess", tx)
                .signSubmitAndWatch(signer)
                .subscribe(buildEventObserverWithHistory(txToast, "Number " + guess + " submitted", callback, finalTxId, chainId || 'pah'));
            
            return finalTxId;
        } catch (error) {
            console.error("Error in makeAGuessWithHistory:", error);
            toast.error("Error submitting guess: " + (error instanceof Error ? error.message : String(error)));
            return null;
        }
    }

    async startNewGameWithHistory(
        signer: PolkadotSigner, 
        minNumber: number, 
        maxNumber: number, 
        callback: TransactionCallback,
        txId?: string,
        chainId?: string
    ): Promise<string | null> {
        try {
            const signerAddress = encodeAddress(signer.publicKey)
            const tx = {
                origin: signerAddress,
                data: {"min_number": minNumber, "max_number": maxNumber},
            }

            console.log("Dry Run ...")
            try {
                const {value, success} = await this.contract.query("start_new_game", tx)
                if (!success) {
                    if (isAccountUnmappedError(value)) {
                        emitAccountUnmapped({ type: "start_new_game", min: minNumber, max: maxNumber });
                        return null;
                    }
                    const errType = value?.value?.value?.type ?? value?.type;
                    console.error("Error when dry run tx ... ", value);
                    toast.error("Error: " + errType);
                    return null;
                }
            } catch (e) {
                console.log("Dry run failed (SDK error), continuing anyway...");
            }

            // Utiliser l'ID fourni ou en créer un nouveau
            const finalTxId = txId || callback.onTransactionCreated?.(`tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`) || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            console.log("Submitting tx with ID:", finalTxId)
            const txToast = toast.loading("Submitting Transaction");
            this.contract
                .send("start_new_game", tx)
                .signSubmitAndWatch(signer)
                .subscribe(buildEventObserverWithHistory(txToast, "New game started", callback, finalTxId, chainId || 'pah'));
            
            return finalTxId;
        } catch (error) {
            console.error("Error in startNewGameWithHistory:", error);
            toast.error("Error starting new game: " + (error instanceof Error ? error.message : String(error)));
            return null;
        }
    }
}


type Callback = () => void;

// Interface pour les callbacks de transaction avec historique
interface TransactionCallback {
  onSuccess: () => void;
  onTransactionCreated?: (txId: string) => void;
  onTransactionUpdate?: (txId: string, updates: Partial<TransactionHistory>) => void;
  onBlockEvents?: (txId: string, events: Array<Omit<GameEvent, 'id' | 'timestamp'>>) => void;
}

function buildEventObserver(toastId: string,  successMessage: string, callback: Callback, chainId: string): Partial<Observer<TxEvent>>{
    return {
        next: (event) => {
            let message =  'Tx event:' + event.type;
            if (event.type === "signed") {
                message = "Signed tx with hash: " + event.txHash;
            } else if (event.type === "broadcasted") {
                message = "Broadcasted tx with hash: " + event.txHash;
            } else if (event.type === "txBestBlocksState") {
                message = "Submitted tx with hash: " + event.txHash;
            } else if (event.type === "finalized") {
                message = "Finalized tx with hash: " + event.txHash;
            }
            const explorerUrl = getExplorerUrl(event?.txHash || '', chainId);
            const toastValue = (_: any) => (
                <span className="toast-tx-result text-right">
                    {message}<br/><a target="_blank" href={explorerUrl}>show in Polkadot.js</a>
                 </span>
            );
            toast.loading(toastValue, {id: toastId});
        },
        error: (message) => {
            console.error(message);
            toast.dismiss(toastId);
            if (String(message).includes("AccountUnmapped")) {
                emitAccountUnmapped();
            } else {
                toast.error(message);
            }
        },
        complete: () => {
            toast.dismiss(toastId);
            toast.success(successMessage, { duration: 5000 });
            callback();
        }
    };
}

function buildEventObserverWithHistory(
    toastId: string, 
    successMessage: string, 
    callback: TransactionCallback,
    txId: string,
    chainId: string
): Partial<Observer<TxEvent>> {
    let successCalled = false;
    const callOnSuccess = () => {
        if (!successCalled) {
            successCalled = true;
            toast.dismiss(toastId);
            toast.success(successMessage, { duration: 5000 });
            callback.onSuccess();
        }
    };
    return {
        next: (event) => {
            let message = 'Tx event:' + event.type;
            let status: TransactionHistory['status'] = 'pending';
            let blockNumber: number | undefined = undefined;
            
            console.log('Transaction event received:', event);
            
            if (event.type === "signed") {
                message = "Signed tx with hash: " + event.txHash;
                status = 'submitted';
                callback.onTransactionUpdate?.(txId, { 
                    status, 
                    txHash: event.txHash 
                });
            } else if (event.type === "broadcasted") {
                message = "Broadcasted tx with hash: " + event.txHash;
                status = 'submitted';
                callback.onTransactionUpdate?.(txId, { 
                    status, 
                    txHash: event.txHash 
                });
            } else if (event.type === "txBestBlocksState") {
                message = "Submitted tx with hash: " + event.txHash;
                status = 'submitted';
                // Essayer d'extraire le numéro de bloc depuis l'événement
                if ('blockNumber' in event && event.blockNumber && typeof event.blockNumber === 'number') {
                    blockNumber = event.blockNumber;
                }
                callback.onTransactionUpdate?.(txId, { 
                    status, 
                    txHash: event.txHash,
                    blockNumber
                });
            } else if (event.type === "finalized") {
                message = "Finalized tx with hash: " + event.txHash;
                status = 'finalized';
                
                console.log('🎉 Transaction finalized!');
                console.log('📊 Event object:', event);
                console.log('📦 Event.block exists?', !!event.block);
                console.log('📦 Event.block.events exists?', !!(event.block && 'events' in event.block && event.block.events));
                console.log('📦 Event.events exists?', !!event.events);
                
                // Essayer d'extraire le numéro de bloc depuis l'événement
                if ('blockNumber' in event && event.blockNumber && typeof event.blockNumber === 'number') {
                    blockNumber = event.blockNumber;
                } else if (event.block) {
                    // Essayer d'extraire depuis l'objet block
                    blockNumber = event.block.number;
                }
                callback.onTransactionUpdate?.(txId, { 
                    status, 
                    txHash: event.txHash,
                    blockNumber
                });

                // Capturer les événements du contrat depuis le bloc finalisé
                console.log('🔍 Checking for events...');
                
                // Essayer event.events d'abord (format polkadot-api)
                if ('events' in event && event.events && Array.isArray(event.events) && event.events.length > 0) {
                    console.log('📦 Found events in event.events:', event.events.length);
                    processBlockEvents(
                        event.events, 
                        txId, 
                        blockNumber, 
                        event.txHash,
                        (id: string, evt: Omit<GameEvent, 'id' | 'timestamp'>) => {
                            console.log('🎯 Contract event detected, calling callback');
                            callback.onBlockEvents?.(id, [evt]);
                        }
                    );
                } else if (event.block && 'events' in event.block && event.block.events && Array.isArray(event.block.events)) {
                    console.log('📦 Found events in event.block.events:', event.block.events.length);
                    processBlockEvents(
                        event.block.events, 
                        txId, 
                        blockNumber, 
                        event.txHash,
                        (id: string, evt: Omit<GameEvent, 'id' | 'timestamp'>) => {
                            console.log('🎯 Contract event detected, calling callback');
                            callback.onBlockEvents?.(id, [evt]);
                        }
                    );
                } else {
                    console.warn('⚠️ No events found in finalized transaction');
                    console.log('📊 Available properties:', Object.keys(event));
                }

                callOnSuccess();
                return;
            }
            
            const explorerUrl = getExplorerUrl(event?.txHash || '', chainId);
            const toastValue = (_: any) => (
                <span className="toast-tx-result text-right">
                    {message}<br/><a target="_blank" href={explorerUrl}>show in Polkadot.js</a>
                 </span>
            );
            toast.loading(toastValue, {id: toastId});
        },
        error: (error) => {
            console.error('Transaction error:', error);
            callback.onTransactionUpdate?.(txId, { 
                status: 'error', 
                error: error.toString() 
            });
            toast.dismiss(toastId);
            if (String(error).includes("AccountUnmapped")) {
                emitAccountUnmapped();
            } else {
                toast.error(error.toString());
            }
        },
        complete: () => {
            console.log('Transaction completed for ID:', txId);
            callOnSuccess();
        }
    };
}

// L'ancienne fonction captureContractEvents a été remplacée par le EventService
// qui s'abonne directement aux événements de la blockchain