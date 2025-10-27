import { ApiPromise, WsProvider } from '@polkadot/api';
import { blake2b } from 'blakejs';

const RPC = process.env.RPC || 'wss://testnet-passet-hub.polkadot.io';
const HASH = (process.env.HASH || '').toLowerCase();
const BLOCK = process.env.BLOCK;
const INDEX = process.env.INDEX ? parseInt(process.env.INDEX, 10) : undefined;

if (!HASH || !HASH.startsWith('0x') || HASH.length !== 66) {
  console.error('Set HASH=0x<64hex> env var.');
  process.exit(1);
}

// Event signatures from metadata
const EVENT_SIGNATURES = {
  '0xc8a7c5d86cdaf43555273e08a00e4cdaa93cf22046685231d5eb1b6c0d29fa92': 'NewGame',
  '0xbfe3e4de23c556408a7c400baf6b27364bdb763595ac8f3547c20db70131083a': 'GuessMade',
  '0xd30c753e3012d98d428abde3eebaae62a09d7d043d8018f1ecb4e6c5d3dc9429': 'ClueGiven'
};

function hexToU8a(hex) {
  const h = hex.startsWith('0x') ? hex.slice(2) : hex;
  return new Uint8Array(h.match(/.{1,2}/g).map((b) => parseInt(b, 16)));
}

function decodeNewGame(data) {
  // NewGame: game_number (u128), player (H160), min_number (u16), max_number (u16)
  const bytes = hexToU8a(data);
  let offset = 0;
  
  // game_number (u128) - 16 bytes
  const gameNumber = bytes.slice(offset, offset + 16);
  const gameNumberValue = BigInt('0x' + Array.from(gameNumber).map(b => b.toString(16).padStart(2, '0')).reverse().join(''));
  offset += 16;
  
  // player (H160) - 20 bytes
  const player = bytes.slice(offset, offset + 20);
  const playerHex = '0x' + Array.from(player).map(b => b.toString(16).padStart(2, '0')).join('');
  offset += 20;
  
  // min_number (u16) - 2 bytes little endian
  const minNumber = bytes[offset] | (bytes[offset + 1] << 8);
  offset += 2;
  
  // max_number (u16) - 2 bytes little endian
  const maxNumber = bytes[offset] | (bytes[offset + 1] << 8);
  
  return {
    game_number: gameNumberValue.toString(),
    player: playerHex,
    min_number: minNumber,
    max_number: maxNumber
  };
}

function decodeGuessMade(data) {
  // GuessMade: game_number (u128), attempt (u32), guess (u16)
  const bytes = hexToU8a(data);
  let offset = 0;
  
  // game_number (u128) - 16 bytes
  const gameNumber = bytes.slice(offset, offset + 16);
  const gameNumberValue = BigInt('0x' + Array.from(gameNumber).map(b => b.toString(16).padStart(2, '0')).reverse().join(''));
  offset += 16;
  
  // attempt (u32) - 4 bytes little endian
  const attempt = bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
  offset += 4;
  
  // guess (u16) - 2 bytes little endian
  const guess = bytes[offset] | (bytes[offset + 1] << 8);
  
  return {
    game_number: gameNumberValue.toString(),
    attempt: attempt,
    guess: guess
  };
}

function decodeClueGiven(data) {
  // ClueGiven: game_number (u128), attempt (u32), guess (u16), clue (enum: More=0, Less=1, Found=2)
  const bytes = hexToU8a(data);
  let offset = 0;
  
  // game_number (u128) - 16 bytes
  const gameNumber = bytes.slice(offset, offset + 16);
  const gameNumberValue = BigInt('0x' + Array.from(gameNumber).map(b => b.toString(16).padStart(2, '0')).reverse().join(''));
  offset += 16;
  
  // attempt (u32) - 4 bytes little endian
  const attempt = bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
  offset += 4;
  
  // guess (u16) - 2 bytes little endian
  const guess = bytes[offset] | (bytes[offset + 1] << 8);
  offset += 2;
  
  // clue (enum) - 1 byte
  const clueValue = bytes[offset];
  const clue = ['More', 'Less', 'Found'][clueValue] || `Unknown(${clueValue})`;
  
  return {
    game_number: gameNumberValue.toString(),
    attempt: attempt,
    guess: guess,
    clue: clue
  };
}

async function findInFinalized(api, hashHex, depth) {
  let blockHash = await api.rpc.chain.getFinalizedHead();
  for (let i = 0; i < depth; i++) {
    const signedBlock = await api.rpc.chain.getBlock(blockHash);
    const header = signedBlock.block.header;
    const exts = signedBlock.block.extrinsics;
    for (let idx = 0; idx < exts.length; idx++) {
      const h = '0x' + Buffer.from(blake2b(exts[idx].toU8a(true), undefined, 32)).toString('hex');
      if (h.toLowerCase() === hashHex) {
        return { blockHash: String(blockHash), blockNumber: header.number.toNumber(), index: idx };
      }
    }
    blockHash = header.parentHash;
    if (!blockHash) break;
  }
  return null;
}

async function main() {
  const api = await ApiPromise.create({ provider: new WsProvider(RPC) });

  let located;
  if (BLOCK && INDEX !== undefined) {
    located = { blockHash: BLOCK, blockNumber: (await api.rpc.chain.getHeader(BLOCK)).number.toNumber(), index: INDEX };
  } else {
    located = await findInFinalized(api, HASH, 1000);
  }

  if (!located) {
    console.log('Not found.');
    await api.disconnect();
    return;
  }

  const { blockHash, blockNumber, index } = located;
  console.log(`Tx located in block #${blockNumber} (${blockHash}) at index ${index}`);

  const at = await api.at(blockHash);
  const allEvents = await at.query.system.events();
  const related = allEvents.filter(({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(index));

  for (const { event, phase } of related) {
    const { section, method, data } = event;
    console.log(`Event: ${section}.${method}`);
    console.log('  Phase:', phase.toString());
    
    if (section === 'revive' && method === 'ContractEmitted') {
      const [contract, eventData, topics] = event.data;
      console.log('  Contract:', contract.toString());
      console.log('  Topics:', topics.map(t => t.toString()));
      console.log('  Event Data (hex):', eventData.toHex());
      
      // Check if this matches our contract events
      const topicsArray = topics.map(t => t.toString());
      const eventSignature = topicsArray[0];
      const eventName = EVENT_SIGNATURES[eventSignature];
      
      if (eventName) {
        console.log(`  Decoded as: ${eventName}`);
        try {
          let decoded;
          switch (eventName) {
            case 'NewGame':
              decoded = decodeNewGame(eventData.toHex());
              console.log('  game_number:', decoded.game_number);
              console.log('  player:', decoded.player);
              console.log('  min_number:', decoded.min_number);
              console.log('  max_number:', decoded.max_number);
              break;
            case 'GuessMade':
              decoded = decodeGuessMade(eventData.toHex());
              console.log('  game_number:', decoded.game_number);
              console.log('  attempt:', decoded.attempt);
              console.log('  guess:', decoded.guess);
              break;
            case 'ClueGiven':
              decoded = decodeClueGiven(eventData.toHex());
              console.log('  game_number:', decoded.game_number);
              console.log('  attempt:', decoded.attempt);
              console.log('  guess:', decoded.guess);
              console.log('  clue:', decoded.clue);
              break;
          }
        } catch (e) {
          console.log('  Decode error:', e.message);
        }
      } else {
        console.log('  Unknown event signature:', eventSignature);
      }
    } else {
      console.log('  Data:', data.toHuman());
    }
  }

  await api.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


