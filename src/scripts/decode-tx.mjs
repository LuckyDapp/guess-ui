import { ApiPromise, WsProvider } from '@polkadot/api';
import { blake2b } from 'blakejs';

const RPC = process.env.RPC || 'wss://testnet-passet-hub.polkadot.io';
const HASH = (process.env.HASH || '').toLowerCase();
const DEPTH = parseInt(process.env.DEPTH || '600', 10);
const BLOCK = process.env.BLOCK; // optional block hash to jump to
const INDEX = process.env.INDEX ? parseInt(process.env.INDEX, 10) : undefined;

if (!HASH || !HASH.startsWith('0x') || HASH.length !== 66) {
  console.error('Set HASH=0x<64hex> env var.');
  process.exit(1);
}

function hexToU8a(hex) {
  const h = hex.startsWith('0x') ? hex.slice(2) : hex;
  return new Uint8Array(h.match(/.{1,2}/g).map((b) => parseInt(b, 16)));
}

async function findInFinalized(api, hashHex, depth) {
  let blockHash = await api.rpc.chain.getFinalizedHead();
  for (let i = 0; i < depth; i++) {
    const signedBlock = await api.rpc.chain.getBlock(blockHash);
    const header = signedBlock.block.header;
    const exts = signedBlock.block.extrinsics;
    for (let idx = 0; idx < exts.length; idx++) {
      // compute blake2b-256
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
    located = await findInFinalized(api, HASH, DEPTH);
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
    const { section, method, data, meta } = event;
    console.log(`Event: ${section}.${method}`);
    console.log('  Phase:', phase.toString());
    console.log('  Docs:', meta?.docs?.toString());
    console.log('  Data:', data.toHuman());
  }

  await api.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
