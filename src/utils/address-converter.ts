import { u8aToHex } from "@polkadot/util";
import { decodeAddress, addressToEvm } from "@polkadot/util-crypto";
import { encodeAddress } from "@polkadot/keyring";
import type { PolkadotSigner } from "polkadot-api/signer";
import { keccak256 } from "@ethersproject/keccak256";

/**
 * EIP-55 checksum for EVM addresses - required by polkadot-api substrate-bindings ethAccount codec.
 * @param addr - 0x-prefixed hex address (lowercase ok)
 */
export function toChecksumAddress(addr: string): string {
  if (!addr || !addr.startsWith("0x") || addr.length !== 42) return addr;
  const hex = addr.slice(2).toLowerCase();
  const hashHex = keccak256(new TextEncoder().encode(hex)).slice(2);
  let result = "0x";
  for (let i = 0; i < 40; i++) {
    const h = parseInt(hashHex[i], 16);
    const c = hex[i];
    result += h >= 8 ? c.toUpperCase() : c;
  }
  return result;
}

/**
 * Convertit une adresse SS58 en adresse EVM (H160)
 * @param ss58Address - Adresse SS58 (ex: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY")
 * @returns Adresse EVM au format hex (ex: "0x1234...abcd")
 */
export function ss58ToEvm(ss58Address: string): string {
    try {
        const decoded = decodeAddress(ss58Address);
        const evmBytes = addressToEvm(decoded);
        return u8aToHex(evmBytes);
    } catch (error) {
        console.error('Error converting SS58 to EVM:', error);
        throw new Error(`Failed to convert SS58 address ${ss58Address} to EVM format: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Convertit une clé publique (PolkadotSigner) en adresse EVM (H160)
 * @param signer - Objet PolkadotSigner avec publicKey
 * @returns Adresse EVM au format hex (ex: "0x1234...abcd")
 */
export function signerToEvm(signer: PolkadotSigner): string {
    try {
        // Méthode optimisée : décoder directement depuis la clé publique
        // encodeAddress retourne l'adresse SS58, mais on peut aussi utiliser directement
        // la clé publique si elle est au bon format (32 bytes)
        const ss58 = encodeAddress(signer.publicKey);
        return ss58ToEvm(ss58);
    } catch (error) {
        console.error('Error converting signer to EVM:', error);
        throw new Error(`Failed to convert signer to EVM format: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Convertit une adresse SS58 vers une adresse Revive (EVM)
 * Le format Revive utilise Keccak-256 de la clé publique, puis prend les 20 derniers octets
 * @param ss58Address - Adresse SS58 (ex: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY")
 * @returns Adresse EVM au format hex (ex: "0x1234...abcd"), EIP-55 checksummed
 */
export function ss58ToRevive(ss58Address: string): string {
    try {
        const publicKey = decodeAddress(ss58Address);
        const hash = keccak256(publicKey);
        const evmAddress = "0x" + hash.slice(-40).toLowerCase();
        return toChecksumAddress(evmAddress);
    } catch (error) {
        console.error("Error converting SS58 to Revive format:", error);
        throw new Error(`Failed to convert SS58 address ${ss58Address} to Revive format: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Convertit une clé publique (PolkadotSigner) en adresse au format Revive (EVM)
 * Le format Revive utilise Keccak-256 de la clé publique, puis prend les 20 derniers octets
 * @param signer - Objet PolkadotSigner avec publicKey
 * @returns Adresse EVM au format hex (ex: "0x1234...abcd"), EIP-55 checksummed
 */
export function signerToRevive(signer: PolkadotSigner): string {
    try {
        const publicKey = signer.publicKey;
        const hash = keccak256(publicKey);
        const evmAddress = "0x" + hash.slice(-40).toLowerCase();
        return toChecksumAddress(evmAddress);
    } catch (error) {
        console.error("Error converting signer to Revive format:", error);
        throw new Error(`Failed to convert signer to Revive format: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Convertit une adresse EVM (H160) en adresse SS58
 * Note: Cette conversion n'est pas toujours possible car plusieurs SS58 peuvent mapper vers le même EVM
 * @param evmAddress - Adresse EVM au format hex (ex: "0x1234...abcd")
 * @param ss58Format - Format SS58 (par défaut: 42 pour Polkadot)
 * @returns Adresse SS58 correspondante (si possible)
 */
export function evmToSs58(evmAddress: string, ss58Format: number = 42): string | null {
    // Note: Cette conversion n'est pas triviale car plusieurs SS58 peuvent mapper vers le même EVM
    // Cette fonction nécessiterait une table de correspondance ou une logique spécifique
    // Pour l'instant, on retourne null car la conversion inverse n'est pas toujours possible
    console.warn('evmToSs58: Reverse conversion from EVM to SS58 is not always possible');
    return null;
}
