import { createClient } from "polkadot-api";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import { getWsProvider } from "@polkadot-api/ws-provider/node";
import * as descriptorsPkg from "../.papi/descriptors/dist/index.mjs";
const { contracts, pah } = descriptorsPkg;
import { createReviveSdk } from "@polkadot-api/sdk-ink";
import { decodeAddress } from "@polkadot/util-crypto";

const RPC = process.env.RPC || "wss://testnet-passet-hub.polkadot.io";
const CONTRACT = process.env.CONTRACT || "0x22851ec2D16c25e83bFdf8d538bcD24e09b34b0e";
const ORIGIN_SS58 = process.env.ORIGIN_SS58; // optional: pass a valid ss58 address

function getOrigin() {
  if (ORIGIN_SS58) {
    return decodeAddress(ORIGIN_SS58);
  }
  return new Uint8Array(32); // zero account id for read-only dry-run
}

async function main() {
  console.log("RPC:", RPC);
  console.log("CONTRACT:", CONTRACT);

  const client = createClient(withPolkadotSdkCompat(getWsProvider(RPC)));
  const typedApi = client.getTypedApi(pah);

  console.log("Connected. Skipping chain props check.");

  const sdk = createReviveSdk(typedApi, contracts.guess_the_number);
  const contract = sdk.getContract(CONTRACT);

  const origin = getOrigin();
  console.log("Origin bytes len:", origin.length);

  try {
    const { value, success } = await contract.query("get_current_game", { origin });
    console.log("Query success:", success);
    console.dir(value, { depth: 6 });
  } catch (e) {
    console.error("Query error:", e);
  } finally {
    client.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


