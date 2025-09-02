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

        const senderAddress = encodeAddress(sender.publicKey)

        const {value, success} = await this.contract.query(
            "get_current_game",
            {
                origin: senderAddress,
            },
        )
        if (!success) {
            return Promise.reject("Error to query get_current_game method")
        }
        return value.response
    }


    async makeAGuess(signer: PolkadotSigner, guess: number, callback: Callback): Promise<any> {

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
            .subscribe(buildEventObserver(txToast, "Number " + guess + " submitted", callback));
    }


    async startNewGame(signer: PolkadotSigner, minNumber: number, maxNumber: number, callback: Callback): Promise<any> {

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
            .subscribe(buildEventObserver(txToast, "New game started", callback));
    }
}


type Callback = () => void;

function buildEventObserver(toastId: string,  successMessage: string, callback: Callback): Partial<Observer<TxEvent>>{
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
            const network = "pop";
            const toastValue = (_: any) => (
                <span className="toast-tx-result text-right">
                    {message}<br/><a target="_blank" href={"https://"+network+".subscan.io/extrinsic/"+event?.txHash}>show in Subscan</a>
                 </span>
            );
            toast.loading(toastValue, {id: toastId});
        },
        error: (message) => {
            console.error(message)
            toast.dismiss(toastId);
            toast.error(message);
        },
        complete: () => {
            toast.dismiss(toastId);
            toast.success(successMessage, { duration: 5000 });
            callback();
        }
    };
}