import type { GameEvent } from "./types";

// Map des signatures d'événements (premier topic) depuis le metadata
const EVENT_SIGNATURES = {
    '0xc8a7c5d86cdaf43555273e08a00e4cdaa93cf22046685231d5eb1b6c0d29fa92': 'NewGame',
    '0xbfe3e4de23c556408a7c400baf6b27364bdb763595ac8f3547c20db70131083a': 'GuessMade',
    '0xd30c753e3012d98d428abde3eebaae62a09d7d043d8018f1ecb4e6c5d3dc9429': 'ClueGiven'
} as const;

function decodeU128LittleEndian(bytes: Uint8Array, offset: number): bigint {
    const slice = bytes.slice(offset, offset + 16);
    return BigInt('0x' + Array.from(slice).reverse().map(b => b.toString(16).padStart(2, '0')).join(''));
}

function decodeU32LittleEndian(bytes: Uint8Array, offset: number): number {
    return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
}

function decodeU16LittleEndian(bytes: Uint8Array, offset: number): number {
    return bytes[offset] | (bytes[offset + 1] << 8);
}

function decodeAddress(bytes: Uint8Array, offset: number): string {
    const slice = bytes.slice(offset, offset + 20);
    return '0x' + Array.from(slice).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const decodeContractEvent = (
    eventBytes: Uint8Array, 
    topics: Uint8Array[]
): Omit<GameEvent, 'id' | 'timestamp'> | null => {
    try {
        // Le premier topic est la signature de l'événement
        const signatureTopic = topics[0];
        const signatureHex = '0x' + Array.from(signatureTopic).map(b => b.toString(16).padStart(2, '0')).join('');
        
        const eventType = EVENT_SIGNATURES[signatureHex as keyof typeof EVENT_SIGNATURES];
        
        if (!eventType) {
            console.log('Unknown event signature:', signatureHex);
            return null;
        }
        
        console.log('🔍 Decoding:', eventType);
        
        let offset = 0;
        
        switch (eventType) {
            case 'NewGame': {
                // NewGame: game_number (u128), player (H160), min_number (u16), max_number (u16)
                const gameNumber = decodeU128LittleEndian(eventBytes, offset);
                offset += 16;
                
                const player = decodeAddress(eventBytes, offset);
                offset += 20;
                
                const minNumber = decodeU16LittleEndian(eventBytes, offset);
                offset += 2;
                
                const maxNumber = decodeU16LittleEndian(eventBytes, offset);
                
                return {
                    eventType: 'game_started',
                    blockNumber: undefined,
                    data: {
                        gameNumber,
                        minNumber,
                        maxNumber
                    },
                    txHash: undefined
                };
            }
                
            case 'GuessMade': {
                // GuessMade: game_number (u128, indexed), attempt (u32), guess (u16)
                // game_number est dans topics[1]
                const gameNumber = decodeU128LittleEndian(eventBytes, offset);
                offset += 16;
                
                const attempt = decodeU32LittleEndian(eventBytes, offset);
                offset += 4;
                
                const guess = decodeU16LittleEndian(eventBytes, offset);
                
                return {
                    eventType: 'guess_submitted',
                    blockNumber: undefined,
                    data: {
                        gameNumber,
                        attemptNumber: attempt,
                        guess
                    },
                    txHash: undefined
                };
            }
                
            case 'ClueGiven': {
                // ClueGiven: game_number (u128, indexed), attempt (u32), guess (u16), clue (enum)
                const gameNumber = decodeU128LittleEndian(eventBytes, offset);
                offset += 16;
                
                const attempt = decodeU32LittleEndian(eventBytes, offset);
                offset += 4;
                
                const guess = decodeU16LittleEndian(eventBytes, offset);
                offset += 2;
                
                const clueValue = eventBytes[offset];
                const clue = ['More', 'Less', 'Found'][clueValue] as 'More' | 'Less' | 'Found';
                
                return {
                    eventType: 'guess_result',
                    blockNumber: undefined,
                    data: {
                        gameNumber,
                        attemptNumber: attempt,
                        guess,
                        result: clue
                    },
                    txHash: undefined
                };
            }
                
            default:
                return null;
        }
    } catch (error) {
        console.error('❌ Decode error:', error instanceof Error ? error.message : String(error));
        return null;
    }
};
