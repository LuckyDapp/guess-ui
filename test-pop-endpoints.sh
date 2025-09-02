#!/bin/bash

echo "🔍 Testing PASETO Network endpoints..."
echo "======================================"
echo ""

# Liste des endpoints à tester
ENDPOINTS=(
    "wss://testnet-passet-hub.polkadot.io/"
    "wss://rpc1.paseo.popnetwork.xyz/"
    "wss://rpc2.paseo.popnetwork.xyz/"
    "wss://archive.paseo.popnetwork.xyz/"
    "wss://pop.api.onfinality.io/public-ws"
    "wss://paseo-rpc.dwellir.com"
    "wss://paseo.api.onfinality.io/public-ws"
)

WORKING_ENDPOINTS=()

for endpoint in "${ENDPOINTS[@]}"; do
    echo "🧪 Testing: $endpoint"

    # Test avec timeout de 10 secondes
    timeout 10s ./pop call chain -u "$endpoint" -p System -f remark -a "test" --skip-confirm -s "//Alice" > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        echo "✅ WORKING: $endpoint"
        WORKING_ENDPOINTS+=("$endpoint")
        echo ""
    else
        echo "❌ DOWN: $endpoint"
        echo ""
    fi
done

echo "=================================================="
echo "📊 RESULTS:"
echo "Found ${#WORKING_ENDPOINTS[@]} working endpoints out of ${#ENDPOINTS[@]} tested"
echo ""

if [ ${#WORKING_ENDPOINTS[@]} -gt 0 ]; then
    echo "✅ Working endpoints:"
    for endpoint in "${WORKING_ENDPOINTS[@]}"; do
        echo "   🌐 $endpoint"
    done
    echo ""
    echo "💡 Recommendation: Update your config.ts with one of these endpoints"
else
    echo "❌ No working network endpoints found"
    echo ""
    echo "💡 Suggestions:"
    echo "   1. Check PASETO Network documentation for current endpoints"
    echo "   2. Contact PASETO team for status updates"
    echo "   3. Use a local node for development"
    echo "   4. Consider using Westend for testing: wss://westend-rpc.polkadot.io/"
fi