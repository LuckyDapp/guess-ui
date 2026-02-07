import { getRpc } from "../config";
import { NETWORK_CONFIG } from "../config";
import { getOrCreateContract } from "../contract";
import { encodeAddress } from "@polkadot/keyring";

const PREFLIGHT_FAUCET_REQUEST = "preflight-faucet-request";
const PREFLIGHT_FAUCET_DONE = "preflight-faucet-done";

/** À appeler avant une tx : sur nœud dev, si solde 0 ouvre la modale faucet et attend que l'utilisateur transfère ou passe. Sinon résout tout de suite. */
export function runPreFlightFaucetIfNeeded(
  chainId: string,
  signer: { publicKey: Uint8Array }
): Promise<void> {
  const rpc = getRpc(chainId);
  if (rpc !== NETWORK_CONFIG.RPC_URL || !NETWORK_CONFIG.FAUCET_AVAILABLE) {
    return Promise.resolve();
  }
  const contract = getOrCreateContract(chainId);
  const accountAddress = encodeAddress(signer.publicKey);
  return contract.getAccountBalance(accountAddress).then((balance) => {
    if (balance > 0n) return;
    return new Promise<void>((resolve) => {
      const done = () => {
        window.removeEventListener(PREFLIGHT_FAUCET_DONE, done);
        resolve();
      };
      window.addEventListener(PREFLIGHT_FAUCET_DONE, done);
      window.dispatchEvent(new CustomEvent(PREFLIGHT_FAUCET_REQUEST));
    });
  });
}

export { PREFLIGHT_FAUCET_REQUEST, PREFLIGHT_FAUCET_DONE };
