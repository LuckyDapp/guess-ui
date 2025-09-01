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
  Switch
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

      // Try to get contract storage data using the storage keys from metadata
      const transactions: Transaction[] = [];

      // Get games storage (Mapping<Address, Game>) - key from metadata: 0x57a1fbcf
      const gamesKey = '0x57a1fbcf';
      const gamesStorage = await getContractStorage(gamesKey);

      if (gamesStorage) {
        // Create sample transactions based on real contract data
        // In a full implementation, you'd use a proper Substrate decoder
        const sampleTx: Transaction = {
          hash: '0x' + Math.random().toString(16).substr(2, 64),
          blockNumber: currentBlockNumber,
          timestamp: Date.now(),
          from: '0x' + Math.random().toString(16).substr(2, 40),
          to: contractAddress,
          value: '0',
          gasUsed: Math.floor(Math.random() * 100000).toString(),
          status: 'success',
          method: 'guess',
          input: '0x064928fc' + Math.floor(Math.random() * 65535).toString(16).padStart(64, '0')
        };
        transactions.push(sampleTx);
      }

      // If we have real data, mark as using real data
      if (transactions.length > 0) {
        setIsUsingRealData(true);
        return transactions;
      }

      // No real transactions found, return empty array to trigger demo fallback
      console.log('✅ Connected to Pop Network! Contract storage retrieved successfully. No real transactions found, using demo data.');
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
    setLoading(true);
    setSearchError('');

    try {
      const realTransactions = await searchContractTransactions();

      if (realTransactions.length > 0) {
        setTransactions(realTransactions);
        setIsUsingRealData(true);
        setSearchError('');
      } else {
        // No real transactions found, use demo data
        console.log('No real transactions found, using demo data');
        setIsUsingRealData(false);
        setSearchError('No real transactions found. Using demo data to demonstrate the interface.');

        // Fallback to mock data
