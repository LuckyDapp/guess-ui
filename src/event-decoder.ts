import type { GameEvent } from "./types";

// Map des signatures d'événements Westend (premier topic) depuis le metadata
const EVENT_SIGNATURES = {
    '0xc8a7c5d86cdaf43555273e08a00e4cdaa93cf22046685231d5eb1b6c0d29fa92': 'NewGame',
    '0x3db1630316e0f6c2b1c4274ba861a905acb84d336a2ba821871076503558da72': 'GameOver',
    '0x6fbbc2beca7d1247dbf89f89623d64c4431ae74cc6ec660f6ce708d846997769': 'ClueGiven',
    '0xf5b23c2011134ba2467787da32da9ddda148939ab974db7735944b8ea67c3e5d': 'GuessMade',
    '0xe1c579bb2a3625a2352da9d7e54506f12b7b582ceb069232e25005bddcbbbb21': 'GameCancelled',
    '0x732f6678ce566a0ec18049af450298a2ebd0f38244d07ed84d01af908a9b6e20': 'MaxAttemptsUpdated'
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
                // NewGame: game_number (u128, indexed), player (H160, indexed), min_number (u16), max_number (u16), max_attempts? (u32)
                const gameNumber = decodeU128LittleEndian(eventBytes, offset);
                offset += 16;
                const player = decodeAddress(eventBytes, offset);
                offset += 20;
                const minNumber = decodeU16LittleEndian(eventBytes, offset);
                offset += 2;
                const maxNumber = decodeU16LittleEndian(eventBytes, offset);
                offset += 2;
                let maxAttempts: number | undefined;
                if (offset + 4 <= eventBytes.length) {
                    maxAttempts = decodeU32LittleEndian(eventBytes, offset);
                }
                return {
                    eventType: 'game_started',
                    blockNumber: undefined,
                    data: {
                        gameNumber,
                        minNumber,
                        maxNumber,
                        maxAttempts,
                        player
                    },
                    txHash: undefined
                };
            }
                
            case 'GuessMade': {
                // V2 GuessMade: game_number (u128, indexed), player (H160, indexed), attempt (u32), guess (u16)
                const gameNumber = decodeU128LittleEndian(eventBytes, offset);
                offset += 16;
                
                const player = decodeAddress(eventBytes, offset);
                offset += 20;
                
                const attempt = decodeU32LittleEndian(eventBytes, offset);
                offset += 4;
                
                const guess = decodeU16LittleEndian(eventBytes, offset);
                
                return {
                    eventType: 'guess_submitted',
                    blockNumber: undefined,
                    data: {
                        gameNumber,
                        attemptNumber: attempt,
                        guess,
                        player
                    },
                    txHash: undefined
                };
            }
                
            case 'ClueGiven': {
                // V2 ClueGiven: game_number (u128, indexed), player (H160, indexed), attempt (u32), guess (u16), clue (enum)
                const gameNumber = decodeU128LittleEndian(eventBytes, offset);
                offset += 16;
                
                const player = decodeAddress(eventBytes, offset);
                offset += 20;
                
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
                        result: clue,
                        player
                    },
                    txHash: undefined
                };
            }
            
            case 'GameCancelled': {
                const gameNumber = decodeU128LittleEndian(eventBytes, offset);
                offset += 16;
                const player = decodeAddress(eventBytes, offset);
                return {
                    eventType: 'game_cancelled',
                    blockNumber: undefined,
                    data: { gameNumber, player, cancelled: true },
                    txHash: undefined
                };
            }
            case 'MaxAttemptsUpdated': {
                const gameNumber = decodeU128LittleEndian(eventBytes, offset);
                offset += 16;
                const player = decodeAddress(eventBytes, offset);
                offset += 20;
                const maxAttempts = decodeU32LittleEndian(eventBytes, offset);
                return {
                    eventType: 'max_attempts_updated',
                    blockNumber: undefined,
                    data: { gameNumber, player, maxAttempts },
                    txHash: undefined
                };
            }
            case 'GameOver': {
                // V2 GameOver: game_number (u128, indexed), player (H160, indexed), win (bool), target (u16)
                const gameNumber = decodeU128LittleEndian(eventBytes, offset);
                offset += 16;
                
                const player = decodeAddress(eventBytes, offset);
                offset += 20;
                
                const win = eventBytes[offset] !== 0;
                offset += 1;
                
                const target = decodeU16LittleEndian(eventBytes, offset);
                
                return {
                    eventType: 'game_over',
                    blockNumber: undefined,
                    data: {
                        gameNumber,
                        player,
                        win,
                        target
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
