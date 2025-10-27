import { createClient } from "polkadot-api";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import { getWsProvider } from "polkadot-api/ws-provider/node";
import { pah, contracts } from "../../.papi/descriptors/dist/index.mjs";
import { createReviveSdk } from "@polkadot-api/sdk-ink";

const RPC = "wss://testnet-passet-hub.polkadot.io";
const CONTRACT_ADDRESS = "0xe75cbD47620dBb2053CF2A98D06840f06baAf141";

async function testContractQuery() {
  console.log("🔌 Connecting to", RPC);
  const client = createClient(withPolkadotSdkCompat(getWsProvider(RPC)));
  const typedApi = client.getTypedApi(pah);
  
  console.log("📦 Creating SDK...");
  const sdk = createReviveSdk(typedApi, contracts.guess_the_number);
  
  console.log("📝 Getting contract at", CONTRACT_ADDRESS);
  const contract = sdk.getContract(CONTRACT_ADDRESS);
  
  console.log("\n🧪 Test 1: Query get_current_game (no args)");
  try {
    const result = await contract.query("get_current_game", {
      origin: CONTRACT_ADDRESS,
    });
    console.log("✅ Success!");
    console.log("Result:", result);
  } catch (e) {
    console.log("❌ Failed:", e.message);
    console.log("Stack:", e.stack);
  }
  
  console.log("\n🧪 Test 2: Query guess with data format");
  try {
    const result = await contract.query("guess", {
      origin: CONTRACT_ADDRESS,
      data: { guess: 50 },
    });
    console.log("✅ Success!");
    console.log("Result:", result);
  } catch (e) {
    console.log("❌ Failed:", e.message);
    console.log("Stack:", e.stack);
  }
  
  console.log("\n🧪 Test 3: Check contract object structure");
  console.log("contract keys:", Object.keys(contract));
  console.log("contract.query type:", typeof contract.query);
  console.log("contract.send type:", typeof contract.send);
  
  client.destroy();
  process.exit(0);
}

testContractQuery().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});

