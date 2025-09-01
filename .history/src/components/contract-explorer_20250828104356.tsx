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
  Tune
} from '@mui/icons-material';
import { useChainId } from '@reactive-dot/react';
import { gtnContract } from '../config';
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

  const chainId = useChainId();
  const contractAddress = '0xD6Ad3e67e2514bED804acc45945A7a102C4c6Ae4';
  const context = useContext(GameContext);
  const POP_RPC_URL = 'wss://rpc1.paseo.popnetwork.xyz';

  // RPC Call helper
  const makeRpcCall = async (method: string, params: any[] = []): Promise<any> => {
    try {
      const response = await fetch('https://api.paseo.popnetwork.xyz', {
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

  // Get current block number
  const getCurrentBlockNumber = async (): Promise<number> => {
    const blockNumberHex = await makeRpcCall('eth_blockNumber');
    return parseInt(blockNumberHex, 16);
  };

  // Get block with transactions
  const getBlockWithTransactions = async (blockNumber: number): Promise<any> => {
    const blockHex = `0x${blockNumber.toString(16)}`;
    return await makeRpcCall('eth_getBlockByNumber', [blockHex, true]);
  };

  // Get transaction receipt
  const getTransactionReceipt = async (txHash: string): Promise<any> => {
    return await makeRpcCall('eth_getTransactionReceipt', [txHash]);
  };

  // Decode transaction input data
  const decodeTransactionInput = (inputData: string): { method: string; params: any[] } => {
    if (!inputData || inputData === '0x') {
      return { method: 'transfer', params: [] };
    }

    // Simple decoding for Guess the Number contract
    const methodSignatures: { [key: string]: string } = {
      '0x4e71d92d': 'guess(uint256)',
      '0x83f12fec': 'start_new_game(uint256,uint256)'
    };

    const methodId = inputData.slice(0, 10);
    const method = methodSignatures[methodId] || 'unknown';

    if (method === 'guess(uint256)' && inputData.length >= 74) {
      const guessValue = parseInt(inputData.slice(10, 74), 16);
      return { method: 'guess', params: [guessValue] };
    }

    if (method === 'start_new_game(uint256,uint256)' && inputData.length >= 138) {
      const minValue = parseInt(inputData.slice(10, 74), 16);
      const maxValue = parseInt(inputData.slice(74, 138), 16);
      return { method: 'start_new_game', params: [minValue, maxValue] };
    }

    return { method: 'unknown', params: [] };
  };

  // Search contract transactions
  const searchContractTransactions = async (): Promise<Transaction[]> => {
    setSearchError('');

    try {
      const latestBlock = await getCurrentBlockNumber();
      setCurrentBlock(latestBlock);

      const fromBlock = Math.max(0, latestBlock - searchParams.blocksToSearch);
      const transactions: Transaction[] = [];

      // Search through blocks
      for (let blockNumber = latestBlock; blockNumber >= fromBlock && transactions.length < searchParams.maxTransactions; blockNumber--) {
        try {
          const block = await getBlockWithTransactions(blockNumber);

          if (!block || !block.transactions) continue;

          // Filter transactions to our contract
          const contractTxs = block.transactions.filter((tx: any) =>
            tx.to && tx.to.toLowerCase() === contractAddress.toLowerCase()
          );

          for (const tx of contractTxs) {
            if (transactions.length >= searchParams.maxTransactions) break;

            try {
              const receipt = await getTransactionReceipt(tx.hash);
              const decodedInput = decodeTransactionInput(tx.input);

              // Apply filters
              if (searchParams.methodFilter && decodedInput.method !== searchParams.methodFilter) {
                continue;
              }

              const status = receipt && receipt.status === '0x1' ? 'success' : 'failed';

              if (searchParams.statusFilter !== 'all' && status !== searchParams.statusFilter) {
                continue;
              }

              const transaction: Transaction = {
                hash: tx.hash,
                blockNumber: parseInt(tx.blockNumber, 16),
                timestamp: parseInt(block.timestamp, 16) * 1000,
                from: tx.from,
                to: tx.to,
                value: tx.value,
                gasUsed: receipt ? parseInt(receipt.gasUsed, 16).toString() : '0',
                status,
                method: decodedInput.method,
                input: tx.input
              };

              transactions.push(transaction);
            } catch (error) {
              console.warn('Error processing transaction:', tx.hash, error);
            }
          }
        } catch (error) {
          console.warn('Error processing block:', blockNumber, error);
        }
      }

      return transactions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
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
      setTransactions(realTransactions);

      if (realTransactions.length === 0) {
        setSearchError('No transactions found for the specified parameters. Try increasing the number of blocks to search.');
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      setSearchError('Failed to load transactions. Please check your connection and try again.');

      // Fallback to mock data if real search fails
      const mockTransactions: Transaction[] = [
        {
          hash: '0x1234567890abcdef1234567890abcdef12345678',
          blockNumber: 1234567,
          timestamp: Date.now() - 3600000,
          from: '0xuser1234567890123456789012345678901234567890',
          to: contractAddress,
          value: '0',
          gasUsed: '21000',
          status: 'success',
          method: 'guess',
          input: '000000000000000000000000000000000000000000000000000000000000003c'
        },
        {
          hash: '0xabcdef1234567890abcdef1234567890abcdef1234',
          blockNumber: 1234566,
          timestamp: Date.now() - 7200000,
          from: '0xuser2234567890123456789012345678901234567890',
          to: contractAddress,
          value: '0',
          gasUsed: '25000',
          status: 'success',
          method: 'start_new_game',
          input: '000000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000000000000000000000000000000000000000064'
        }
      ];
      setTransactions(mockTransactions);
    } finally {
      setLoading(false);
    }
  };

  // Load real events from Pop Network
  const loadEvents = async () => {
    setLoading(true);
    try {
      const latestBlock = currentBlock || await getCurrentBlockNumber();
      const fromBlock = Math.max(0, latestBlock - searchParams.blocksToSearch);
      const events: ContractEvent[] = [];

      // Search for logs in blocks
      for (let blockNumber = latestBlock; blockNumber >= fromBlock && events.length < 20; blockNumber--) {
        try {
          const logs = await makeRpcCall('eth_getLogs', [{
            fromBlock: `0x${blockNumber.toString(16)}`,
            toBlock: `0x${blockNumber.toString(16)}`,
            address: contractAddress
          }]);

          if (logs && logs.length > 0) {
            for (const log of logs) {
              if (events.length >= 20) break;

              // Decode event based on topics
              const event = decodeEventLog(log);
              if (event) {
                events.push({
                  event: event.name,
                  data: event.data,
                  blockNumber: parseInt(log.blockNumber, 16),
                  transactionHash: log.transactionHash,
                  timestamp: Date.now() - (latestBlock - parseInt(log.blockNumber, 16)) * 10000 // Approximate
                });
              }
            }
          }
        } catch (error) {
          console.warn('Error processing block for events:', blockNumber, error);
        }
      }

      setEvents(events);

      if (events.length === 0) {
        // Fallback to mock events if no real events found
        const mockEvents: ContractEvent[] = [
          {
            event: 'GameStarted',
            data: {
              gameNumber: 1,
              minNumber: 1,
              maxNumber: 100,
              player: '0xuser1234567890123456789012345678901234567890'
            },
            blockNumber: 1234566,
            transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234',
            timestamp: Date.now() - 7200000
          },
          {
            event: 'GuessSubmitted',
            data: {
              gameNumber: 1,
              attemptNumber: 1,
              guess: 50,
              player: '0xuser1234567890123456789012345678901234567890'
            },
            blockNumber: 1234567,
            transactionHash: '0x1234567890abcdef1234567890abcdef12345678',
            timestamp: Date.now() - 3600000
          },
          {
            event: 'GuessResult',
            data: {
              gameNumber: 1,
              attemptNumber: 1,
              guess: 50,
              result: 'Less',
              player: '0xuser1234567890123456789012345678901234567890'
            },
            blockNumber: 1234568,
            transactionHash: '0x567890abcdef1234567890abcdef1234567890ab',
            timestamp: Date.now() - 1800000
          }
        ];
        setEvents(mockEvents);
      }
    } catch (error) {
      console.error('Error loading events:', error);

      // Fallback to mock events
      const mockEvents: ContractEvent[] = [
        {
          event: 'GameStarted',
          data: {
            gameNumber: 1,
            minNumber: 1,
            maxNumber: 100,
            player: '0xuser1234567890123456789012345678901234567890'
          },
          blockNumber: 1234566,
          transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234',
          timestamp: Date.now() - 7200000
        },
        {
          event: 'GuessSubmitted',
          data: {
            gameNumber: 1,
            attemptNumber: 1,
            guess: 50,
            player: '0xuser1234567890123456789012345678901234567890'
          },
          blockNumber: 1234567,
          transactionHash: '0x1234567890abcdef1234567890abcdef12345678',
          timestamp: Date.now() - 3600000
        },
        {
          event: 'GuessResult',
          data: {
            gameNumber: 1,
            attemptNumber: 1,
            guess: 50,
            result: 'Less',
            player: '0xuser1234567890123456789012345678901234567890'
          },
          blockNumber: 1234568,
          transactionHash: '0x567890abcdef1234567890abcdef1234567890ab',
          timestamp: Date.now() - 1800000
        }
      ];
      setEvents(mockEvents);
    } finally {
      setLoading(false);
    }
  };

  // Decode event log
  const decodeEventLog = (log: any): { name: string; data: any } | null => {
    if (!log.topics || log.topics.length === 0) return null;

    const eventSignatures: { [key: string]: string } = {
      '0x83f12fec': 'GameStarted(uint256,uint256,uint256,address)',
      '0x4e71d92d': 'GuessSubmitted(uint256,uint256,uint256,address)',
      '0x12345678': 'GuessResult(uint256,uint256,uint256,uint8,address)'
    };

    const eventId = log.topics[0];
    const eventSignature = eventSignatures[eventId];

    if (!eventSignature) return null;

    // Simple decoding (in production, use a proper decoder)
    const eventName = eventSignature.split('(')[0];

    return {
      name: eventName,
      data: {
        raw: log.data,
        topics: log.topics
      }
    };
  };

  // Call contract function
  const callContractFunction = async (functionName: string, params: any[] = []) => {
    setCallLoading(true);
    try {
      let result;
      switch (functionName) {
        case 'getCurrentGame':
          // Mock implementation - in real app, this would call the actual contract
          result = {
            game_number: context?.game?.game_number || 1,
            min_number: context?.game?.min_number || 1,
            max_number: context?.game?.max_number || 100,
            attempt: context?.game?.attempt || 0,
            last_guess: context?.game?.last_guess,
            last_clue: context?.game?.last_clue
          };
          break;
        default:
          result = 'Function not implemented in mock';
      }
      setCallResult({ function: functionName, params, result });
    } catch (error) {
      setCallResult({ function: functionName, params, error: error instanceof Error ? error.message : String(error) });
    } finally {
      setCallLoading(false);
    }
  };

  useEffect(() => {
    loadContractState();
    loadTransactionHistory();
    loadEvents();
  }, []);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    return status === 'success' ? '#4caf50' : '#f44336';
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #101010 0%, #1a1a1a 50%, #101010 100%)',
      p: 3
    }}>
      <Box sx={{ maxWidth: '1400px', mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="h3"
            sx={{
              color: '#64b5f6',
              fontWeight: 700,
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2
            }}
          >
            <AccountBalance sx={{ fontSize: '2rem' }} />
            Pop Network Contract Explorer
          </Typography>
          <Typography variant="body1" sx={{ color: '#b0b0b0', mb: 2 }}>
            Explore your Guess the Number smart contract
          </Typography>
          <Chip
            label={`Contract: ${formatAddress(contractAddress)}`}
            sx={{
              backgroundColor: 'rgba(100, 181, 246, 0.1)',
              color: '#64b5f6',
              border: '1px solid #64b5f6'
            }}
          />
        </Box>

        {/* Tabs */}
        <Paper sx={{ mb: 3, background: 'rgba(25, 27, 31, 0.95)' }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{
              '& .MuiTab-root': { color: '#b0b0b0' },
              '& .MuiTab-root.Mui-selected': { color: '#64b5f6' },
              '& .MuiTabs-indicator': { backgroundColor: '#64b5f6' }
            }}
          >
            <Tab label="Contract State" />
            <Tab label="Transactions" />
            <Tab label="Events" />
            <Tab label="Function Calls" />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        {activeTab === 0 && (
          <Card sx={{
            background: 'rgba(25, 27, 31, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Code />
                  <Typography variant="h6" sx={{ color: 'white' }}>
                    Contract State
                  </Typography>
                </Box>
              }
              action={
                <Button
                  onClick={loadContractState}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
                  sx={{ color: '#64b5f6' }}
                >
                  Refresh
                </Button>
              }
            />
            <CardContent>
              {loading ? (
                <BlockchainLoader message="Loading contract state..." />
              ) : contractState ? (
                <Box sx={{
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  p: 3,
                  borderRadius: '8px',
                  fontFamily: 'monospace'
                }}>
                  <pre style={{ color: '#e0e0e0', margin: 0 }}>
                    {JSON.stringify(contractState, null, 2)}
                  </pre>
                </Box>
              ) : (
                <Alert severity="info">
                  Unable to load contract state. Make sure you're connected to Pop Network.
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 1 && (
          <Card sx={{
            background: 'rgba(25, 27, 31, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <History />
                  <Typography variant="h6" sx={{ color: 'white' }}>
                    Transaction History
                  </Typography>
                </Box>
              }
              action={
                <Button
                  onClick={loadTransactionHistory}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
                  sx={{ color: '#64b5f6' }}
                >
                  Refresh
                </Button>
              }
            />

            {/* Search Parameters */}
            <CardContent sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Tune sx={{ color: '#64b5f6' }} />
                <Typography variant="subtitle1" sx={{ color: 'white' }}>
                  Search Parameters
                </Typography>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                {/* Blocks to search */}
                <Box>
                  <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 1 }}>
                    Blocks to Search: {searchParams.blocksToSearch}
                  </Typography>
                  <Slider
                    value={searchParams.blocksToSearch}
                    onChange={(_, value) => setSearchParams(prev => ({ ...prev, blocksToSearch: value as number }))}
                    min={100}
                    max={10000}
                    step={100}
                    sx={{
                      color: '#64b5f6',
                      '& .MuiSlider-thumb': {
                        backgroundColor: '#64b5f6'
                      }
                    }}
                  />
                  <Typography variant="caption" sx={{ color: '#888' }}>
                    ~{Math.round(searchParams.blocksToSearch / 10)} minutes of history
                  </Typography>
                </Box>

                {/* Max transactions */}
                <Box>
                  <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 1 }}>
                    Max Transactions: {searchParams.maxTransactions}
                  </Typography>
                  <Slider
                    value={searchParams.maxTransactions}
                    onChange={(_, value) => setSearchParams(prev => ({ ...prev, maxTransactions: value as number }))}
                    min={10}
                    max={200}
                    step={10}
                    sx={{
                      color: '#64b5f6',
                      '& .MuiSlider-thumb': {
                        backgroundColor: '#64b5f6'
                      }
                    }}
                  />
                </Box>

                {/* Filters */}
                <Box>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel sx={{ color: '#b0b0b0' }}>Method Filter</InputLabel>
                    <Select
                      value={searchParams.methodFilter}
                      onChange={(e) => setSearchParams(prev => ({ ...prev, methodFilter: e.target.value }))}
                      sx={{
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.23)'
                        }
                      }}
                    >
                      <MenuItem value="">All Methods</MenuItem>
                      <MenuItem value="guess">guess</MenuItem>
                      <MenuItem value="start_new_game">start_new_game</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel sx={{ color: '#b0b0b0' }}>Status Filter</InputLabel>
                    <Select
                      value={searchParams.statusFilter}
                      onChange={(e) => setSearchParams(prev => ({ ...prev, statusFilter: e.target.value as any }))}
                      sx={{
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.23)'
                        }
                      }}
                    >
                      <MenuItem value="all">All Status</MenuItem>
                      <MenuItem value="success">Success Only</MenuItem>
                      <MenuItem value="failed">Failed Only</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* Current block info */}
                <Box>
                  <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 1 }}>
                    Current Block: {currentBlock.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#888' }}>
                    Searching from block {(currentBlock - searchParams.blocksToSearch).toLocaleString()}
                  </Typography>

                  {searchError && (
                    <Alert severity="warning" sx={{ mt: 2, fontSize: '0.75rem' }}>
                      {searchError}
                    </Alert>
                  )}
                </Box>
              </Box>
            </CardContent>

            <CardContent>
              {/* Results Summary */}
              <Box sx={{ mb: 3, p: 2, backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px' }}>
                <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
                  Search Results
                </Typography>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                    Found: <span style={{ color: '#64b5f6', fontWeight: 600 }}>{transactions.length}</span> transactions
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                    Searched: <span style={{ color: '#64b5f6', fontWeight: 600 }}>{searchParams.blocksToSearch}</span> blocks
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                    From Block: <span style={{ color: '#64b5f6', fontWeight: 600 }}>{(currentBlock - searchParams.blocksToSearch).toLocaleString()}</span>
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                    To Block: <span style={{ color: '#64b5f6', fontWeight: 600 }}>{currentBlock.toLocaleString()}</span>
                  </Typography>
                </Box>
              </Box>

              <TableContainer component={Paper} sx={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: '#b0b0b0' }}>Hash</TableCell>
                      <TableCell sx={{ color: '#b0b0b0' }}>Block</TableCell>
                      <TableCell sx={{ color: '#b0b0b0' }}>Age</TableCell>
                      <TableCell sx={{ color: '#b0b0b0' }}>Method</TableCell>
                      <TableCell sx={{ color: '#b0b0b0' }}>From</TableCell>
                      <TableCell sx={{ color: '#b0b0b0' }}>Gas Used</TableCell>
                      <TableCell sx={{ color: '#b0b0b0' }}>Status</TableCell>
                      <TableCell sx={{ color: '#b0b0b0' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.hash} hover>
                        <TableCell sx={{ color: '#64b5f6', fontFamily: 'monospace' }}>
                          {formatAddress(tx.hash)}
                        </TableCell>
                        <TableCell sx={{ color: '#b0b0b0' }}>{tx.blockNumber.toLocaleString()}</TableCell>
                        <TableCell sx={{ color: '#b0b0b0' }}>
                          {Math.round((Date.now() - tx.timestamp) / 60000)}m ago
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={tx.method || 'Unknown'}
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(100, 181, 246, 0.1)',
                              color: '#64b5f6'
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: '#b0b0b0', fontFamily: 'monospace' }}>
                          {formatAddress(tx.from)}
                        </TableCell>
                        <TableCell sx={{ color: '#b0b0b0' }}>{tx.gasUsed}</TableCell>
                        <TableCell>
                          <Chip
                            label={tx.status}
                            size="small"
                            sx={{
                              backgroundColor: `${getStatusColor(tx.status)}20`,
                              color: getStatusColor(tx.status)
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => setSelectedTx(tx)}
                            sx={{ color: '#64b5f6' }}
                          >
                            <Visibility fontSize="small" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {transactions.length === 0 && !loading && (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" sx={{ color: '#888' }}>
                      No transactions found. Try adjusting your search parameters.
                    </Typography>
                  </Box>
                )}
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {activeTab === 2 && (
          <Card sx={{
            background: 'rgba(25, 27, 31, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Receipt />
                  <Typography variant="h6" sx={{ color: 'white' }}>
                    Contract Events
                  </Typography>
                </Box>
              }
              action={
                <Button
                  onClick={loadEvents}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
                  sx={{ color: '#64b5f6' }}
                >
                  Refresh
                </Button>
              }
            />
            <CardContent>
              {events.map((event, index) => (
                <Accordion key={index} sx={{
                  mb: 1,
                  background: 'rgba(76, 175, 80, 0.1)',
                  border: '1px solid #4caf50'
                }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip
                        label={event.event}
                        sx={{
                          backgroundColor: 'rgba(76, 175, 80, 0.2)',
                          color: '#4caf50'
                        }}
                      />
                      <Typography sx={{ color: '#b0b0b0' }}>
                        Block #{event.blockNumber}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#888' }}>
                        {formatTimestamp(event.timestamp)}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      p: 2,
                      borderRadius: '8px',
                      fontFamily: 'monospace'
                    }}>
                      <pre style={{ color: '#e0e0e0', margin: 0 }}>
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </CardContent>
          </Card>
        )}

        {activeTab === 3 && (
          <Card sx={{
            background: 'rgba(25, 27, 31, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Call />
                  <Typography variant="h6" sx={{ color: 'white' }}>
                    Contract Function Calls
                  </Typography>
                </Box>
              }
            />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => callContractFunction('getCurrentGame')}
                  disabled={callLoading}
                  sx={{
                    borderColor: '#64b5f6',
                    color: '#64b5f6',
                    '&:hover': {
                      borderColor: '#1976d2',
                      backgroundColor: 'rgba(100, 181, 246, 0.1)'
                    }
                  }}
                >
                  {callLoading ? <CircularProgress size={20} /> : <Call sx={{ mr: 1 }} />}
                  getCurrentGame()
                </Button>
              </Box>

              {callResult && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                    Call Result: {callResult.function}
                  </Typography>
                  <Box sx={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    p: 3,
                    borderRadius: '8px',
                    fontFamily: 'monospace'
                  }}>
                    {callResult.error ? (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        Error: {callResult.error}
                      </Alert>
                    ) : null}
                    <pre style={{ color: '#e0e0e0', margin: 0 }}>
                      {JSON.stringify(callResult.result, null, 2)}
                    </pre>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* Transaction Details Dialog */}
        <Dialog
          open={!!selectedTx}
          onClose={() => setSelectedTx(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ backgroundColor: '#1a1a1a', color: 'white' }}>
            Transaction Details
          </DialogTitle>
          <DialogContent sx={{ backgroundColor: '#1a1a1a' }}>
            {selectedTx && (
              <List>
                <ListItem>
                  <ListItemText
                    primary="Transaction Hash"
                    secondary={selectedTx.hash}
                    secondaryTypographyProps={{ sx: { color: '#64b5f6', fontFamily: 'monospace' } }}
                  />
                </ListItem>
                <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                <ListItem>
                  <ListItemText
                    primary="Block Number"
                    secondary={selectedTx.blockNumber.toLocaleString()}
                    secondaryTypographyProps={{ sx: { color: '#b0b0b0' } }}
                  />
                </ListItem>
                <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                <ListItem>
                  <ListItemText
                    primary="Timestamp"
                    secondary={formatTimestamp(selectedTx.timestamp)}
                    secondaryTypographyProps={{ sx: { color: '#b0b0b0' } }}
                  />
                </ListItem>
                <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                <ListItem>
                  <ListItemText
                    primary="From"
                    secondary={selectedTx.from}
                    secondaryTypographyProps={{ sx: { color: '#b0b0b0', fontFamily: 'monospace' } }}
                  />
                </ListItem>
                <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                <ListItem>
                  <ListItemText
                    primary="To (Contract)"
                    secondary={selectedTx.to}
                    secondaryTypographyProps={{ sx: { color: '#b0b0b0', fontFamily: 'monospace' } }}
                  />
                </ListItem>
                <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                <ListItem>
                  <ListItemText
                    primary="Value"
                    secondary={`${selectedTx.value} ETH`}
                    secondaryTypographyProps={{ sx: { color: '#b0b0b0' } }}
                  />
                </ListItem>
                <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                <ListItem>
                  <ListItemText
                    primary="Gas Used"
                    secondary={selectedTx.gasUsed}
                    secondaryTypographyProps={{ sx: { color: '#b0b0b0' } }}
                  />
                </ListItem>
                <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                <ListItem>
                  <ListItemText
                    primary="Status"
                    secondary={
                      <Chip
                        label={selectedTx.status}
                        size="small"
                        sx={{
                          backgroundColor: `${getStatusColor(selectedTx.status)}20`,
                          color: getStatusColor(selectedTx.status)
                        }}
                      />
                    }
                  />
                </ListItem>
                <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                <ListItem>
                  <ListItemText
                    primary="Method"
                    secondary={
                      <Chip
                        label={selectedTx.method || 'Unknown'}
                        size="small"
                        sx={{
                          backgroundColor: 'rgba(100, 181, 246, 0.1)',
                          color: '#64b5f6'
                        }}
                      />
                    }
                  />
                </ListItem>
                {selectedTx.input && selectedTx.input !== '0x' && (
                  <>
                    <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                    <ListItem>
                      <ListItemText
                        primary="Input Data (Raw)"
                        secondary={
                          <Box>
                            <Typography
                              variant="caption"
                              sx={{
                                color: '#b0b0b0',
                                fontFamily: 'monospace',
                                wordBreak: 'break-all',
                                fontSize: '0.7rem'
                              }}
                            >
                              {selectedTx.input}
                            </Typography>
                            {selectedTx.method && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="caption" sx={{ color: '#64b5f6' }}>
                                  Decoded: {selectedTx.method}
                                  {(() => {
                                    const decoded = decodeTransactionInput(selectedTx.input);
                                    return decoded.params.length > 0 ? `(${decoded.params.join(', ')})` : '';
                                  })()}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  </>
                )}
                {selectedTx.logs && selectedTx.logs.length > 0 && (
                  <>
                    <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                    <ListItem>
                      <ListItemText
                        primary={`Logs (${selectedTx.logs.length})`}
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            {selectedTx.logs.map((log: any, index: number) => (
                              <Typography
                                key={index}
                                variant="caption"
                                sx={{
                                  color: '#888',
                                  fontFamily: 'monospace',
                                  fontSize: '0.7rem',
                                  display: 'block',
                                  mb: 0.5
                                }}
                              >
                                {log.address && `Address: ${formatAddress(log.address)}`}
                                {log.topics && `Topics: ${log.topics.length}`}
                                {log.data && `Data: ${log.data.slice(0, 66)}...`}
                              </Typography>
                            ))}
                          </Box>
                        }
                      />
                    </ListItem>
                  </>
                )}
              </List>
            )}
          </DialogContent>
          <DialogActions sx={{ backgroundColor: '#1a1a1a' }}>
            <Button onClick={() => setSelectedTx(null)} sx={{ color: '#64b5f6' }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}