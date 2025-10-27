import WebSocket from 'ws';
import { blake2b } from 'blakejs';

const RPC = process.env.RPC || 'wss://testnet-passet-hub.polkadot.io';
const HASH = (process.env.HASH || '').toLowerCase();
const DEPTH = parseInt(process.env.DEPTH || '200', 10);

if (!HASH || !HASH.startsWith('0x') || HASH.length !== 66) {
  console.error('Set HASH=0x<64hex> env var.');
  process.exit(1);
}

function rpc(ws, method, params = []) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1e9);
    ws.once('message', (data) => {
      try {
        const msg = JSON.parse(String(data));
        if (msg.id === id) {
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      } catch (e) {
        reject(e);
      }
    });
    ws.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }));
  });
}

function hexToU8a(hex) {
  const h = hex.startsWith('0x') ? hex.slice(2) : hex;
  return new Uint8Array(h.match(/.{1,2}/g).map((b) => parseInt(b, 16)));
}

(async () => {
  const ws = new WebSocket(RPC);
  await new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej); });

  const finalized = await rpc(ws, 'chain_getFinalizedHead');
  let hash = finalized;

  for (let i = 0; i < DEPTH && hash; i++) {
    const header = await rpc(ws, 'chain_getHeader', [hash]);
    const block = await rpc(ws, 'chain_getBlock', [hash]);
    const extrinsics = block?.block?.extrinsics || [];

    for (let idx = 0; idx < extrinsics.length; idx++) {
      const extHex = extrinsics[idx];
      const h = '0x' + Buffer.from(blake2b(hexToU8a(extHex), undefined, 32)).toString('hex');
      if (h.toLowerCase() === HASH) {
        console.log(`Found in block ${hash} (#${parseInt(header.number, 16)}) at index ${idx}`);
        ws.close();
        return;
      }
    }

    hash = header.parentHash;
  }

  console.log('Not found in last', DEPTH, 'finalized blocks.');
  ws.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
