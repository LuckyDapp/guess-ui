import React, { useState, useContext } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  ExpandMore,
  BugReport,
  NetworkCheck,
  Storage,
  Timeline,
  Code,
  Refresh,
  GetApp,
  Send
} from '@mui/icons-material';
import { GameContext } from '../contexts/game-context';
import { BlockchainLoader } from './blockchain-loader';

interface DebugResult {
  timestamp: string;
  command: string;
  result: any;
  success: boolean;
  error?: string;
}

export function DebugPage() {
  const [results, setResults] = useState<DebugResult[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const context = useContext(GameContext);

  const addResult = (command: string, result: any, success: boolean = true, error?: string) => {
    const newResult: DebugResult = {
      timestamp: new Date().toLocaleTimeString(),
      command,
      result,
      success,
      error
    };
    setResults(prev => [newResult, ...prev.slice(0, 19)]); // Keep last 20 results
  };

  const runCommand = async (commandName: string, command: () => Promise<any> | any) => {
    setLoading(commandName);
    try {
      const result = await command();
      addResult(commandName, result, true);
    } catch (error) {
      addResult(commandName, null, false, error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(null);
    }
  };

  // Debug Commands
  const debugCommands = {
    // Game State
    async getGameState() {
      if (!context) return 'No context available';
      return {
        game: context.game,
        attempts: context.getAttempts(),
        gameNumber: context.game?.game_number,
        minNumber: context.game?.min_number,
        maxNumber: context.game?.max_number,
        lastGuess: context.game?.last_guess,
        lastClue: context.game?.last_clue
      };
    },

    // Network Information
    async getNetworkInfo() {
      return {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        screen: {
          width: window.screen.width,
          height: window.screen.height,
          colorDepth: window.screen.colorDepth
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        connection: {
          online: navigator.onLine,
          cookieEnabled: navigator.cookieEnabled,
          language: navigator.language
        }
      };
    },

    // WebSocket Connections
    async getWebSocketConnections() {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const wsConnections = resources.filter(r =>
        r.name.includes('ws://') || r.name.includes('wss://')
      );

      return wsConnections.map(conn => ({
        url: conn.name,
        duration: conn.responseEnd - conn.requestStart,
        size: conn.transferSize,
        type: conn.initiatorType
      }));
    },

    // Local Storage
    async getLocalStorage() {
      const storage: { [key: string]: any } = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          try {
            storage[key] = JSON.parse(localStorage.getItem(key) || '');
          } catch {
            storage[key] = localStorage.getItem(key);
          }
        }
      }
      return storage;
    },

    // Performance Metrics
    async getPerformanceMetrics() {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

      return {
        navigation: {
          loadTime: navigation.loadEventEnd - navigation.fetchStart,
          domReady: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 'N/A',
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 'N/A'
        },
        resources: resources.map(r => ({
          url: r.name,
          type: r.initiatorType,
          duration: r.responseEnd - r.requestStart,
          size: r.transferSize
        })).slice(0, 10) // Last 10 resources
      };
    },

    // React Components
    async getReactComponents() {
      const components = document.querySelectorAll('[data-reactroot], [data-react-helmet]');
      const componentInfo = Array.from(components).map((el, i) => ({
        index: i,
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        children: el.children.length,
        text: el.textContent?.substring(0, 100) + '...'
      }));

      return {
        totalComponents: components.length,
        components: componentInfo
      };
    },

    // Contract Information
    async getContractInfo() {
      return {
        contractAddress: '0xD6Ad3e67e2514bED804acc45945A7a102C4c6Ae4',
        network: 'Pop Network (Polkadot Parachain)',
        rpcUrl: 'wss://rpc1.paseo.popnetwork.xyz',
        contractType: 'Guess the Number Game',
        functions: [
          'getCurrentGame()',
          'guess(number)',
          'start_new_game(min, max)'
        ]
      };
    },

    // Browser Console Logs (simulated)
    async getConsoleLogs() {
      // This would normally require overriding console methods
      return {
        note: 'Console logs are available in DevTools (F12) → Console',
        instructions: 'Open browser DevTools and check the Console tab for real-time logs',
        availableLogs: [
          'Game state changes',
          'Transaction submissions',
          'Polling status',
          'Network requests',
          'Error messages'
        ]
      };
    }
  };

  const formatResult = (result: any): string => {
    try {
      return JSON.stringify(result, null, 2);
    } catch {
      return String(result);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addResult('Copy to Clipboard', 'Result copied to clipboard!', true);
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #101010 0%, #1a1a1a 50%, #101010 100%)',
      p: 3
    }}>
      <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
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
            <BugReport sx={{ fontSize: '2rem' }} />
            Debug Panel
          </Typography>
          <Typography variant="body1" sx={{ color: '#b0b0b0' }}>
            Advanced debugging tools for the Guess the Number dApp
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          {/* Debug Commands */}
          <Box sx={{ flex: 1 }}>
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
                      Debug Commands
                    </Typography>
                  </Box>
                }
                subheader="Click to run diagnostic commands"
              />
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {Object.entries(debugCommands).map(([commandName, commandFn]) => (
                    <Button
                      key={commandName}
                      fullWidth
                      variant="outlined"
                      onClick={() => runCommand(commandName, commandFn)}
                      disabled={loading === commandName}
                      sx={{
                        borderColor: '#64b5f6',
                        color: '#64b5f6',
                        '&:hover': {
                          borderColor: '#1976d2',
                          backgroundColor: 'rgba(100, 181, 246, 0.1)'
                        }
                      }}
                    >
                      {loading === commandName ? (
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                      ) : null}
                      {commandName.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </Button>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Results Panel */}
          <Box sx={{ flex: 1 }}>
            <Card sx={{
              background: 'rgba(25, 27, 31, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Storage />
                    <Typography variant="h6" sx={{ color: 'white' }}>
                      Results ({results.length})
                    </Typography>
                  </Box>
                }
                subheader="Command execution results"
              />
              <CardContent sx={{ maxHeight: '600px', overflow: 'auto' }}>
                {results.length === 0 ? (
                  <Typography variant="body2" sx={{ color: '#888', textAlign: 'center', py: 4 }}>
                    No results yet. Run a debug command to see results here.
                  </Typography>
                ) : (
                  results.map((result, index) => (
                    <Accordion key={index} sx={{
                      mb: 1,
                      background: result.success
                        ? 'rgba(76, 175, 80, 0.1)'
                        : 'rgba(244, 67, 54, 0.1)',
                      border: `1px solid ${result.success ? '#4caf50' : '#f44336'}`
                    }}>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                          <Chip
                            label={result.timestamp}
                            size="small"
                            sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                          />
                          <Typography variant="body2" sx={{ color: 'white', flex: 1 }}>
                            {result.command}
                          </Typography>
                          <Chip
                            label={result.success ? 'Success' : 'Error'}
                            size="small"
                            color={result.success ? 'success' : 'error'}
                          />
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        {result.error && (
                          <Alert severity="error" sx={{ mb: 2 }}>
                            {result.error}
                          </Alert>
                        )}
                        <Box sx={{
                          backgroundColor: 'rgba(0, 0, 0, 0.3)',
                          p: 2,
                          borderRadius: '8px',
                          maxHeight: '300px',
                          overflow: 'auto'
                        }}>
                          <Typography
                            component="pre"
                            variant="body2"
                            sx={{
                              color: '#e0e0e0',
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              whiteSpace: 'pre-wrap',
                              margin: 0
                            }}
                          >
                            {formatResult(result.result)}
                          </Typography>
                        </Box>
                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            onClick={() => copyToClipboard(formatResult(result.result))}
                            sx={{ color: '#64b5f6' }}
                          >
                            <GetApp sx={{ mr: 1, fontSize: '1rem' }} />
                            Copy
                          </Button>
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  ))
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Quick Actions */}
        <Box sx={{ mt: 3 }}>
          <Card sx={{
            background: 'rgba(25, 27, 31, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Timeline />
                  <Typography variant="h6" sx={{ color: 'white' }}>
                    Quick Actions
                  </Typography>
                </Box>
              }
            />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => window.location.reload()}
                  sx={{
                    background: 'linear-gradient(135deg, #64b5f6 0%, #1976d2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #1976d2 0%, #64b5f6 100%)'
                    }
                  }}
                >
                  <Refresh sx={{ mr: 1 }} />
                  Refresh Page
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => {
                    setResults([]);
                    addResult('Clear Results', 'All results cleared', true);
                  }}
                  sx={{
                    borderColor: '#ff9800',
                    color: '#ff9800',
                    '&:hover': {
                      borderColor: '#f57c00',
                      backgroundColor: 'rgba(255, 152, 0, 0.1)'
                    }
                  }}
                >
                  Clear Results
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => {
                    const url = 'https://polkadot.js.org/apps/?rpc=wss://rpc1.paseo.popnetwork.xyz#/explorer';
                    window.open(url, '_blank');
                  }}
                  sx={{
                    borderColor: '#4caf50',
                    color: '#4caf50',
                    '&:hover': {
                      borderColor: '#2e7d32',
                      backgroundColor: 'rgba(76, 175, 80, 0.1)'
                    }
                  }}
                >
                  <NetworkCheck sx={{ mr: 1 }} />
                  Explorer
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => {
                    const contractInfo = {
                      address: '0xD6Ad3e67e2514bED804acc45945A7a102C4c6Ae4',
                      network: 'Pop Network',
                      rpc: 'wss://rpc1.paseo.popnetwork.xyz'
                    };
                    copyToClipboard(JSON.stringify(contractInfo, null, 2));
                  }}
                  sx={{
                    borderColor: '#9c27b0',
                    color: '#9c27b0',
                    '&:hover': {
                      borderColor: '#7b1fa2',
                      backgroundColor: 'rgba(156, 39, 176, 0.1)'
                    }
                  }}
                >
                  <Send sx={{ mr: 1 }} />
                  Copy Contract Info
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}