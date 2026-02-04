import { createClient } from "polkadot-api";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import { getWsProvider } from "polkadot-api/ws-provider/web";
import { pah } from "@polkadot-api/descriptors";
import { decodeContractEvent } from "./event-decoder";
import type { GameEvent } from "./types";
import { getContractAddress, getRpc } from "./config";

// Système de log conditionnel (seulement en développement)
const isDev = process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && window.location.hostname === 'localhost');
const debugLog = (...args: any[]) => {
    if (isDev) console.log(...args);
};
const debugWarn = (...args: any[]) => {
    if (isDev) console.warn(...args);
};

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

    debugLog("🔗 GlobalEventSub: connecting", { rpc, contractAddress });
    const client = createClient(withPolkadotSdkCompat(getWsProvider(rpc)));
    const typedApi: any = client.getTypedApi(pah);

    // Subscribe to System.Events using typed API (capitalized pallet names)
    const storage = (typedApi as any)?.query?.System?.Events;
    if (!storage) {
      debugWarn("GlobalEventSub: typedApi.query.System.Events not available");
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
        
        // Filtrer d'abord les événements Revive avant de les traiter
        const reviveEvents = records.filter((record: any) => {
          const palletName = record?.type;
          const eventValue = record?.value;
          return palletName === "Revive" && eventValue?.type === "ContractEmitted";
        });
        
        if (reviveEvents.length === 0) return;
        
        debugLog("GlobalEventSub: received", reviveEvents.length, "Revive events");
        
        // Traiter uniquement les événements Revive filtrés
        reviveEvents.forEach((record: any) => {
          const eventValue = record?.value;
          const contractData = eventValue.value;
          const addrHex = contractData?.contract?.asHex?.();
          if (!addrHex) return;

          if (addrHex.toLowerCase() !== contractAddress.toLowerCase()) return;

          const dataBytes: Uint8Array | undefined = contractData?.data?.asBytes?.();
          const topicsBytes: Uint8Array[] | undefined = contractData?.topics?.map((t: any) => t?.asBytes?.());

          if (!dataBytes || !topicsBytes) return;

          const decoded = decodeContractEvent(dataBytes, topicsBytes);
          if (decoded) {
            debugLog("🧩 GlobalEventSub decoded:", decoded);
          }
        });
      } catch (e) {
        debugWarn("GlobalEventSub: error while handling events", e);
      }
    };

    if (typeof storage?.subscribe === "function") {
      debugLog("GlobalEventSub: subscribing via storage.subscribe");
      unsub = storage.subscribe(handleEvents) as Unsubscribe;
    } else if (storage?.value$?.subscribe) {
      debugLog("GlobalEventSub: subscribing via storage.value$.subscribe");
      const sub = storage.value$.subscribe({ next: handleEvents });
      unsub = () => sub.unsubscribe();
    } else {
      debugWarn("GlobalEventSub: no known subscribe interface for system.events");
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

    debugLog("🔭 BlockWatcher: connecting", { rpc, contractAddress });
    const client = createClient(withPolkadotSdkCompat(getWsProvider(rpc)));
    const typedApi: any = client.getTypedApi(pah);

    // S'abonner aux blocs finalisés et récupérer les événements de chaque bloc
    debugLog("🔭 BlockWatcher: setting up finalized blocks subscription");
    
    const subscription = client.finalizedBlock$.subscribe(async (finalizedBlock) => {
      try {
        debugLog('🔭 BlockWatcher: new finalized block', finalizedBlock.number);

        // Essayer d'abord de récupérer les événements depuis le bloc lui-même
        let events: any[] | null = null;
        
        // Vérifier si les événements sont déjà dans finalizedBlock
        if ((finalizedBlock as any).events) {
          events = (finalizedBlock as any).events;
        } else {
          // Récupérer les événements du bloc spécifique avec { at: blockHash }
          events = await typedApi.query.System.Events.getValue({
            at: finalizedBlock.hash
          });
        }
        
        if (!Array.isArray(events)) {
          debugWarn('⚠️ BlockWatcher: events is not an array');
          return;
        }

        // Filtrer d'abord les événements Revive avant de les traiter
        const reviveContractEvents = events.filter((record: any) => {
          const event = record?.event;
          if (!event) return false;
          
          const palletName = event?.type;
          const eventValue = event?.value;
          
          if (palletName !== 'Revive' || eventValue?.type !== 'ContractEmitted') return false;
          
          const contractData = eventValue.value;
          const addrHex = contractData?.contract?.asHex?.();
          
          return addrHex && addrHex.toLowerCase() === contractAddress.toLowerCase();
        });
        
        if (reviveContractEvents.length === 0) return;
        
        debugLog(`📦 BlockWatcher: processing ${reviveContractEvents.length} contract events from block ${finalizedBlock.number}`);
        
        // Traiter uniquement les événements filtrés
        reviveContractEvents.forEach((record: any) => {
          const eventValue = record?.event?.value;
          const contractData = eventValue.value;

          const dataBytes: Uint8Array | undefined = contractData?.data?.asBytes?.();
          const topicsBytes: Uint8Array[] | undefined = contractData?.topics?.map((t: any) => t?.asBytes?.());
          
          if (!dataBytes || !topicsBytes) {
            debugWarn('⚠️ BlockWatcher: Missing dataBytes or topicsBytes');
            return;
          }

          const decoded = decodeContractEvent(dataBytes, topicsBytes);
          if (decoded) {
            // Ajouter le blockNumber au decoded event
            const eventWithBlock = {
              ...decoded,
              blockNumber: finalizedBlock.number
            };
            debugLog('🧩 BlockWatcher decoded event');
            try { 
              onDecoded && onDecoded(eventWithBlock); 
            } catch (e) {
              debugWarn('⚠️ BlockWatcher: Error calling onDecoded callback:', e);
            }
          }
        });
      } catch (e) {
        debugWarn('BlockWatcher: error processing block', e);
      }
    });

    debugLog('✅ BlockWatcher: Watcher active');

    return () => {
      try { subscription.unsubscribe(); } catch {}
      try { client.destroy(); } catch {}
    };
  } catch (e) {
    console.warn('BlockWatcher: setup failed', e);
    return null;
  }
}


