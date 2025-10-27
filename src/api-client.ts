import { createClient } from "polkadot-api";
import { getRpc } from "./config";

let apiClient: any = null;

export const createApiClient = async () => {
    if (!apiClient) {
        console.log('🔌 Creating new API client...');
        const rpc = getRpc('0x5102'); // Passet-Hub chainId
        console.log('🌐 RPC endpoint:', rpc);
        
        apiClient = createClient(rpc);
        console.log('✅ API client created for event subscription');
        
        // Tester la connexion
        try {
            console.log('🔍 Testing API connection...');
            const chain = await apiClient.getChain();
            console.log('🔗 Connected to chain:', chain);
        } catch (error) {
            console.error('❌ Failed to connect to chain:', error);
        }
    } else {
        console.log('♻️ Reusing existing API client');
    }
    return apiClient;
};

export const getApiClient = () => {
    return apiClient;
};

export const destroyApiClient = () => {
    if (apiClient) {
        apiClient.destroy?.();
        apiClient = null;
        console.log('Destroyed API client');
    }
};
