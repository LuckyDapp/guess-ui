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
import type { TransactionHistory } from "./types";

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

    constructor(
        rpc: string,
        address: string,
    ) {

        const client = createClient(withPolkadotSdkCompat(getWsProvider(rpc)))
        const typedApi = client.getTypedApi(pah)
        const sdk = createReviveSdk(typedApi, contracts.guess_the_number)
        this.contract = sdk.getContract(address)

    }

    async getCurrentGame(sender: PolkadotSigner): Promise<any> {
        try {
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
            
            // Vérifier que la réponse existe et a la structure attendue
            if (!value || !value.response) {
                console.warn("No game data found");
                return null;
            }
            
            return value.response;
        } catch (error) {
            console.error("Error in getCurrentGame:", error);
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
            const {value, success} = await this.contract.query("guess", tx);
            if (!success) {
                console.error("Error when dry run tx ... ")
                console.error(value)
                toast.error("Error: " +  value?.value?.value?.type);
                return;
            }

            console.log("Submitting tx ... ")
            const txToast = toast.loading("Submitting Transaction");
            this.contract
                .send("guess", tx)
                .signSubmitAndWatch(signer)
                .subscribe(buildEventObserver(txToast, "Number " + guess + " submitted", callback, chainId));
        } catch (error) {
            console.error("Error in makeAGuess:", error);
            toast.error("Error submitting guess: " + error.message);
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
            const {value, success} = await this.contract.query("start_new_game", tx,)
            if (!success) {
                console.error("Error when dry run tx ... ")
                console.error(value)
                toast.error("Error: " +  value?.value?.value?.type);
                return;
            }

            console.log("Submitting tx ... ")
            const txToast = toast.loading("Submitting Transaction");
            this.contract
                .send("start_new_game", tx)
                .signSubmitAndWatch(signer)
                .subscribe(buildEventObserver(txToast, "New game started", callback, chainId));
        } catch (error) {
            console.error("Error in startNewGame:", error);
            toast.error("Error starting new game: " + error.message);
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
            const {value, success} = await this.contract.query("guess", tx);
            if (!success) {
                console.error("Error when dry run tx ... ")
                console.error(value)
                toast.error("Error: " +  value?.value?.value?.type);
                return null;
            }

            // Utiliser l'ID fourni ou en créer un nouveau
            const finalTxId = txId || callback.onTransactionCreated?.(`tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`) || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            console.log("Submitting tx with ID:", finalTxId)
            const txToast = toast.loading("Submitting Transaction");
            this.contract
                .send("guess", tx)
                .signSubmitAndWatch(signer)
                .subscribe(buildEventObserverWithHistory(txToast, "Number " + guess + " submitted", callback, finalTxId, chainId));
            
            return finalTxId;
        } catch (error) {
            console.error("Error in makeAGuessWithHistory:", error);
            toast.error("Error submitting guess: " + error.message);
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
            const {value, success} = await this.contract.query("start_new_game", tx,)
            if (!success) {
                console.error("Error when dry run tx ... ")
                console.error(value)
                toast.error("Error: " +  value?.value?.value?.type);
                return null;
            }

            // Utiliser l'ID fourni ou en créer un nouveau
            const finalTxId = txId || callback.onTransactionCreated?.(`tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`) || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            console.log("Submitting tx with ID:", finalTxId)
            const txToast = toast.loading("Submitting Transaction");
            this.contract
                .send("start_new_game", tx)
                .signSubmitAndWatch(signer)
                .subscribe(buildEventObserverWithHistory(txToast, "New game started", callback, finalTxId, chainId));
            
            return finalTxId;
        } catch (error) {
            console.error("Error in startNewGameWithHistory:", error);
            toast.error("Error starting new game: " + error.message);
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
            toast.loading(toastValue, {id: txToast});
        },
        error: (message) => {
            console.error(message)
            toast.dismiss(txToast);
            toast.error(message);
        },
        complete: () => {
            toast.dismiss(txToast);
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
                if (event.blockNumber) {
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
                // Essayer d'extraire le numéro de bloc depuis l'événement
                if (event.blockNumber) {
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
            toast.error(error.toString());
        },
        complete: () => {
            console.log('Transaction completed for ID:', txId);
            toast.dismiss(toastId);
            toast.success(successMessage, { duration: 5000 });
            callback.onSuccess();
        }
    };
}