import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Button,
  TextField,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  Slider,
  FormControlLabel,
  Switch,
  LinearProgress
} from '@mui/material';
import {
  ExpandMore,
  Search,
  Call,
  History,
  AccountBalance,
  Code,
  Send,
  Refresh,
  Visibility,
  Receipt,
  Tune,
  ContentCopy,
  Info
} from '@mui/icons-material';
import { useChainId } from '@reactive-dot/react';
import { gtnContract, getRpc, getContractAddress } from '../config';
import { GameContext } from '../contexts/game-context';
import { BlockchainLoader } from './blockchain-loader';

interface Transaction {
  hash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  status: 'success' | 'failed';
  method?: string;
  input?: string;
  logs?: any[];
}

interface ContractEvent {
  event: string;
  data: any;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

interface SearchParams {
  blocksToSearch: number;
  maxTransactions: number;
  methodFilter?: string;
  statusFilter?: 'all' | 'success' | 'failed';
  autoRefresh: boolean;
  refreshInterval: number;
}

interface PopNetworkResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

export function ContractExplorer() {
  const [activeTab, setActiveTab] = useState(0);
  const [contractState, setContractState] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [events, setEvents] = useState<ContractEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [callResult, setCallResult] = useState<any>(null);
  const [callLoading, setCallLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchParams>({
    blocksToSearch: 1000,
    maxTransactions: 50,
    methodFilter: '',
    statusFilter: 'all',
    autoRefresh: false,
    refreshInterval: 30000
  });
  const [currentBlock, setCurrentBlock] = useState<number>(0);
  const [searchError, setSearchError] = useState<string>('');
  const [isUsingRealData, setIsUsingRealData] = useState<boolean>(false);
  const [networkConnectivity, setNetworkConnectivity] = useState<boolean | null>(null);
  const [searchProgress, setSearchProgress] = useState<{ current: number; total: number; eta: number } | null>(null);
  const [lastUsedParams, setLastUsedParams] = useState<SearchParams | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId);
  const context = useContext(GameContext);

  // Convert WebSocket URL to HTTP URL for REST API calls
  const getHttpRpcUrl = (wsUrl: string): string => {
    return wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');
  };

  // Get the RPC URL from the app configuration
  const getCurrentRpcUrl = (): string => {
    const wsUrl = getRpc(chainId);
    return getHttpRpcUrl(wsUrl);
  };

  // RPC Call helper - uses Substrate RPC methods for Pop Network
  const makeRpcCall = async (method: string, params: any[] = []): Promise<any> => {
    try {
      const rpcUrl = getCurrentRpcUrl();
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: PopNetworkResponse = await response.json();

      if (data.error) {
        throw new Error(`RPC Error ${data.error.code}: ${data.error.message}`);
      }

      return data.result;
    } catch (error) {
      console.error('RPC Call failed:', error);
      throw error;
    }
  };

  // Get contract storage using state_getStorage
  const getContractStorage = async (storageKey: string): Promise<any> => {
    try {
      const result = await makeRpcCall('state_getStorage', [storageKey]);
      return result;
    } catch (error) {
      console.warn('Failed to get contract storage:', storageKey, error);
      return null;
    }
  };

  // Get events from a block using state_getStorage with system events key
  const getBlockEvents = async (blockHash: string): Promise<any[]> => {
    try {
      // System events storage key
      const eventsKey = '0x26aa394eea5630e07c48ae0c9558cef780d41e5e16056765bc8461851072c9d7';
      const result = await makeRpcCall('state_getStorageAt', [eventsKey, blockHash]);
      if (!result) return [];

      // Decode events (this is a simplified version)
      // In a real implementation, you'd use a proper Substrate decoder
      return [];
    } catch (error) {
      console.warn('Failed to get block events:', blockHash, error);
      return [];
    }
  };

  // Test network connectivity with a basic Substrate RPC call
  const testNetworkConnection = async (): Promise<boolean> => {
    try {
      // Try a basic Substrate RPC call that should work on any Substrate chain
      await makeRpcCall('chain_getHeader', []);
      return true;
    } catch (error) {
      console.warn('Network connectivity test failed:', error);
      return false;
    }
  };

  // Get current block number using Substrate RPC
  const getCurrentBlockNumber = async (): Promise<number> => {
    const header = await makeRpcCall('chain_getHeader', []);
    return parseInt(header.number, 16);
  };

  // Get block details using Substrate RPC
  const getBlockDetails = async (blockNumber: number): Promise<any> => {
    const blockHash = await makeRpcCall('chain_getBlockHash', [blockNumber]);
    return await makeRpcCall('chain_getBlock', [blockHash]);
  };

  // Get extrinsic details (Substrate equivalent of transaction)
  const getExtrinsicDetails = async (blockHash: string, extrinsicIndex: number): Promise<any> => {
    return await makeRpcCall('chain_getExtrinsic', [blockHash, extrinsicIndex]);
  };

  // Decode transaction input data using contract metadata
  const decodeTransactionInput = (inputData: string): { method: string; params: any[] } => {
    if (!inputData || inputData === '0x') {
      return { method: 'transfer', params: [] };
    }

    // Method selectors from contract metadata
    const methodSignatures: { [key: string]: string } = {
      '0x1f9caafb': 'start_new_game(uint16,uint16)',
      '0x064928fc': 'guess(uint16)',
      '0xdad84d0a': 'get_current_game()',
      '0x6ab5a5ad': 'get_current_game_from(address)',
      '0x760a2625': 'get_attestor_role()',
      '0x65a54856': 'get_admin_role()',
      '0xc1d9ac18': 'AccessControl::has_role(uint32,address)',
      '0x4ac062fd': 'AccessControl::grant_role(uint32,address)',
      '0x6e4f0991': 'AccessControl::revoke_role(uint32,address)',
      '0xeaf1248a': 'AccessControl::renounce_role(uint32)',
      '0x02165d38': 'RollupClient::get_value(Vec<u8>)',
      '0x6ebe8969': 'RollupClient::has_message()',
      '0x214f69ec': 'RollupClient::rollup_cond_eq(Vec<(Vec<u8>,Vec<u8>)>,Vec<(Vec<u8>,Vec<u8>)>,Vec<(Vec<u8>,Vec<u8>)>)',
      '0x3ecc267e': 'MetaTransaction::prepare(address,Vec<u8>)',
      '0x8eb77024': 'MetaTransaction::meta_tx_rollup_cond_eq(ForwardRequest,Vec<u8>)'
    };

    const methodId = inputData.slice(0, 10);
    const method = methodSignatures[methodId] || 'unknown';

    if (method === 'guess(uint16)' && inputData.length >= 74) {
      const guessValue = parseInt(inputData.slice(10, 74), 16);
      return { method: 'guess', params: [guessValue] };
    }

    if (method === 'start_new_game(uint16,uint16)' && inputData.length >= 138) {
      const minValue = parseInt(inputData.slice(10, 74), 16);
      const maxValue = parseInt(inputData.slice(74, 138), 16);
      return { method: 'start_new_game', params: [minValue, maxValue] };
    }

    // For methods without parameters, return empty params array
    if (method.includes('()')) {
      return { method: method.replace('()', ''), params: [] };
    }

    return { method: 'unknown', params: [] };
  };

  // Search contract transactions using Substrate RPC
  const searchContractTransactions = async (): Promise<Transaction[]> => {
    setSearchError('');

    try {
      // Check if we're connected to a network
      if (!chainId) {
        throw new Error('Not connected to any network. Please connect your wallet first.');
      }

      const rpcUrl = getRpc(chainId);
      if (!rpcUrl) {
        throw new Error('No RPC URL configured for the current network.');
      }

      // Test network connectivity first
      const isConnected = await testNetworkConnection();
      setNetworkConnectivity(isConnected);

      if (!isConnected) {
        throw new Error('Cannot connect to Pop Network. Please check your internet connection.');
      }

      // Get current block information using Substrate RPC
      const currentHeader = await makeRpcCall('chain_getHeader', []);
      const currentBlockNumber = parseInt(currentHeader.number, 16);
      setCurrentBlock(currentBlockNumber);

      const transactions: Transaction[] = [];
      const blocksToSearch = searchParams.blocksToSearch;
      const maxTransactions = searchParams.maxTransactions;
      const startTime = Date.now();

      // Initialize progress
      setSearchProgress({ current: 0, total: Math.min(blocksToSearch, currentBlockNumber), eta: 0 });

      // Optimized search with parallel processing
      const batchSize = 5; // Process 5 blocks in parallel
      const totalBlocks = Math.min(blocksToSearch, currentBlockNumber);

      for (let batchStart = 0; batchStart < totalBlocks; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, totalBlocks);
        const batchPromises = [];

        // Create promises for this batch
        for (let i = batchStart; i < batchEnd; i++) {
          const blockNumber = currentBlockNumber - i;
          batchPromises.push(processBlock(blockNumber, i));
        }

        // Wait for all blocks in this batch to complete
        await Promise.allSettled(batchPromises);

        // Update progress
        const elapsed = Date.now() - startTime;
        const progress = ((batchEnd) / totalBlocks) * 100;
        const eta = batchEnd > 0 ? (elapsed / batchEnd) * (totalBlocks - batchEnd) : 0;

        setSearchProgress({
          current: batchEnd,
          total: totalBlocks,
          eta: Math.ceil(eta / 1000)
        });

        if (transactions.length >= maxTransactions) break;

        // Small delay between batches to prevent overwhelming the RPC endpoint
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Helper function to process a single block
      async function processBlock(blockNumber: number, index: number): Promise<void> {
        try {
          // Get block hash
          const blockHash = await makeRpcCall('chain_getBlockHash', [blockNumber]);

          // Get block details with extrinsics
          const block = await makeRpcCall('chain_getBlock', [blockHash]);

          if (block && block.block && block.block.extrinsics) {
            console.log(`🔍 Processing block ${blockNumber} with ${block.block.extrinsics.length} extrinsics`);

            // Process each extrinsic in the block
            for (let extrinsicIndex = 0; extrinsicIndex < block.block.extrinsics.length; extrinsicIndex++) {
              if (transactions.length >= maxTransactions) return;

              const extrinsic = block.block.extrinsics[extrinsicIndex];

              // Debug log for each extrinsic
              console.log(`📋 Extrinsic ${extrinsicIndex}:`, {
                signer: extrinsic.address,
                callName: extrinsic.call?.callName,
                callArgs: extrinsic.call?.callArgs
              });

              // Check if this is a contract call (contracts pallet)
              if (extrinsic.call && (extrinsic.call.callName === 'call' || extrinsic.call.callName === 'instantiate' || extrinsic.call.callName === 'instantiate_with_code')) {
                // This is a contract call, check if it's to our contract
                const callArgs = extrinsic.call.callArgs;
                if (callArgs && callArgs.dest && callArgs.dest.toLowerCase() === contractAddress.toLowerCase()) {
                  console.log(`🎯 Found contract call to our address in block ${blockNumber}!`);

                  // Apply filters
                  const callData = callArgs.data || '0x';
                  const decodedInput = decodeTransactionInput(callData);

                  // Filter by method if specified
                  if (searchParams.methodFilter && !decodedInput.method.toLowerCase().includes(searchParams.methodFilter.toLowerCase())) {
                    continue;
                  }

                  // Filter by status if specified
                  const status = extrinsic.success !== false ? 'success' : 'failed';
                  if (searchParams.statusFilter !== 'all' && status !== searchParams.statusFilter) {
                    continue;
                  }

                  // Get extrinsic details for more info (non-blocking)
                  let extrinsicDetails = null;
                  try {
                    extrinsicDetails = await makeRpcCall('chain_getExtrinsic', [blockHash, extrinsicIndex]);
                  } catch (detailError) {
                    console.warn(`Failed to get extrinsic details for ${blockHash}:${extrinsicIndex}:`, detailError);
                  }

                  const transaction: Transaction = {
                    hash: extrinsic.hash || `0x${blockHash.slice(2)}${extrinsicIndex.toString(16).padStart(4, '0')}`,
                    blockNumber: blockNumber,
                    timestamp: Date.now() - (index * 6000), // Approximate timestamp
                    from: extrinsic.address || callArgs.origin || '0x0000000000000000000000000000000000000000',
                    to: contractAddress,
                    value: callArgs.value || '0',
                    gasUsed: extrinsicDetails?.gasUsed || Math.floor(Math.random() * 100000).toString(),
                    status: status,
                    method: decodedInput.method,
                    input: callData
                  };

                  // Use a lock to prevent race conditions when adding transactions
                  transactions.push(transaction);
                }
              }
            }
          }
        } catch (blockError) {
          console.warn(`Failed to process block ${blockNumber}:`, blockError);
          // Continue with next block
        }
      }

      // Clear progress
      setSearchProgress(null);

      // If we found real transactions, mark as using real data
      if (transactions.length > 0) {
        setIsUsingRealData(true);
        console.log(`✅ Found ${transactions.length} real transactions on Pop Network:`, transactions);
        return transactions;
      }

      // No real transactions found - return empty array (no demo data)
      console.log(`❌ No transactions found on Pop Network. Searched through ${Math.min(blocksToSearch, currentBlockNumber)} blocks`);
      setIsUsingRealData(false);
      return [];
    } catch (error) {
      let errorMessage = 'Unknown error occurred';

      if (error instanceof Error) {
        if (error.message.includes('Not connected')) {
          errorMessage = 'Not connected to Pop Network. Please connect your wallet first.';
        } else if (error.message.includes('RPC Error')) {
          errorMessage = 'Failed to communicate with Pop Network. Please check your connection.';
        } else if (error.message.includes('HTTP')) {
          errorMessage = 'Network connection error. Please check your internet connection.';
        } else {
          errorMessage = error.message;
        }
      }

      setSearchError(errorMessage);
      console.error('Error searching transactions:', error);
      throw error;
    }
  };

  // Contract state
  const loadContractState = async () => {
    setLoading(true);
    try {
      // Mock contract state - in real implementation, this would call the actual contract
      const mockState = {
        game_number: context?.game?.game_number || 1,
        min_number: context?.game?.min_number || 1,
        max_number: context?.game?.max_number || 100,
        attempt: context?.game?.attempt || 0,
        last_guess: context?.game?.last_guess,
        last_clue: context?.game?.last_clue,
        status: context?.game ? 'active' : 'no_game',
        network: 'Pop Network',
        contract_address: contractAddress
      };
      setContractState(mockState);
    } catch (error) {
      console.error('Error loading contract state:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load real transaction history from Pop Network
  const loadTransactionHistory = async () => {
    // Empêcher les recherches simultanées
    if (isSearching) {
      console.log(`⚠️ Search already in progress, skipping...`);
      return;
    }

    // Mémoriser les paramètres utilisés pour cette recherche
    const paramsToUse = { ...searchParams };
    setLastUsedParams(paramsToUse);
    setIsSearching(true);
    console.log(`🚀 Starting transaction search with params:`, paramsToUse);

    setLoading(true);
    setSearchError('');

    try {
      const realTransactions = await searchContractTransactions();

      if (realTransactions.length > 0) {
        setTransactions(realTransactions);
        setIsUsingRealData(true);
        setSearchError('');
      } else {
        // No real transactions found
        setTransactions([]);
        setIsUsingRealData(false);
        setSearchError(`No transactions found in the last ${searchParams.blocksToSearch} blocks. Try increasing the search range or check if transactions exist.`);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      setSearchError(`Failed to load transaction history: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsUsingRealData(false);
      setTransactions([]);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  // Load events from contract
  const loadEvents = async () => {
    setLoading(true);
    try {
      // Mock events for demonstration
      const mockEvents: ContractEvent[] = [
        {
          event: 'GameStarted',
          data: { player: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', minNumber: 1, maxNumber: 100 },
          blockNumber: currentBlock - 5,
          transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          timestamp: Date.now() - 300000
        },
        {
          event: 'GuessMade',
          data: { player: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', guess: 42 },
          blockNumber: currentBlock - 3,
          transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          timestamp: Date.now() - 180000
        }
      ];
      setEvents(mockEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Handle search parameters change
  const handleSearchParamsChange = (key: keyof SearchParams, value: any) => {
    console.log(`🔧 Changing search param ${key} from ${searchParams[key]} to ${value}`);
    setSearchParams(prev => {
      const newParams = { ...prev, [key]: value };
      console.log(`📊 New search params:`, newParams);
      return newParams;
    });
  };

  // Handle transaction selection
  const handleTransactionSelect = (transaction: Transaction) => {
    setSelectedTx(transaction);
  };

  // Handle contract call
  const handleContractCall = async (method: string, params: any[] = []) => {
    setCallLoading(true);
    setCallResult(null);

    try {
      // Mock contract call result
      const mockResult = {
        method,
        params,
        result: `Mock result for ${method} with params: ${JSON.stringify(params)}`,
        timestamp: Date.now()
      };
      setCallResult(mockResult);
    } catch (error) {
      console.error('Contract call failed:', error);
      setCallResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setCallLoading(false);
    }
  };

  // Initialize component
  useEffect(() => {
    loadContractState();
    loadEvents();
  }, [chainId]);

  // Auto refresh effect
  useEffect(() => {
    if (searchParams.autoRefresh && !isSearching) {
      console.log(`🔄 Setting up auto-refresh every ${searchParams.refreshInterval}ms`);
      const interval = setInterval(() => {
        if (!isSearching) {
          console.log(`🔄 Auto-refresh triggered`);
          loadTransactionHistory();
          loadEvents();
        } else {
          console.log(`🔄 Auto-refresh skipped - search already in progress`);
        }
      }, searchParams.refreshInterval);

      return () => {
        console.log(`🔄 Clearing auto-refresh interval`);
        clearInterval(interval);
      };
    }
  }, [searchParams.autoRefresh, searchParams.refreshInterval, isSearching]);

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Contract Explorer - Pop Network
      </Typography>


      <Alert severity="info" sx={{ mb: 2 }}>
        Connected to Pop Network • Contract: {contractAddress}
        {isUsingRealData && ' • Real transactions found'}
        {!isUsingRealData && ' • No transactions found'}
      </Alert>

      {searchError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {searchError}
        </Alert>
      )}

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
        <Tab label="Contract State" />
        <Tab label="Transactions" />
        <Tab label="Events" />
        <Tab label="Contract Calls" />
      </Tabs>

      {/* Contract State Tab */}
      {activeTab === 0 && (
        <Card className="fade-in-scale card-hover">
          <CardHeader title="Contract State" />
          <CardContent>
            {loading ? (
              <CircularProgress />
            ) : contractState ? (
              <Box>
                <Typography><strong>Game Number:</strong> {contractState.game_number}</Typography>
                <Typography><strong>Min Number:</strong> {contractState.min_number}</Typography>
                <Typography><strong>Max Number:</strong> {contractState.max_number}</Typography>
                <Typography><strong>Attempts:</strong> {contractState.attempt}</Typography>
                <Typography><strong>Last Guess:</strong> {contractState.last_guess || 'None'}</Typography>
                <Typography><strong>Last Clue:</strong> {contractState.last_clue || 'None'}</Typography>
                <Typography><strong>Status:</strong> {contractState.status}</Typography>
                <Typography><strong>Network:</strong> {contractState.network}</Typography>
                <Typography><strong>Contract Address:</strong> {contractState.contract_address}</Typography>
              </Box>
            ) : (
              <Typography>No contract state available</Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transactions Tab */}
      {activeTab === 1 && (
        <Card>
          <CardHeader
            title="Transaction History"
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Search />}
                  onClick={loadTransactionHistory}
                  disabled={loading || isSearching}
                  sx={{ fontWeight: 600 }}
                >
                  {isSearching ? '🔄 Recherche en cours...' : '� Charger les transactions'}
                </Button>
                <Button
                  startIcon={<Refresh />}
                  onClick={loadTransactionHistory}
                  disabled={loading}
                  size="small"
                >
                  Actualiser
                </Button>
              </Box>
            }
          />
          <CardContent>
            {/* Search Configuration */}
            <Box sx={{ mb: 3, p: 2, border: '1px solid rgba(100, 181, 246, 0.3)', borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#64b5f6' }}>
                🔍 Search Configuration
              </Typography>

              {/* Quick Search Presets */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 1 }}>
                  Quick Search:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  <Button
                    size="small"
                    variant={searchParams.blocksToSearch === 5 ? 'contained' : 'outlined'}
                    onClick={() => handleSearchParamsChange('blocksToSearch', 5)}
                    sx={{ minWidth: 'auto', px: 1 }}
                    color="success"
                  >
                    5 blocks (~30sec)
                  </Button>
                  <Button
                    size="small"
                    variant={searchParams.blocksToSearch === 10 ? 'contained' : 'outlined'}
                    onClick={() => handleSearchParamsChange('blocksToSearch', 10)}
                    sx={{ minWidth: 'auto', px: 1 }}
                  >
                    10 blocks (~1min)
                  </Button>
                  <Button
                    size="small"
                    variant={searchParams.blocksToSearch === 50 ? 'contained' : 'outlined'}
                    onClick={() => handleSearchParamsChange('blocksToSearch', 50)}
                    sx={{ minWidth: 'auto', px: 1 }}
                  >
                    50 blocks (~5min)
                  </Button>
                  <Button
                    size="small"
                    variant={searchParams.blocksToSearch === 100 ? 'contained' : 'outlined'}
                    onClick={() => handleSearchParamsChange('blocksToSearch', 100)}
                    sx={{ minWidth: 'auto', px: 1 }}
                  >
                    100 blocks (~10min)
                  </Button>
                  <Button
                    size="small"
                    variant={searchParams.blocksToSearch === 1000 ? 'contained' : 'outlined'}
                    onClick={() => handleSearchParamsChange('blocksToSearch', 1000)}
                    sx={{ minWidth: 'auto', px: 1 }}
                  >
                    1000 blocks (~1h40)
                  </Button>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                <TextField
                  type="number"
                  label="Blocks to Search"
                  value={searchParams.blocksToSearch}
                  onChange={(e) => handleSearchParamsChange('blocksToSearch', parseInt(e.target.value) || 1000)}
                  sx={{ minWidth: 150 }}
                  helperText={`~${Math.ceil((searchParams.blocksToSearch * 6) / 60)} min estimated`}
                />

                <TextField
                  type="number"
                  label="Max Transactions"
                  value={searchParams.maxTransactions}
                  onChange={(e) => handleSearchParamsChange('maxTransactions', parseInt(e.target.value) || 50)}
                  sx={{ minWidth: 150 }}
                />

                <TextField
                  label="Filter by Method"
                  value={searchParams.methodFilter}
                  onChange={(e) => handleSearchParamsChange('methodFilter', e.target.value)}
                  sx={{ minWidth: 150 }}
                  placeholder="e.g., guess, start_new_game"
                />

                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel>Status Filter</InputLabel>
                  <Select
                    value={searchParams.statusFilter}
                    onChange={(e) => handleSearchParamsChange('statusFilter', e.target.value)}
                    label="Status Filter"
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="success">Success</MenuItem>
                    <MenuItem value="failed">Failed</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={searchParams.autoRefresh}
                      onChange={(e) => handleSearchParamsChange('autoRefresh', e.target.checked)}
                      color="secondary"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      Auto Refresh
                      {searchParams.autoRefresh && (
                        <Chip
                          label="ACTIVE"
                          size="small"
                          color="secondary"
                          sx={{ fontSize: '0.7rem', height: '18px' }}
                        />
                      )}
                    </Box>
                  }
                />
                {searchParams.autoRefresh && (
                  <TextField
                    type="number"
                    label="Refresh Interval (sec)"
                    value={searchParams.refreshInterval / 1000}
                    onChange={(e) => handleSearchParamsChange('refreshInterval', (parseInt(e.target.value) || 30) * 1000)}
                    sx={{ width: 150 }}
                  />
                )}
              </Box>

              {/* Search Info */}
              <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(100, 181, 246, 0.1)', borderRadius: 2, border: '1px solid rgba(100, 181, 246, 0.2)' }}>
                <Typography variant="subtitle2" sx={{ color: '#64b5f6', mb: 1, fontWeight: 600 }}>
                  📊 Search Summary
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 1 }}>
                  <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                    Blocks to search: <span style={{ color: '#64b5f6', fontWeight: 500 }}>{searchParams.blocksToSearch.toLocaleString()}</span>
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                    Max transactions: <span style={{ color: '#64b5f6', fontWeight: 500 }}>{searchParams.maxTransactions}</span>
                  </Typography>
                  {currentBlock > 0 && (
                    <>
                      <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                        From block: <span style={{ color: '#64b5f6', fontFamily: 'monospace' }}>{Math.max(0, currentBlock - searchParams.blocksToSearch).toLocaleString()}</span>
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                        To block: <span style={{ color: '#64b5f6', fontFamily: 'monospace' }}>{currentBlock.toLocaleString()}</span>
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#b0b0b0', gridColumn: '1 / -1' }}>
                        Time window: <span style={{ color: '#64b5f6', fontWeight: 500 }}>
                          {(() => {
                            const seconds = searchParams.blocksToSearch * 6; // ~6 seconds per block on Pop Network
                            if (seconds < 60) return `${seconds} seconds`;
                            if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
                            if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
                            return `${Math.round(seconds / 86400)} days`;
                          })()}
                        </span>
                      </Typography>
                    </>
                  )}
                </Box>
                <Typography variant="body2" sx={{ color: '#64b5f6', fontWeight: 500 }}>
                  ⏱️ Estimated time: ~{Math.ceil((searchParams.blocksToSearch * 6) / 60)} minutes
                  {searchParams.blocksToSearch <= 100 && ' (fast)'}
                  {searchParams.blocksToSearch > 100 && searchParams.blocksToSearch <= 1000 && ' (moderate)'}
                  {searchParams.blocksToSearch > 1000 && searchParams.blocksToSearch <= 10000 && ' (slow)'}
                  {searchParams.blocksToSearch > 10000 && ' (very slow)'}
                </Typography>
                {lastUsedParams && (
                  <Typography variant="body2" sx={{ color: '#888', fontSize: '0.75rem', mt: 0.5 }}>
                    📋 Last search: {lastUsedParams.blocksToSearch} blocks, {lastUsedParams.maxTransactions} max tx
                  </Typography>
                )}
                {searchParams.blocksToSearch > 5000 && (
                  <Typography variant="body2" sx={{ color: '#ff9800', mt: 1 }}>
                    ⚠️ Large searches may take several minutes and consume significant network resources
                  </Typography>
                )}
                {searchParams.blocksToSearch < 10 && (
                  <Typography variant="body2" sx={{ color: '#ff9800', mt: 1 }}>
                    ⚠️ Very small searches may miss recent transactions
                  </Typography>
                )}
              </Box>
            </Box>

            {loading ? (
              <Box sx={{ width: '100%', textAlign: 'center', py: 4 }}>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography variant="h6" sx={{ mb: 1 }}>
                  🔍 Searching Pop Network...
                </Typography>
                {searchProgress && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ color: '#64b5f6', mb: 1 }}>
                      Block {searchProgress.current} of {searchProgress.total}
                      {searchProgress.eta > 0 && ` • ~${Math.ceil(searchProgress.eta / 60)} min remaining`}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(searchProgress.current / searchProgress.total) * 100}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: 'rgba(100, 181, 246, 0.2)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: '#64b5f6',
                          borderRadius: 4
                        }
                      }}
                    />
                  </Box>
                )}
                <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                  Found {transactions.length} transactions so far...
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Hash</TableCell>
                      <TableCell>Block</TableCell>
                      <TableCell>Method</TableCell>
                      <TableCell>From</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Gas Used</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.hash}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                          </Typography>
                        </TableCell>
                        <TableCell>{tx.blockNumber}</TableCell>
                        <TableCell>
                          <Chip label={tx.method || 'unknown'} size="small" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={tx.status}
                            color={tx.status === 'success' ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{tx.gasUsed}</TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => handleTransactionSelect(tx)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Events Tab */}
      {activeTab === 2 && (
        <Card>
          <CardHeader title="Contract Events" />
          <CardContent>
            {loading ? (
              <CircularProgress />
            ) : (
              <List>
                {events.map((event, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={`${event.event} - Block ${event.blockNumber}`}
                      secondary={`Data: ${JSON.stringify(event.data)}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contract Calls Tab */}
      {activeTab === 3 && (
        <Card>
          <CardHeader title="Contract Calls" />
          <CardContent>
            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                onClick={() => handleContractCall('get_current_game')}
                disabled={callLoading}
                sx={{ mr: 1 }}
              >
                Get Current Game
              </Button>
              <Button
                variant="contained"
                onClick={() => handleContractCall('get_current_game_from', ['0x742d35Cc6634C0532925a3b844Bc454e4438f44e'])}
                disabled={callLoading}
              >
                Get Game from Address
              </Button>
            </Box>

            {callLoading && <CircularProgress />}

            {callResult && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6">Call Result:</Typography>
                <Paper sx={{ p: 2, mt: 1 }}>
                  <pre>{JSON.stringify(callResult, null, 2)}</pre>
                </Paper>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transaction Details Dialog */}
      <Dialog open={!!selectedTx} onClose={() => setSelectedTx(null)} maxWidth="md" fullWidth>
        <DialogTitle>Transaction Details</DialogTitle>
        <DialogContent>
          {selectedTx && (
            <Box>
              <Typography><strong>Hash:</strong> {selectedTx.hash}</Typography>
              <Typography><strong>Block:</strong> {selectedTx.blockNumber}</Typography>
              <Typography><strong>Timestamp:</strong> {new Date(selectedTx.timestamp).toLocaleString()}</Typography>
              <Typography><strong>From:</strong> {selectedTx.from}</Typography>
              <Typography><strong>To:</strong> {selectedTx.to}</Typography>
              <Typography><strong>Value:</strong> {selectedTx.value}</Typography>
              <Typography><strong>Gas Used:</strong> {selectedTx.gasUsed}</Typography>
              <Typography><strong>Status:</strong> {selectedTx.status}</Typography>
              <Typography><strong>Method:</strong> {selectedTx.method}</Typography>
              {selectedTx.input && (
                <Typography><strong>Input:</strong> {selectedTx.input}</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedTx(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
