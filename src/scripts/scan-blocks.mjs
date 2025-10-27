import { ApiPromise, WsProvider } from '@polkadot/api';

// Support ARGs like KEY=VALUE after the command (yarn run passes them as argv)
for (const arg of process.argv.slice(2)) {
  const eq = arg.indexOf('=');
  if (eq > 0) {
    const k = arg.slice(0, eq);
    const v = arg.slice(eq + 1);
    if (!(k in process.env)) process.env[k] = v;
  }
}

const RPC = process.env.RPC || 'wss://testnet-passet-hub.polkadot.io';
const CONTRACT = (process.env.CONTRACT || '').toLowerCase(); // 0x... (H160 for ink v6 revive)
const BLOCK = process.env.BLOCK ? parseInt(process.env.BLOCK, 10) : undefined; // single block number
const START = process.env.START ? parseInt(process.env.START, 10) : undefined;   // range start (inclusive)
const END = process.env.END ? parseInt(process.env.END, 10) : undefined;         // range end (inclusive)

if (!CONTRACT || !CONTRACT.startsWith('0x')) {
  console.error('Set CONTRACT=0x<hexAddress> env var (ink v6 H160).');
  process.exit(1);
}

function hexToU8a(hex) {
  const h = hex.startsWith('0x') ? hex.slice(2) : hex;
  return new Uint8Array(h.match(/.{1,2}/g).map((b) => parseInt(b, 16)));
}

// Event signatures from metadata
const EVENT_SIGNATURES = {
  '0xc8a7c5d86cdaf43555273e08a00e4cdaa93cf22046685231d5eb1b6c0d29fa92': 'NewGame',
  '0xbfe3e4de23c556408a7c400baf6b27364bdb763595ac8f3547c20db70131083a': 'GuessMade',
  '0xd30c753e3012d98d428abde3eebaae62a09d7d043d8018f1ecb4e6c5d3dc9429': 'ClueGiven'
};

function decodeU128LE(bytes, offset) {
  const slice = bytes.slice(offset, offset + 16);
  return BigInt('0x' + Array.from(slice).reverse().map(b => b.toString(16).padStart(2, '0')).join(''));
}
function decodeU32LE(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
}
function decodeU16LE(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}
function decodeAddress20(bytes, offset) {
  const slice = bytes.slice(offset, offset + 20);
  return '0x' + Array.from(slice).map(b => b.toString(16).padStart(2, '0')).join('');
}

function decodeEventData(signatureHex, dataHex) {
  const bytes = hexToU8a(dataHex);
  const kind = EVENT_SIGNATURES[signatureHex];
  if (!kind) return { __kind: 'Unknown', raw: dataHex };
  let offset = 0;
  if (kind === 'NewGame') {
    const game_number = decodeU128LE(bytes, offset); offset += 16;
    const player = decodeAddress20(bytes, offset); offset += 20;
    const min_number = decodeU16LE(bytes, offset); offset += 2;
    const max_number = decodeU16LE(bytes, offset);
    return { __kind: kind, game_number, player, min_number, max_number };
  }
  if (kind === 'GuessMade') {
    const game_number = decodeU128LE(bytes, offset); offset += 16;
    const attempt = decodeU32LE(bytes, offset); offset += 4;
    const guess = decodeU16LE(bytes, offset);
    return { __kind: kind, game_number, attempt, guess };
  }
  if (kind === 'ClueGiven') {
    const game_number = decodeU128LE(bytes, offset); offset += 16;
    const attempt = decodeU32LE(bytes, offset); offset += 4;
    const guess = decodeU16LE(bytes, offset); offset += 2;
    const clueValue = bytes[offset];
    const clue = ['More', 'Less', 'Found'][clueValue] || `Unknown(${clueValue})`;
    return { __kind: kind, game_number, attempt, guess, clue };
  }
  return { __kind: 'Unknown', raw: dataHex };
}

async function scanBlock(api, blockNumber) {
  const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
  const at = await api.at(blockHash);
  const allEvents = await at.query.system.events();
  console.log(`\n# Block ${blockNumber} (${String(blockHash)}) - ${allEvents.length} events`);

  for (const { event, phase } of allEvents) {
    const { section, method, data } = event;
    if (section === 'revive' && method === 'ContractEmitted') {
      const [contract, eventData, topics] = data;
      const addr = String(contract).toLowerCase();
      if (addr !== CONTRACT) continue;
      const topicsArr = topics.map(t => String(t));
      const signature = topicsArr[0];
      const name = EVENT_SIGNATURES[signature] || 'Unknown';
      const decoded = decodeEventData(signature, eventData.toHex());
      console.log(`- ContractEmitted ${name}`);
      console.log('  contract:', addr);
      console.log('  topics[0]:', signature);
      if (decoded.__kind === 'NewGame') {
        console.log('  game_number:', String(decoded.game_number));
        console.log('  player:', decoded.player);
        console.log('  min_number:', decoded.min_number);
        console.log('  max_number:', decoded.max_number);
      } else if (decoded.__kind === 'GuessMade') {
        console.log('  game_number:', String(decoded.game_number));
        console.log('  attempt:', decoded.attempt);
        console.log('  guess:', decoded.guess);
      } else if (decoded.__kind === 'ClueGiven') {
        console.log('  game_number:', String(decoded.game_number));
        console.log('  attempt:', decoded.attempt);
        console.log('  guess:', decoded.guess);
        console.log('  clue:', decoded.clue);
      } else {
        console.log('  raw:', decoded.raw);
      }
    }
  }
}

async function main() {
  if (BLOCK === undefined && (START === undefined || END === undefined)) {
    console.error('Provide BLOCK=<number> or START=<number> END=<number>.');
    process.exit(1);
  }

  const api = await ApiPromise.create({ provider: new WsProvider(RPC) });

  if (BLOCK !== undefined) {
    await scanBlock(api, BLOCK);
  } else {
    const a = Math.min(START, END);
    const b = Math.max(START, END);
    for (let n = a; n <= b; n++) {
      await scanBlock(api, n);
    }
  }

  await api.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


