import { contracts, pah } from "@polkadot-api/descriptors";
import { createClient, FixedSizeBinary, type TxEvent } from "polkadot-api";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import { getWsProvider } from "polkadot-api/ws-provider/web";
import { createReviveSdk } from "@polkadot-api/sdk-ink";
import { encodeAddress } from "@polkadot/keyring";
import { getRpc, getNftContractAddress } from "./config";
import { toChecksumAddress } from "./utils/address-converter";
import { toast } from "react-hot-toast";
import type { PolkadotSigner } from "polkadot-api/signer";

/** Convert hex address to FixedSizeBinary(20) for ink H160 encoding */
function addrToH160(addr: string): InstanceType<typeof FixedSizeBinary> {
  const hex = addr.startsWith("0x") ? addr : "0x" + addr;
  if (hex.length !== 42) throw new Error(`Invalid address length: ${addr}`);
  return FixedSizeBinary.fromHex(hex);
}

/** Fallback SS58 for view-only queries when no signer (dry run caller) */
const FALLBACK_ORIGIN_SS58 = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"; // Alice

const LOG = "[NFT]";

/** Extract H160 hex string from Option<H160> or Result<Option<H160>> (various decoded shapes) */
function extractOptionH160(node: unknown): string | null {
  const toHex = (val: unknown): string | null => {
    if (val == null) return null;
    if (typeof val === "string") {
      const s = val.trim();
      return s.length >= 40 ? s : null;
    }
    if (typeof val === "object" && val !== null) {
      const v = val as Record<string, unknown>;
      if (typeof v.toHex === "function") return String(v.toHex());
      if (typeof v.hex === "string") return v.hex;
      if (Array.isArray(v) && v.length >= 20) {
        return "0x" + Array.from(v).map((b) => ((b as number) & 0xff).toString(16).padStart(2, "0")).join("");
      }
      const bytes = (v as { asBytes?: () => Uint8Array }).asBytes?.();
      if (bytes && bytes.length >= 20) {
        return "0x" + Array.from(bytes).map((b) => (b & 0xff).toString(16).padStart(2, "0")).join("");
      }
    }
    return null;
  };
  if (node == null || typeof node !== "object") return null;
  const o = node as Record<string | number, unknown>;
  const opt = o.Ok ?? o.ok ?? o;
  if (opt == null) return null;
  const optObj = typeof opt === "object" ? (opt as Record<string | number, unknown>) : null;
  const val = optObj?.["Some"] ?? optObj?.["some"] ?? optObj?.[1] ?? optObj?.["1"] ?? optObj?.["0"] ?? optObj?.[0];
  return toHex(val ?? opt);
}

const nftContracts = new Map<string, NftContract>();

export function getOrCreateNftContract(chainId: string): NftContract {
  const address = toChecksumAddress(getNftContractAddress(chainId));
  if (!nftContracts.has(address)) {
    const rpc = getRpc(chainId);
    nftContracts.set(address, new NftContract(rpc, address));
  }
  return nftContracts.get(address)!;
}

export class NftContract {
  contract: any;
  private contractAddress: string;

  constructor(rpc: string, address: string) {
    this.contractAddress = address;
    console.log(LOG, "NftContract init", { rpc, address });
    const client = createClient(withPolkadotSdkCompat(getWsProvider(rpc)));
    const typedApi = client.getTypedApi(pah);
    const sdk = createReviveSdk(typedApi as any, contracts.erc721);
    this.contract = sdk.getContract(address);
    console.log(LOG, "NftContract ready", { contractAddress: address });
  }

  /** ownerH160: hex string 0x + 40 hex chars. originSs58: SS58 for dry run (required by SDK) */
  async balanceOf(ownerH160: string, originSs58?: string): Promise<number> {
    const hex = (ownerH160.startsWith("0x") ? ownerH160 : "0x" + ownerH160).toLowerCase();
    if (hex.length !== 42) return 0;
    const owner = addrToH160(hex);
    const origin = originSs58 ?? FALLBACK_ORIGIN_SS58;
    const args = { origin, data: { owner } };
    console.log(LOG, "balanceOf REQUEST", { contractAddress: this.contractAddress, args });
    try {
      const raw = await this.contract.query("balance_of", args);
      console.log(LOG, "balanceOf RAW full", raw);
      console.log(LOG, "balanceOf RAW keys", {
        topLevel: raw ? Object.keys(raw) : [],
        valueKeys: raw?.value ? Object.keys(raw.value) : [],
        response: raw?.value?.response,
        responseJSON: JSON.stringify(raw?.value?.response, null, 2),
      });
      const { value, success } = raw;
      const responseData = value?.response ?? value;
      if (!success || responseData == null) {
        console.log(LOG, "balanceOf RESULT", { success, hasResponse: !!responseData, result: 0 });
        return 0;
      }
      const r = responseData;
      const result = Number(r.Ok ?? r.ok ?? r ?? 0);
      console.log(LOG, "balanceOf RESULT", { parsed: result, rawResponse: r });
      return result;
    } catch (e) {
      console.error(LOG, "balanceOf ERROR", { args, error: e, stack: (e as Error)?.stack });
      return 0;
    }
  }

  async ownerOf(tokenId: number, originSs58?: string): Promise<string | null> {
    const origin = originSs58 ?? FALLBACK_ORIGIN_SS58;
    const args = { origin, data: { id: tokenId } };
    console.log(LOG, "ownerOf REQUEST", { contractAddress: this.contractAddress, args });
    try {
      const raw = await this.contract.query("owner_of", args);
      console.log(LOG, "ownerOf RAW full", raw);
      const safeJson = (x: unknown) => {
        try {
          return JSON.stringify(x, (_, v) => (typeof v === "object" && v !== null && typeof (v as { toHex?: unknown }).toHex === "function" ? `[FixedSizeBinary:${(v as { toHex: () => string }).toHex()}]` : v), 2);
        } catch {
          return String(x);
        }
      };
      console.log(LOG, "ownerOf RAW keys", {
        topLevel: raw ? Object.keys(raw) : [],
        valueKeys: raw?.value ? Object.keys(raw.value) : [],
        response: raw?.value?.response,
        responseJSON: safeJson(raw?.value?.response),
      });
      const { value, success } = raw;
      const responseData = value?.response ?? value;
      if (!success || responseData == null) {
        console.log(LOG, "ownerOf RESULT", { success, hasResponse: !!responseData, result: null });
        return null;
      }
      const r = responseData;
      const opt = r.Ok ?? r.ok ?? r;
      console.log(LOG, "ownerOf parsed", { raw: r, opt, optKeys: opt ? Object.keys(opt) : [] });
      const rawAddr = extractOptionH160(opt);
      if (rawAddr) {
        const result = toChecksumAddress(rawAddr.startsWith("0x") ? rawAddr : "0x" + rawAddr);
        console.log(LOG, "ownerOf RESULT", { result, rawAddr });
        return result;
      }
      console.log(LOG, "ownerOf RESULT", { result: null, reason: "no Some", opt });
      return null;
    } catch (e) {
      console.error(LOG, "ownerOf ERROR", { args, error: e, stack: (e as Error)?.stack });
      return null;
    }
  }

  async getMaxAttempts(tokenId: number, originSs58?: string): Promise<number | null> {
    const origin = originSs58 ?? FALLBACK_ORIGIN_SS58;
    const args = { origin, data: { id: tokenId } };
    console.log(LOG, "getMaxAttempts REQUEST", { contractAddress: this.contractAddress, args });
    try {
      const raw = await this.contract.query("get_max_attempts", args);
      console.log(LOG, "getMaxAttempts RAW full", raw);
      const { value, success } = raw;
      const responseData = value?.response ?? value;
      if (!success || responseData == null) return null;
      const r = responseData;
      const v = r.Ok ?? r.ok ?? r;
      if (v?.Some != null || v?.some != null) {
        const result = Number(v.Some ?? v.some ?? 0);
        console.log(LOG, "getMaxAttempts RESULT", { result });
        return result;
      }
      return null;
    } catch (e) {
      console.error(LOG, "getMaxAttempts ERROR", { args, error: e, stack: (e as Error)?.stack });
      return null;
    }
  }

  /** Mint NFT - uses send().signSubmitAndWatch like game contract */
  mint(
    signer: PolkadotSigner,
    id: number,
    maxAttempts: number,
    callbacks?: { onSuccess?: () => void; onError?: () => void },
    chainId = "pah"
  ): void {
    const origin = encodeAddress(signer.publicKey);
    const tx = { origin, data: { id, max_attempts: maxAttempts } };
    console.log(LOG, "mint SEND", { contractAddress: this.contractAddress, tx });
    const txToast = toast.loading("Submitting mint...");
    this.contract
      .send("mint", tx)
      .signSubmitAndWatch(signer)
      .subscribe(this.buildNftTxObserver(txToast, "Mint successful", callbacks));
  }

  /** Transfer NFT - destination must be H160 hex string */
  transfer(
    signer: PolkadotSigner,
    tokenId: number,
    destinationH160: string,
    callbacks?: { onSuccess?: () => void; onError?: () => void },
    chainId = "pah"
  ): void {
    const dest = addrToH160(destinationH160.startsWith("0x") ? destinationH160 : "0x" + destinationH160);
    const origin = encodeAddress(signer.publicKey);
    const tx = { origin, data: { destination: dest, id: tokenId } };
    console.log(LOG, "transfer SEND", { contractAddress: this.contractAddress, tx });
    const txToast = toast.loading("Submitting transfer...");
    this.contract
      .send("transfer", tx)
      .signSubmitAndWatch(signer)
      .subscribe(this.buildNftTxObserver(txToast, "Transfer successful", callbacks));
  }

  /** Burn NFT */
  burn(
    signer: PolkadotSigner,
    tokenId: number,
    callbacks?: { onSuccess?: () => void; onError?: () => void },
    chainId = "pah"
  ): void {
    const origin = encodeAddress(signer.publicKey);
    const tx = { origin, data: { id: tokenId } };
    console.log(LOG, "burn SEND", { contractAddress: this.contractAddress, tx });
    const txToast = toast.loading("Submitting burn...");
    this.contract
      .send("burn", tx)
      .signSubmitAndWatch(signer)
      .subscribe(this.buildNftTxObserver(txToast, "Burn successful", callbacks));
  }

  private buildNftTxObserver(
    toastId: string,
    successMessage: string,
    callbacks?: { onSuccess?: () => void; onError?: () => void }
  ) {
    return {
      next: (event: TxEvent) => {
        if (event.type === "finalized") {
          toast.dismiss(toastId);
          toast.success(successMessage, { duration: 4000 });
          callbacks?.onSuccess?.();
        } else if (event.type === "signed" || event.type === "broadcasted" || event.type === "txBestBlocksState") {
          const hash = event.txHash ?? "";
          toast.loading(`Submitted: ${hash.slice(0, 10)}...`, { id: toastId });
        }
      },
      error: (err: unknown) => {
        toast.dismiss(toastId);
        console.error(LOG, "tx error", err);
        toast.error(String(err));
        callbacks?.onError?.();
      },
    };
  }
}
