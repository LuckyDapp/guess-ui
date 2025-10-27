import { createClient } from "polkadot-api";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import { getWsProvider } from "polkadot-api/ws-provider/node";
import { pah } from "../../.papi/descriptors/dist/index.mjs";

const RPC = "wss://testnet-passet-hub.polkadot.io";
const CONTRACT_ADDRESS = "0xe75cbd47620dbb2053cf2a98d06840f06baaf141";

async function testBlockEvents() {
  console.log("🔌 Connecting to", RPC);
  const client = createClient(withPolkadotSdkCompat(getWsProvider(RPC)));
  const typedApi = client.getTypedApi(pah);

  console.log("\n📡 Subscribing to finalized blocks (will test first block)...");
  
  let tested = false;
  const subscription = client.finalizedBlock$.subscribe(async (finalizedBlock) => {
    if (tested) return; // Only test once
    tested = true;

    console.log("\n✅ Found target block:", finalizedBlock.number, finalizedBlock.hash);
    console.log("📋 finalizedBlock keys:", Object.keys(finalizedBlock));
    console.log("📋 finalizedBlock:", JSON.stringify(finalizedBlock, null, 2));

    // Test 1: Check if events are in finalizedBlock
    if (finalizedBlock.events) {
      console.log("\n✅ Test 1: finalizedBlock.events exists");
      console.log("Events count:", finalizedBlock.events.length);
    } else {
      console.log("\n❌ Test 1: finalizedBlock.events does NOT exist");
    }

    // Test 2: Try getValue without options
    try {
      console.log("\n🧪 Test 2: typedApi.query.System.Events.getValue()");
      const events2 = await typedApi.query.System.Events.getValue();
      console.log("✅ Success! Events count:", events2?.length);
      if (Array.isArray(events2)) {
        const types = events2.map(e => e?.type).filter(Boolean);
        console.log("Event types:", [...new Set(types)]);
      }
    } catch (e) {
      console.log("❌ Failed:", e.message);
    }

    // Test 3: Try getValue with { at: hash }
    try {
      console.log("\n🧪 Test 3: typedApi.query.System.Events.getValue({ at: hash })");
      const events3 = await typedApi.query.System.Events.getValue({
        at: finalizedBlock.hash
      });
      console.log("✅ Success! Events count:", events3?.length);
      if (Array.isArray(events3) && events3.length > 0) {
        console.log("\n📋 First event structure:");
        console.log("Keys:", Object.keys(events3[0]));
        console.log("Full event:", JSON.stringify(events3[0], null, 2));
        
        const types = events3.map(e => e?.type).filter(Boolean);
        console.log("\nEvent types (via .type):", [...new Set(types)]);
        
        // Try different property names
        const eventNames = events3.map(e => e?.event?.section || e?.section || e?.pallet).filter(Boolean);
        console.log("Event names (via .event.section/.section/.pallet):", [...new Set(eventNames)]);
      }
    } catch (e) {
      console.log("❌ Failed:", e.message);
    }

    // Test 4: Try getEntries
    try {
      console.log("\n🧪 Test 4: typedApi.query.System.Events.getEntries()");
      const events4 = await typedApi.query.System.Events.getEntries();
      console.log("✅ Success! Events count:", events4?.length);
    } catch (e) {
      console.log("❌ Failed:", e.message);
    }

    // Test 5: Check typedApi.event
    try {
      console.log("\n🧪 Test 5: typedApi.event structure");
      console.log("typedApi.event exists?", !!typedApi.event);
      if (typedApi.event) {
        console.log("typedApi.event keys:", Object.keys(typedApi.event));
        if (typedApi.event.Revive) {
          console.log("typedApi.event.Revive keys:", Object.keys(typedApi.event.Revive));
          if (typedApi.event.Revive.ContractEmitted) {
            console.log("typedApi.event.Revive.ContractEmitted exists!");
            console.log("Has watch method?", typeof typedApi.event.Revive.ContractEmitted.watch);
          }
        }
      }
    } catch (e) {
      console.log("❌ Failed:", e.message);
    }

    console.log("\n✅ All tests completed, disconnecting...");
    subscription.unsubscribe();
    client.destroy();
    process.exit(0);
  });

  // Timeout after 30 seconds
  setTimeout(() => {
    console.log("\n⏱️ Timeout - block not found");
    subscription.unsubscribe();
    client.destroy();
    process.exit(1);
  }, 30000);
}

testBlockEvents().catch(console.error);

