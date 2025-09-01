const WebSocket = require('ws');

console.log('🔍 Testing WebSocket connection to wss://rpc1.paseo.popnetwork.xyz/');
console.log('⏳ Connecting...\n');

const ws = new WebSocket('wss://rpc1.paseo.popnetwork.xyz/');

ws.on('open', function open() {
    console.log('✅ WebSocket connection established!');
    console.log('📤 Sending test RPC call...\n');

    // Send a basic Substrate RPC call
    const rpcCall = {
        jsonrpc: '2.0',
        id: 1,
        method: 'chain_getHeader',
        params: []
    };

    ws.send(JSON.stringify(rpcCall, null, 2));
});

ws.on('message', function message(data) {
    console.log('📥 Received response:');
    try {
        const response = JSON.parse(data.toString());
        console.log(JSON.stringify(response, null, 2));
    } catch (e) {
        console.log(data.toString());
    }
    console.log('\n✅ WebSocket test completed successfully!');
    ws.close();
});

ws.on('error', function error(err) {
    console.error('❌ WebSocket error:', err.message);
});

ws.on('close', function close(code, reason) {
    console.log(`🔌 WebSocket connection closed (code: ${code})`);
    if (reason) {
        console.log('Reason:', reason.toString());
    }
});

// Timeout after 10 seconds
setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
        console.log('\n⏰ Timeout reached, closing connection...');
        ws.close();
    }
}, 10000);