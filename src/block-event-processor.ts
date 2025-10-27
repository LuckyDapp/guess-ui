import { decodeContractEvent } from "./event-decoder";
import type { GameEvent } from "./types";

export const processBlockEvents = (
    blockEvents: any[], 
    txId: string, 
    blockNumber?: number, 
    txHash?: string,
    onEventDetected?: (txId: string, event: Omit<GameEvent, 'id' | 'timestamp'>) => void
): void => {
    console.log(`📦 Processing ${blockEvents.length} block events for transaction ${txId}`);
    
    blockEvents.forEach((record: any, index: number) => {
        // Format polkadot-api moderne: { type: "PalletName", value: {...}, topics: [] }
        const palletName = record.type;
        const eventValue = record.value;
        
        // Vérifier si c'est un événement du pallet Revive (contracts)
                if (palletName === 'Revive') {
                    // Dans le format polkadot-api moderne, la structure est:
                    // { type: "Revive", value: { type: "ContractEmitted", value: { contract, data, topics } } }
                    
                    if (eventValue?.type === 'ContractEmitted') {
                
                const contractData = eventValue.value;
                const contractAddress = contractData?.contract;
                const eventData = contractData?.data;
                const topics = contractData?.topics;
                
                // Décoder l'adresse du contrat
                const contractAddressHex = contractAddress?.asHex?.();
                
                // Décoder les données de l'événement
                const eventDataBytes = eventData?.asBytes?.();
                
                // Décoder les topics
                const topicsDecoded = topics?.map((topic: any) => topic?.asBytes?.());
                
                console.log('🎯 Contract event from:', contractAddressHex, '| Topics:', topicsDecoded?.length || 0);
                
                // Si on a les données de l'événement, les décoder
                if (eventDataBytes && topicsDecoded) {
                    try {
                        const decodedEvent = decodeContractEvent(eventDataBytes, topicsDecoded);
                        
                        if (decodedEvent) {
                            console.log('✅ Decoded event:', decodedEvent.eventType);
                            
                            // Ajouter les métadonnées
                            decodedEvent.blockNumber = blockNumber;
                            decodedEvent.txHash = txHash;
                            
                            // Appeler le callback
                            if (onEventDetected) {
                                onEventDetected(txId, decodedEvent);
                            }
                        }
                    } catch (error) {
                        console.error('❌ Error decoding event:', error instanceof Error ? error.message : String(error));
                    }
                }
            }
        }
    });
};
