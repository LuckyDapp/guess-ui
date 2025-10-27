import { createApiClient, getApiClient, destroyApiClient } from "./api-client";
import { decodeContractEvent, isEventFromOurContract } from "./event-decoder";
import type { TransactionHistory, GameEvent } from "./types";

export class EventService {
    private eventSubscription: any = null;
    private transactions: TransactionHistory[] = [];
    private onEventDetected: ((txId: string, event: Omit<GameEvent, 'id' | 'timestamp'>) => void) | null = null;

    constructor() {
        console.log('EventService initialized');
    }

    // Définir la fonction de callback pour les événements détectés
    setEventCallback(callback: (txId: string, event: Omit<GameEvent, 'id' | 'timestamp'>) => void) {
        this.onEventDetected = callback;
    }

    // Mettre à jour la liste des transactions
    updateTransactions(transactions: TransactionHistory[]) {
        this.transactions = transactions;
    }

    // Démarrer l'abonnement aux événements
    async startSubscription(): Promise<void> {
        if (this.eventSubscription) {
            console.log('🔄 Event subscription already active');
            return;
        }

        try {
            console.log('🔌 Creating API client...');
            const api = await createApiClient();
            console.log('✅ API client created successfully');
            
            console.log('🚀 Starting contract event subscription...');
            
            this.eventSubscription = await api.query.system.events((events) => {
                console.log(`📡 Received ${events.length} events from blockchain`);
                
                if (events.length === 0) {
                    console.log('📭 No events in this batch');
                    return;
                }
                
                events.forEach((record, index) => {
                    console.log(`📋 Processing event ${index + 1}/${events.length}:`, {
                        section: record.event.section,
                        method: record.event.method,
                        data: record.event.data
                    });
                    
                    this.processEvent(record);
                });
            });
            
            console.log('✅ Successfully subscribed to contract events');
            console.log('🎯 Event subscription is now active and listening...');
            
        } catch (error) {
            console.error('❌ Failed to start event subscription:', error);
            console.error('🔍 Error details:', error);
            throw error;
        }
    }

    // Arrêter l'abonnement
    stopSubscription(): void {
        if (this.eventSubscription) {
            this.eventSubscription();
            this.eventSubscription = null;
            console.log('🛑 Stopped contract event subscription');
        }
    }

    // Traiter un événement reçu
    private processEvent(record: any): void {
        const { event } = record;
        
        console.log(`🔍 Analyzing event: ${event.section}.${event.method}`);
        
        // Vérifier si c'est un événement de contrat
        if (event.section === 'contracts' && event.method === 'ContractEmitted') {
            console.log('📦 ContractEmitted event detected');
            const [contractAddress, eventBytes] = event.data;
            
            console.log('🏠 Contract address:', contractAddress.toString());
            console.log('📄 Event bytes length:', eventBytes.length);
            
            // Vérifier si c'est notre contrat
            if (isEventFromOurContract(contractAddress.toString())) {
                console.log('🎯 ✅ Contract event detected from OUR contract!');
                
                // Décoder l'événement
                const decodedEvent = decodeContractEvent(eventBytes);
                
                if (decodedEvent) {
                    console.log('🔓 Successfully decoded event:', decodedEvent);
                    
                    // Ajouter les métadonnées du bloc
                    decodedEvent.blockNumber = record.blockNumber;
                    decodedEvent.txHash = record.txHash;
                    
                    console.log('📊 Event with metadata:', decodedEvent);
                    
                    // Associer à la transaction correspondante
                    this.associateEventToTransaction(decodedEvent);
                } else {
                    console.warn('⚠️ Failed to decode contract event');
                }
            } else {
                console.log('🚫 Contract event from different contract, ignoring');
            }
        } else {
            console.log(`⏭️ Skipping non-contract event: ${event.section}.${event.method}`);
        }
    }

    // Associer un événement à une transaction
    private associateEventToTransaction(decodedEvent: Omit<GameEvent, 'id' | 'timestamp'>): void {
        console.log(`🔍 Looking for related transaction for event: ${decodedEvent.eventType}`);
        console.log(`📊 Available transactions: ${this.transactions.length}`);
        
        const relatedTransaction = this.findRelatedTransaction(decodedEvent);
        
        if (relatedTransaction) {
            console.log(`🔗 ✅ Found related transaction: ${relatedTransaction.id}`);
            console.log(`📋 Transaction details:`, {
                call: relatedTransaction.call,
                parameters: relatedTransaction.parameters,
                status: relatedTransaction.status
            });
            
            if (this.onEventDetected) {
                console.log(`📤 Calling onEventDetected callback for transaction ${relatedTransaction.id}`);
                this.onEventDetected(relatedTransaction.id, decodedEvent);
            } else {
                console.warn('⚠️ No onEventDetected callback set');
            }
        } else {
            console.warn('⚠️ ❌ No related transaction found for event:', decodedEvent);
            console.log('🔍 Searched in transactions:', this.transactions.map(tx => ({
                id: tx.id,
                call: tx.call,
                parameters: tx.parameters,
                status: tx.status
            })));
        }
    }

    // Trouver la transaction correspondante
    private findRelatedTransaction(decodedEvent: Omit<GameEvent, 'id' | 'timestamp'>): TransactionHistory | null {
        console.log(`🔍 Searching for transaction matching event: ${decodedEvent.eventType}`);
        console.log(`📊 Event data:`, decodedEvent.data);
        
        // Stratégie 1: Par les paramètres de l'événement
        if (decodedEvent.eventType === 'guess_submitted') {
            console.log(`🎯 Looking for 'guess' transaction with guess: ${decodedEvent.data.guess}`);
            const found = this.transactions.find(tx => 
                tx.call === 'guess' && 
                tx.parameters.guess === decodedEvent.data.guess &&
                tx.status === 'finalized'
            );
            if (found) {
                console.log(`✅ Found guess transaction: ${found.id}`);
            } else {
                console.log(`❌ No guess transaction found for guess: ${decodedEvent.data.guess}`);
            }
            return found || null;
        }
        
        if (decodedEvent.eventType === 'game_started') {
            console.log(`🎮 Looking for 'start_new_game' transaction with min: ${decodedEvent.data.minNumber}, max: ${decodedEvent.data.maxNumber}`);
            const found = this.transactions.find(tx => 
                tx.call === 'start_new_game' && 
                tx.parameters.min_number === decodedEvent.data.minNumber &&
                tx.parameters.max_number === decodedEvent.data.maxNumber &&
                tx.status === 'finalized'
            );
            if (found) {
                console.log(`✅ Found start_new_game transaction: ${found.id}`);
            } else {
                console.log(`❌ No start_new_game transaction found`);
            }
            return found || null;
        }
        
        if (decodedEvent.eventType === 'guess_result') {
            console.log(`📊 Looking for 'guess' transaction for result with guess: ${decodedEvent.data.guess}`);
            // Pour les résultats, on cherche par le guess
            const found = this.transactions.find(tx => 
                tx.call === 'guess' && 
                tx.parameters.guess === decodedEvent.data.guess &&
                tx.status === 'finalized'
            );
            if (found) {
                console.log(`✅ Found guess transaction for result: ${found.id}`);
            } else {
                console.log(`❌ No guess transaction found for result with guess: ${decodedEvent.data.guess}`);
            }
            return found || null;
        }
        
        // Stratégie 2: Par le hash de transaction (si disponible)
        if (decodedEvent.txHash) {
            console.log(`🔗 Looking for transaction by hash: ${decodedEvent.txHash}`);
            const found = this.transactions.find(tx => 
                tx.txHash === decodedEvent.txHash
            );
            if (found) {
                console.log(`✅ Found transaction by hash: ${found.id}`);
            } else {
                console.log(`❌ No transaction found with hash: ${decodedEvent.txHash}`);
            }
            return found || null;
        }
        
        console.log(`❌ No matching strategy found for event type: ${decodedEvent.eventType}`);
        return null;
    }

    // Nettoyer les ressources
    destroy(): void {
        this.stopSubscription();
        destroyApiClient();
        console.log('EventService destroyed');
    }
}

// Instance singleton
let eventServiceInstance: EventService | null = null;

export const getEventService = (): EventService => {
    if (!eventServiceInstance) {
        eventServiceInstance = new EventService();
    }
    return eventServiceInstance;
};
