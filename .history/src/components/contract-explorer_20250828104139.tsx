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

export function ContractExplorer() {
  const [activeTab, setActiveTab] = useState(0);
  const [contractState, setContractState] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [events, setEvents] = useState<ContractEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [callResult, setCallResult] = useState<any>(null);
  const [callLoading, setCallLoading] = useState(false);

  const chainId = useChainId();
  const contractAddress = '0xD6Ad3e67e2514bED804acc45945A7a102C4c6Ae4';
  const context = useContext(GameContext);

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

  // Mock transaction history (in real implementation, this would come from blockchain explorer API)
  const loadTransactionHistory = async () => {
    setLoading(true);
    try {
      // Mock data - in real implementation, fetch from blockchain explorer
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
          input: '000000000000000000000000000000000000000000000000000000000000003c' // 60 in hex
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
          input: '000000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000000000000000000000000000000000000000064' // 30, 100
        }
      ];
      setTransactions(mockTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mock events (in real implementation, this would come from blockchain)
  const loadEvents = async () => {
    setLoading(true);
    try {
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
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
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
            <CardContent>
              <TableContainer component={Paper} sx={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: '#b0b0b0' }}>Hash</TableCell>
                      <TableCell sx={{ color: '#b0b0b0' }}>Block</TableCell>
                      <TableCell sx={{ color: '#b0b0b0' }}>Method</TableCell>
                      <TableCell sx={{ color: '#b0b0b0' }}>From</TableCell>
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
                        <TableCell sx={{ color: '#b0b0b0' }}>{tx.blockNumber}</TableCell>
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
                    secondary={selectedTx.blockNumber}
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
                    primary="To"
                    secondary={selectedTx.to}
                    secondaryTypographyProps={{ sx: { color: '#b0b0b0', fontFamily: 'monospace' } }}
                  />
                </ListItem>
                <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                <ListItem>
                  <ListItemText
                    primary="Method"
                    secondary={selectedTx.method || 'Unknown'}
                    secondaryTypographyProps={{ sx: { color: '#64b5f6' } }}
                  />
                </ListItem>
                {selectedTx.input && (
                  <>
                    <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                    <ListItem>
                      <ListItemText
                        primary="Input Data"
                        secondary={selectedTx.input}
                        secondaryTypographyProps={{ sx: { color: '#b0b0b0', fontFamily: 'monospace', wordBreak: 'break-all' } }}
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