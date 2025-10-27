import { createClient } from "polkadot-api";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import { getWsProvider } from "polkadot-api/ws-provider/web";
import { pah } from "@polkadot-api/descriptors";
import { decodeContractEvent } from "./event-decoder";
import type { GameEvent } from "./types";
import { getContractAddress, getRpc } from "./config";

type Unsubscribe = () => void;

export function setupGlobalEventSubscription(
  chainId: string,
): Unsubscribe | null {
  try {
    const rpc = getRpc(chainId);
    const contractAddress = getContractAddress(chainId);
    if (!rpc || !contractAddress) {
      console.warn("GlobalEventSub: missing rpc or contract address", { rpc, contractAddress });
      return null;
    }

    console.log("🔗 GlobalEventSub: connecting", { rpc, contractAddress });
    const client = createClient(withPolkadotSdkCompat(getWsProvider(rpc)));
    const typedApi: any = client.getTypedApi(pah);

    // Subscribe to System.Events using typed API (capitalized pallet names)
    const storage = (typedApi as any)?.query?.System?.Events;
    if (!storage) {
      console.warn("GlobalEventSub: typedApi.query.System.Events not available");
      client.destroy();
      return null;
    }

    // Prefer observable if exposed, else try callback subscription
    let unsub: Unsubscribe | null = null;

    const handleEvents = (events: any[]) => {
      try {
        const records: any[] = Array.isArray(events)
          ? events
          : (Array.isArray((events as any)?.value) ? (events as any).value : []);
        if (!Array.isArray(records) || records.length === 0) return;
        console.log("GlobalEventSub: received", records.length, "events");
        // events are in modern format: { type: "Pallet", value: {...}, topics: [] }
        records.forEach((record: any) => {
          const palletName = record?.type;
          const eventValue = record?.value;
          if (palletName !== "Revive") return;
          if (eventValue?.type !== "ContractEmitted") return;

          const contractData = eventValue.value;
          const addrHex = contractData?.contract?.asHex?.();
          if (!addrHex) return;

          if (addrHex.toLowerCase() !== contractAddress.toLowerCase()) return;

          const dataBytes: Uint8Array | undefined = contractData?.data?.asBytes?.();
          const topicsBytes: Uint8Array[] | undefined = contractData?.topics?.map((t: any) => t?.asBytes?.());

          if (!dataBytes || !topicsBytes) return;

          const decoded = decodeContractEvent(dataBytes, topicsBytes);
          if (decoded) {
            console.log("🧩 GlobalEventSub decoded:", decoded);
          }
        });
      } catch (e) {
        console.warn("GlobalEventSub: error while handling events", e);
      }
    };

    if (typeof storage?.subscribe === "function") {
      console.log("GlobalEventSub: subscribing via storage.subscribe");
      unsub = storage.subscribe(handleEvents) as Unsubscribe;
    } else if (storage?.value$?.subscribe) {
      console.log("GlobalEventSub: subscribing via storage.value$.subscribe");
      const sub = storage.value$.subscribe({ next: handleEvents });
      unsub = () => sub.unsubscribe();
    } else {
      console.warn("GlobalEventSub: no known subscribe interface for system.events");
      client.destroy();
      return null;
    }

    return () => {
      try { unsub && unsub(); } catch {}
      try { client.destroy(); } catch {}
    };
  } catch (e) {
    console.warn("GlobalEventSub: setup failed", e);
    return null;
  }
}

export function setupFinalizedBlocksWatcher(
  chainId: string,
  onDecoded?: (evt: Omit<GameEvent, 'id' | 'timestamp'>) => void,
): Unsubscribe | null {
  try {
    const rpc = getRpc(chainId);
    const contractAddress = getContractAddress(chainId);
    if (!rpc || !contractAddress) {
      console.warn("BlockWatcher: missing rpc or contract address", { rpc, contractAddress });
      return null;
    }

    console.log("🔭 BlockWatcher: connecting", { rpc, contractAddress });
    const client = createClient(withPolkadotSdkCompat(getWsProvider(rpc)));
    const typedApi: any = client.getTypedApi(pah);

    // S'abonner aux blocs finalisés et récupérer les événements de chaque bloc
    console.log("🔭 BlockWatcher: setting up finalized blocks subscription");
    
    const subscription = client.finalizedBlock$.subscribe(async (finalizedBlock) => {
      try {
        console.log('🔭 BlockWatcher: new finalized block', finalizedBlock.number, finalizedBlock.hash);
        console.log('🔍 BlockWatcher: finalizedBlock keys:', Object.keys(finalizedBlock));

        // Essayer d'abord de récupérer les événements depuis le bloc lui-même
        let events: any[] | null = null;
        
        // Vérifier si les événements sont déjà dans finalizedBlock
        if ((finalizedBlock as any).events) {
          console.log('✅ BlockWatcher: Using events from finalizedBlock object');
          events = (finalizedBlock as any).events;
        } else {
          console.log('🔍 BlockWatcher: Fetching events via query API');
          // Récupérer les événements du bloc spécifique avec { at: blockHash }
          events = await typedApi.query.System.Events.getValue({
            at: finalizedBlock.hash
          });
        }
        
        if (!Array.isArray(events)) {
          console.warn('⚠️ BlockWatcher: events is not an array, type:', typeof events);
          return;
        }

        console.log(`📦 BlockWatcher: processing ${events.length} events from block ${finalizedBlock.number}`);
        
        // Afficher tous les types d'événements pour debug
        const eventTypes = events.map((r: any) => r?.event?.type || r?.type).filter(Boolean);
        const uniqueTypes = [...new Set(eventTypes)];
        if (uniqueTypes.length > 0) {
          console.log(`📋 BlockWatcher: event types in block ${finalizedBlock.number}:`, uniqueTypes.join(', '));
        }
        
        // Filtrer et décoder les événements du contrat
        let contractEventCount = 0;
        events.forEach((record: any) => {
          // Structure: { phase, event, topics }
          const event = record?.event;
          if (!event) return;
          
          const palletName = event?.type;
          const eventValue = event?.value;
          
          if (palletName !== 'Revive') return;
          
          console.log(`🔍 BlockWatcher: Found Revive event! Type:`, eventValue?.type);
          
          if (eventValue?.type !== 'ContractEmitted') return;

          const contractData = eventValue.value;
          const addrHex = contractData?.contract?.asHex?.();
          
          if (!addrHex || addrHex.toLowerCase() !== contractAddress.toLowerCase()) {
            return;
          }

          contractEventCount++;
          console.log(`🎯 BlockWatcher: ContractEmitted #${contractEventCount} from our contract in block ${finalizedBlock.number}`);

          const dataBytes: Uint8Array | undefined = contractData?.data?.asBytes?.();
          const topicsBytes: Uint8Array[] | undefined = contractData?.topics?.map((t: any) => t?.asBytes?.());
          
          if (!dataBytes || !topicsBytes) {
            console.warn('⚠️ BlockWatcher: Missing dataBytes or topicsBytes');
            return;
          }

          const decoded = decodeContractEvent(dataBytes, topicsBytes);
          if (decoded) {
            // Ajouter le blockNumber au decoded event
            const eventWithBlock = {
              ...decoded,
              blockNumber: finalizedBlock.number
            };
            console.log('🧩 BlockWatcher decoded event:', eventWithBlock);
            try { 
              onDecoded && onDecoded(eventWithBlock); 
            } catch (e) {
              console.warn('⚠️ BlockWatcher: Error calling onDecoded callback:', e);
            }
          } else {
            console.warn('⚠️ BlockWatcher: Failed to decode event');
          }
        });

        if (contractEventCount > 0) {
          console.log(`✅ BlockWatcher: Found ${contractEventCount} contract events in block ${finalizedBlock.number}`);
        }
      } catch (e) {
        console.warn('BlockWatcher: error processing block', e);
      }
    });

    console.log('✅ BlockWatcher: Watcher active');

    return () => {
      try { subscription.unsubscribe(); } catch {}
      try { client.destroy(); } catch {}
    };
  } catch (e) {
    console.warn('BlockWatcher: setup failed', e);
    return null;
  }
}


