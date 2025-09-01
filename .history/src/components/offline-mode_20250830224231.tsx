import React, { useState, useEffect } from 'react';
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
    Alert,
    Tabs,
    Tab,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import { Games, BugReport, AccountBalance } from '@mui/icons-material';
import { GameIntro } from './game-intro';
import { BlockchainLoader } from './blockchain-loader';

interface OfflineModeProps {
    currentPage: 'game' | 'debug' | 'explorer';
}

export function OfflineMode({ currentPage }: OfflineModeProps) {
    const [activeTab, setActiveTab] = useState(0);
    const [demoGame, setDemoGame] = useState({
        game_number: 1,
        min_number: 1,
        max_number: 100,
        attempt: 0,
        last_guess: null as number | null,
        last_clue: null as string | null,
        status: 'active'
    });

    const [cachedTransactions, setCachedTransactions] = useState<any[]>([]);
    const [cachedEvents, setCachedEvents] = useState<any[]>([]);
    const [cachedGameState, setCachedGameState] = useState<any>(null);
    const [onlineModeAvailable, setOnlineModeAvailable] = useState(false);
    const [connectionAttempted, setConnectionAttempted] = useState(false);
    const [selectedTx, setSelectedTx] = useState<any>(null);

    // Handle tab change
    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    // Handle transaction selection
    const handleTransactionSelect = (transaction: any) => {
        console.log('🔍 Transaction selected:', transaction);
        setSelectedTx(transaction);
    };

    // Format date utility functions
    const formatDateShort = (timestamp: number): string => {
        return new Date(timestamp).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatTimeShort = (timestamp: number): string => {
        return new Date(timestamp).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const formatDateTimeFull = (timestamp: number): string => {
        return new Date(timestamp).toLocaleString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // Format parameters for display
    const formatParameters = (decodedParams: any): string => {
        if (!decodedParams || Object.keys(decodedParams).length === 0) {
            return '-';
        }

        const formattedParams: string[] = [];

        // Handle specific method parameters
        if (decodedParams.guess !== undefined) {
            formattedParams.push(`Guess: ${decodedParams.guess}`);
        } else if (decodedParams.min_number !== undefined && decodedParams.max_number !== undefined) {
            formattedParams.push(`Min: ${decodedParams.min_number}, Max: ${decodedParams.max_number}`);
        } else if (decodedParams.player_address !== undefined) {
            formattedParams.push(`Player: ${decodedParams.player_address.slice(0, 6)}...${decodedParams.player_address.slice(-4)}`);
        } else {
            // Generic parameter display
            Object.entries(decodedParams).forEach(([key, value]) => {
                if (key.startsWith('param') && value !== undefined) {
                    if (typeof value === 'string' && value.startsWith('0x')) {
                        formattedParams.push(`${value.slice(0, 6)}...${value.slice(-4)}`);
                    } else {
                        formattedParams.push(String(value));
                    }
                }
            });
        }

        return formattedParams.length > 0 ? formattedParams.join(', ') : '-';
    };

    // Cache utilities (same as in ContractExplorer)
    const CACHE_KEY = 'contract_explorer_cache';
    const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds

    interface CacheEntry {
        blockNumber: number;
        blockHash: string;
        blockData: any;
        transactions: any[];
        events?: any[];
        timestamp: number;
    }

    interface CacheData {
        entries: { [blockNumber: number]: CacheEntry };
        lastUpdated: number;
        contractAddress: string;
    }

    // Get cache from localStorage
    const getCache = (): CacheData => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const data: CacheData = JSON.parse(cached);
                return data;
            }
        } catch (error) {
            console.warn('Failed to load cache:', error);
        }
        return { entries: {}, lastUpdated: 0, contractAddress: '' };
    };

    // Load cached data on component mount
    useEffect(() => {
        const loadCachedData = () => {
            const cache = getCache();
            const transactions: any[] = [];
            const events: any[] = [];

            // Get cached transactions and events
            Object.values(cache.entries).forEach(entry => {
                if (entry.transactions) {
                    transactions.push(...entry.transactions);
                }
                if (entry.events) {
                    events.push(...entry.events);
                }
            });

            // Sort by timestamp (most recent first)
            transactions.sort((a, b) => b.timestamp - a.timestamp);
            events.sort((a, b) => b.timestamp - a.timestamp);

            setCachedTransactions(transactions);
            setCachedEvents(events);

            console.log(`💾 Loaded ${transactions.length} cached transactions and ${events.length} cached events`);

            // If no cached data, create some sample cache data for demonstration
            if (transactions.length === 0 && events.length === 0) {
                console.log('📝 No cached data found, creating sample cache data for demonstration');
                createSampleCacheData();
            }
        };

        loadCachedData();

        // Create sample cache data for demonstration
        const createSampleCacheData = () => {
            const sampleCache: CacheData = {
                entries: {},
                lastUpdated: Date.now(),
                contractAddress: '0xDEMO1234567890abcdef'
            };

            // Create sample transactions
            const sampleTransactions = [
                {
                    hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                    blockNumber: 1000000,
                    timestamp: Date.now() - 3600000,
                    from: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
                    to: '0xDEMO1234567890abcdef',
                    value: '0',
                    gasUsed: '21000',
                    status: 'success',
                    method: 'start_new_game',
                    decodedParams: { min_number: 1, max_number: 100 }
                },
                {
                    hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                    blockNumber: 1000001,
                    timestamp: Date.now() - 1800000,
                    from: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
                    to: '0xDEMO1234567890abcdef',
                    value: '0',
                    gasUsed: '25000',
                    status: 'success',
                    method: 'guess',
                    decodedParams: { guess: 42 }
                },
                {
                    hash: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
                    blockNumber: 1000002,
                    timestamp: Date.now() - 900000,
                    from: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
                    to: '0xDEMO1234567890abcdef',
                    value: '0',
                    gasUsed: '23000',
                    status: 'success',
                    method: 'guess',
                    decodedParams: { guess: 75 }
                }
            ];

            // Create sample events
            const sampleEvents = [
                {
                    event: 'NewGame',
                    data: { game_number: 1, player: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', min_number: 1, max_number: 100 },
                    blockNumber: 1000000,
                    transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                    timestamp: Date.now() - 3600000,
                    decodedParams: { game_number: 1, player: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', min_number: 1, max_number: 100 }
                },
                {
                    event: 'GuessMade',
                    data: { game_number: 1, attempt: 1, guess: 42 },
                    blockNumber: 1000001,
                    transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                    timestamp: Date.now() - 1800000,
                    decodedParams: { game_number: 1, attempt: 1, guess: 42 }
                },
                {
                    event: 'GameWon',
                    data: { game_number: 1, winner: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', secret_number: 42 },
                    blockNumber: 1000002,
                    transactionHash: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
                    timestamp: Date.now() - 900000,
                    decodedParams: { game_number: 1, winner: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', secret_number: 42 }
                }
            ];

            // Add to cache entries
            sampleCache.entries[1000000] = {
                blockNumber: 1000000,
                blockHash: '0xblock1000000',
                blockData: null,
                transactions: [sampleTransactions[0]],
                events: [sampleEvents[0]],
                timestamp: Date.now()
            };

            sampleCache.entries[1000001] = {
                blockNumber: 1000001,
                blockHash: '0xblock1000001',
                blockData: null,
                transactions: [sampleTransactions[1]],
                events: [sampleEvents[1]],
                timestamp: Date.now()
            };

            sampleCache.entries[1000002] = {
                blockNumber: 1000002,
                blockHash: '0xblock1000002',
                blockData: null,
                transactions: [sampleTransactions[2]],
                events: [sampleEvents[2]],
                timestamp: Date.now()
            };

            // Save to localStorage
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify(sampleCache));
                console.log('✅ Created sample cache data for demonstration');

                // Reload cached data
                setTimeout(() => {
                    const updatedCache = getCache();
                    const updatedTransactions: any[] = [];
                    const updatedEvents: any[] = [];

                    Object.values(updatedCache.entries).forEach(entry => {
                        if (entry.transactions) {
                            updatedTransactions.push(...entry.transactions);
                        }
                        if (entry.events) {
                            updatedEvents.push(...entry.events);
                        }
                    });

                    updatedTransactions.sort((a, b) => b.timestamp - a.timestamp);
                    updatedEvents.sort((a, b) => b.timestamp - a.timestamp);

                    setCachedTransactions(updatedTransactions);
                    setCachedEvents(updatedEvents);
                }, 100);
            } catch (error) {
                console.warn('Failed to save sample cache data:', error);
            }
        };
    }, []);

    const [demoAttempts, setDemoAttempts] = useState<Array<{
        attemptNumber: number;
        guess: number;
        clue: string | null;
        timestamp: number;
    }>>([]);

    const [guessInput, setGuessInput] = useState('');
    const [isGuessing, setIsGuessing] = useState(false);
    const [waitingForPhala, setWaitingForPhala] = useState(false);

    // Simulate blockchain delay
    const simulateDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const handleDemoGuess = async () => {
        const guess = parseInt(guessInput);
        if (!guess || guess < demoGame.min_number || guess > demoGame.max_number) {
            return;
        }

        setIsGuessing(true);

        // Phase 1: Submit to blockchain (simulate transaction)
        await simulateDelay(1500);

        // Create attempt in "waiting" state
        const newAttempt = {
            attemptNumber: demoAttempts.length + 1,
            guess,
            clue: null, // null means waiting for Phala
            timestamp: Date.now()
        };

        setDemoAttempts(prev => [...prev, newAttempt]);
        setDemoGame(prev => ({
            ...prev,
            attempt: prev.attempt + 1,
            last_guess: guess,
            last_clue: null // waiting for Phala
        }));

        setGuessInput('');
        setIsGuessing(false);
        setWaitingForPhala(true);

        // Phase 2: Wait for Phala Cloud response (simulate real delay)
        await simulateDelay(3000 + Math.random() * 2000); // 3-5 seconds

        // Phase 3: Receive response from Phala Cloud
        const secretNumber = 42; // Demo secret number
        let clue: string;

        if (guess === secretNumber) {
            clue = 'Found';
        } else if (guess < secretNumber) {
            clue = 'More';
        } else {
            clue = 'Less';
        }

        // Update the attempt with the result
        setDemoAttempts(prev =>
            prev.map(attempt =>
                attempt.attemptNumber === newAttempt.attemptNumber
                    ? { ...attempt, clue }
                    : attempt
            )
        );

        setDemoGame(prev => ({
            ...prev,
            last_clue: clue,
            status: clue === 'Found' ? 'completed' : 'active'
        }));

        setWaitingForPhala(false);
    };

    const startNewDemoGame = () => {
        setDemoGame({
            game_number: demoGame.game_number + 1,
            min_number: 1,
            max_number: 100,
            attempt: 0,
            last_guess: null,
            last_clue: null,
            status: 'active'
        });
        setDemoAttempts([]);
    };

    // Use cached transactions, fallback to demo if no cache
    const demoTransactions = cachedTransactions.length > 0 ? cachedTransactions : [
        {
            hash: '0xdemo1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            blockNumber: 1000000,
            timestamp: Date.now() - 3600000,
            from: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
            to: '0xDEMO1234567890abcdef',
            value: '0',
            gasUsed: '21000',
            status: 'success' as const,
            method: 'start_new_game',
            decodedParams: { min_number: 1, max_number: 100 }
        },
        {
            hash: '0xdemoabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            blockNumber: 1000001,
            timestamp: Date.now() - 1800000,
            from: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
            to: '0xDEMO1234567890abcdef',
            value: '0',
            gasUsed: '25000',
            status: 'success' as const,
            method: 'guess',
            decodedParams: { guess: 50 }
        }
    ];

    // Use cached events, fallback to demo if no cache
    const demoEvents = cachedEvents.length > 0 ? cachedEvents : [
        {
            event: 'NewGame',
            data: { game_number: 1, player: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', min_number: 1, max_number: 100 },
            blockNumber: 1000000,
            transactionHash: '0xdemo1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            timestamp: Date.now() - 3600000,
            decodedParams: { game_number: 1, player: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', min_number: 1, max_number: 100 }
        },
        {
            event: 'GuessMade',
            data: { game_number: 1, attempt: 1, guess: 50 },
            blockNumber: 1000001,
            transactionHash: '0xdemoabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            timestamp: Date.now() - 1800000,
            decodedParams: { game_number: 1, attempt: 1, guess: 50 }
        }
    ];

    if (currentPage === 'game') {
        return (
            <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #101010 0%, #1a1a1a 50%, #101010 100%)' }}>
                {/* Game Intro Section */}
                <Box sx={{ padding: { xs: "40px 20px 0", sm: "60px 40px 0" }, display: 'flex', justifyContent: 'center' }}>
                    <Box className="content-block fade-in" sx={{ width: '100%', maxWidth: '700px', borderRadius: '24px', p: { xs: 3, sm: 4 } }}>
                        <GameIntro />
                        <Alert severity="info" sx={{ mt: 2 }}>
                            🎮 Demo Mode - Full functionality available offline
                        </Alert>
                        <Alert severity="success" sx={{ mt: 1 }}>
                            ✅ Application loaded successfully - You can play immediately!
                        </Alert>
                    </Box>
                </Box>

                {/* Game Content */}
                <Box sx={{ padding: { xs: "30px 20px 0", sm: "50px 40px 0" }, display: 'flex', justifyContent: 'center' }}>
                    <div className="content-block fade-in" style={{ width: '100%', maxWidth: '700px', padding: '30px', borderRadius: '20px' }}>
                        {/* Game Header */}
                        <Box sx={{ textAlign: 'center', mb: 4 }}>
                            <Typography variant="h5" sx={{ color: '#64b5f6', fontWeight: 600, mb: 1 }}>
                                🎯 Demo Game Mode
                            </Typography>
                            <Typography variant="body1" sx={{ color: '#b0b0b0' }}>
                                Find the secret number between <span style={{ color: '#64b5f6', fontWeight: 600 }}>{demoGame.min_number}</span> and <span style={{ color: '#64b5f6', fontWeight: 600 }}>{demoGame.max_number}</span>
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#ff9800', mt: 1 }}>
                                Secret number: 42 (for demo purposes)
                            </Typography>
                        </Box>

                        {/* Attempts History */}
                        {demoAttempts.length > 0 && (
                            <Box sx={{ mb: 4 }}>
                                <Typography variant="h6" sx={{ color: 'white', mb: 2, fontWeight: 600 }}>
                                    Your Attempts ({demoAttempts.length})
                                </Typography>
                                <Box sx={{
                                    maxHeight: '300px',
                                    overflowY: 'auto',
                                    '&::-webkit-scrollbar': {
                                        width: '6px'
                                    },
                                    '&::-webkit-scrollbar-thumb': {
                                        backgroundColor: 'rgba(100, 181, 246, 0.3)',
                                        borderRadius: '3px'
                                    }
                                }}>
                                    {demoAttempts.map(attempt => (
                                        <Box
                                            key={attempt.attemptNumber}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                p: 2,
                                                mb: 1,
                                                borderRadius: '12px',
                                                background: attempt.clue === null
                                                    ? 'rgba(255, 152, 0, 0.1)'
                                                    : attempt.clue === "Found"
                                                        ? 'rgba(76, 175, 80, 0.1)'
                                                        : 'rgba(32, 33, 37, 0.5)',
                                                border: attempt.clue === null
                                                    ? '1px solid rgba(255, 152, 0, 0.3)'
                                                    : attempt.clue === "Found"
                                                        ? '1px solid rgba(76, 175, 80, 0.3)'
                                                        : '1px solid rgba(255, 255, 255, 0.1)',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            {attempt.clue === null ? (
                                                <>
                                                    {/* Animated background for waiting state */}
                                                    <Box
                                                        sx={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            right: 0,
                                                            bottom: 0,
                                                            background: 'linear-gradient(90deg, transparent, rgba(100, 181, 246, 0.1), transparent)',
                                                            animation: 'shimmer 2s infinite'
                                                        }}
                                                    />
                                                    <Typography variant="body2" sx={{ mr: 2, color: '#ff9800', fontWeight: 600 }}>
                                                        Attempt #{attempt.attemptNumber}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                                        <BlockchainLoader message="Waiting for Phala Cloud response..." size="small" />
                                                        <Typography variant="body2" sx={{ ml: 2, color: '#b0b0b0' }}>
                                                            Guessed: {attempt.guess}
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="caption" sx={{ color: '#ff9800', fontSize: '0.7rem', ml: 2 }}>
                                                        ⏳ Processing...
                                                    </Typography>
                                                </>
                                            )}
                                                </>
                                            ) : attempt.clue === "Less" ? (
                                                <>
                                                    <Typography variant="body2" sx={{ color: '#f44336', mr: 2 }}>
                                                        #{attempt.attemptNumber}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                                                        My number is <span style={{ color: '#f44336', fontWeight: 600 }}>less than</span> {attempt.guess}
                                                    </Typography>
                                                </>
                                            ) : attempt.clue === "More" ? (
                                                <>
                                                    <Typography variant="body2" sx={{ color: '#4caf50', mr: 2 }}>
                                                        #{attempt.attemptNumber}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                                                        My number is <span style={{ color: '#4caf50', fontWeight: 600 }}>more than</span> {attempt.guess}
                                                    </Typography>
                                                </>
                                            ) : (
                                                <>
                                                    <Typography variant="body2" sx={{ color: '#4caf50', mr: 2 }}>
                                                        #{attempt.attemptNumber} 🎉
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: '#4caf50', fontWeight: 600 }}>
                                                        Congratulations! You found the number {attempt.guess}!
                                                    </Typography>
                                                </>
                                            )}
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        )}

                        {/* Make Guess Component */}
                        <Box sx={{ padding: { xs: "30px 0 0", sm: "40px 0 0" }, display: 'flex', justifyContent: 'center' }}>
                            <Box
                                className="content-block fade-in"
                                sx={{
                                    display: 'flex',
                                    flexDirection: { xs: 'column', sm: 'row' },
                                    alignItems: 'center',
                                    gap: 2,
                                    p: 3,
                                    width: '100%',
                                    maxWidth: '500px',
                                    borderRadius: '16px'
                                }}
                            >
                                <TextField
                                    value={guessInput}
                                    onChange={(e) => setGuessInput(e.target.value)}
                                    label="Enter your guess"
                                    variant="outlined"
                                    type="number"
                                    disabled={isGuessing || demoGame.status === 'completed'}
                                    sx={{
                                        flex: 1,
                                        '& .MuiOutlinedInput-root': {
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                            },
                                            '&.Mui-focused': {
                                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                            }
                                        }
                                    }}
                                    InputLabelProps={{ sx: { color: '#b0b0b0' } }}
                                    inputProps={{ sx: { color: 'white' } }}
                                />
                                <Button
                                    onClick={handleDemoGuess}
                                    variant="contained"
                                    disabled={isGuessing || demoGame.status === 'completed' || !guessInput}
                                    sx={{
                                        minWidth: { xs: '100%', sm: '140px' },
                                        height: '56px',
                                        position: 'relative'
                                    }}
                                >
                                    {isGuessing ? (
                                        <>
                                            <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                                            Processing...
                                        </>
                                    ) : (
                                        '🚀 Make Guess'
                                    )}
                                </Button>
                            </Box>
                        </Box>

                        {/* New Game Button */}
                        {demoGame.status === 'completed' && (
                            <Box sx={{ textAlign: 'center', mt: 4 }}>
                                <Button
                                    onClick={startNewDemoGame}
                                    variant="contained"
                                    color="success"
                                    size="large"
                                >
                                    🎮 Start New Demo Game
                                </Button>
                            </Box>
                        )}
                    </div>
                </Box>
            </Box>
        );
    }

    if (currentPage === 'explorer') {
        return (
            <Box sx={{ width: '100%', p: 2 }}>
                <Typography variant="h4" gutterBottom>
                    Contract Explorer - Demo Mode
                </Typography>

                <Alert severity={cachedTransactions.length > 0 ? "success" : "warning"} sx={{ mb: 2 }}>
                    {cachedTransactions.length > 0
                        ? `💾 Cache Mode - Using ${cachedTransactions.length} cached transactions`
                        : "🚨 Demo Mode - No cached data found, using demo data"
                    }
                </Alert>

                <Alert severity="info" sx={{ mb: 2 }}>
                    Connected to Local Cache • Contract: 0xDEMO1234567890abcdef • {cachedTransactions.length > 0 ? 'Real cached data' : 'Demo data'}
                </Alert>

                <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
                    <Tab label="Contract State" />
                    <Tab label="Transactions" />
                    <Tab label="Events" />
                    <Tab label="Contract Calls" />
                </Tabs>

                {/* Contract State Tab */}
                {activeTab === 0 && (
                    <Card className="fade-in-scale card-hover" sx={{ mb: 2 }}>
                        <CardHeader title="Contract State" />
                        <CardContent>
                            <Typography><strong>Game Number:</strong> {demoGame.game_number}</Typography>
                            <Typography><strong>Min Number:</strong> {demoGame.min_number}</Typography>
                            <Typography><strong>Max Number:</strong> {demoGame.max_number}</Typography>
                            <Typography><strong>Attempts:</strong> {demoGame.attempt}</Typography>
                            <Typography><strong>Last Guess:</strong> {demoGame.last_guess || 'None'}</Typography>
                            <Typography><strong>Last Clue:</strong> {demoGame.last_clue || 'None'}</Typography>
                            <Typography><strong>Status:</strong> {demoGame.status}</Typography>
                            <Typography><strong>Network:</strong> Demo Mode</Typography>
                            <Typography><strong>Contract Address:</strong> 0xDEMO1234567890abcdef</Typography>
                        </CardContent>
                    </Card>
                )}

                {/* Transactions Tab */}
                {activeTab === 1 && (
                    <Card sx={{ mb: 2 }}>
                        <CardHeader title={`Transaction History (${cachedTransactions.length > 0 ? 'Cached Data' : 'Demo Data'})`} />
                        <CardContent>
                            <TableContainer component={Paper}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Hash</TableCell>
                                            <TableCell>Block</TableCell>
                                            <TableCell>Date/Time</TableCell>
                                            <TableCell>Method</TableCell>
                                            <TableCell>Parameters</TableCell>
                                            <TableCell>From</TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell>Gas Used</TableCell>
                                            <TableCell>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {demoTransactions.map((tx) => (
                                            <TableRow key={tx.hash}>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                        {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>{tx.blockNumber}</TableCell>
                                                <TableCell>
                                                    <Box>
                                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                            {formatDateShort(tx.timestamp)}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: '#888', fontSize: '0.7rem' }}>
                                                            {formatTimeShort(tx.timestamp)}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={tx.method || 'unknown'} size="small" />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#64b5f6' }}>
                                                        {formatParameters(tx.decodedParams || {})}
                                                    </Typography>
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
                                                        variant="outlined"
                                                        sx={{ minWidth: '60px' }}
                                                    >
                                                        View
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

                {/* Events Tab */}
                {activeTab === 2 && (
                    <Card>
                        <CardHeader title={`Contract Events (${cachedEvents.length > 0 ? 'Cached Data' : 'Demo Data'})`} />
                        <CardContent>
                            <TableContainer component={Paper}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Event</TableCell>
                                            <TableCell>Block</TableCell>
                                            <TableCell>Parameters</TableCell>
                                            <TableCell>Tx Hash</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {demoEvents.map((event, index) => (
                                            <TableRow key={index} hover>
                                                <TableCell>
                                                    <Chip
                                                        label={event.event}
                                                        size="small"
                                                        color={
                                                            event.event === 'NewGame' ? 'success' :
                                                            event.event === 'GuessMade' ? 'primary' : 'default'
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell>{event.blockNumber}</TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#64b5f6' }}>
                                                        {Object.entries(event.decodedParams || {}).map(([key, value]) => `${key}: ${value}`).join(' • ')}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                                                        {event.transactionHash.slice(0, 8)}...{event.transactionHash.slice(-6)}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                )}

                {/* Contract Calls Tab */}
                {activeTab === 3 && (
                    <Card>
                        <CardHeader title="Contract Calls" />
                        <CardContent>
                            <Typography variant="body1" sx={{ color: '#b0b0b0', textAlign: 'center', py: 4 }}>
                                Contract calls are not available in offline mode.
                                <br />
                                Connect to a blockchain network to interact with smart contracts.
                            </Typography>
                        </CardContent>
                    </Card>
                )}
            </Box>
        );
    }

    if (currentPage === 'debug') {
        return (
            <Box sx={{ width: '100%', p: 2 }}>
                <Typography variant="h4" gutterBottom>
                    Debug Page - Demo Mode
                </Typography>

                <Alert severity="warning" sx={{ mb: 2 }}>
                    🚨 Demo Mode - No blockchain connection
                </Alert>

                <Card>
                    <CardHeader title="System Information" />
                    <CardContent>
                        <Typography><strong>Mode:</strong> Offline/Cache</Typography>
                        <Typography><strong>Timestamp:</strong> {new Date().toISOString()}</Typography>
                        <Typography><strong>User Agent:</strong> {navigator.userAgent}</Typography>
                        <Typography><strong>Local Storage:</strong> {typeof localStorage !== 'undefined' ? 'Available' : 'Not Available'}</Typography>
                        <Typography><strong>Demo Game Status:</strong> {demoGame.status}</Typography>
                        <Typography><strong>Demo Attempts:</strong> {demoAttempts.length}</Typography>
                        <Typography><strong>Cached Transactions:</strong> {cachedTransactions.length}</Typography>
                        <Typography><strong>Cached Events:</strong> {cachedEvents.length}</Typography>
                        <Typography><strong>Cache Source:</strong> {cachedTransactions.length > 0 ? 'Real blockchain data' : 'Demo data'}</Typography>
                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                            <Button
                                size="small"
                                variant="outlined"
                                color="warning"
                                onClick={() => {
                                    localStorage.removeItem(CACHE_KEY);
                                    setCachedTransactions([]);
                                    setCachedEvents([]);
                                    console.log('🗑️ Cache cleared');
                                }}
                            >
                                🗑️ Clear Cache
                            </Button>
                            <Button
                                size="small"
                                variant="outlined"
                                color="info"
                                onClick={() => {
                                    // Force reload of cached data
                                    const cache = getCache();
                                    const transactions: any[] = [];
                                    const events: any[] = [];

                                    Object.values(cache.entries).forEach(entry => {
                                        if (entry.transactions) {
                                            transactions.push(...entry.transactions);
                                        }
                                        if (entry.events) {
                                            events.push(...entry.events);
                                        }
                                    });

                                    transactions.sort((a, b) => b.timestamp - a.timestamp);
                                    events.sort((a, b) => b.timestamp - a.timestamp);

                                    setCachedTransactions(transactions);
                                    setCachedEvents(events);
                                    console.log('🔄 Cache reloaded');
                                }}
                            >
                                🔄 Reload Cache
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        );
    }

    // Transaction Details Dialog
    const TransactionDetailsDialog = () => {
        console.log('🔍 Dialog render - selectedTx:', selectedTx, 'open:', !!selectedTx);
        return (
            <Dialog open={!!selectedTx} onClose={() => setSelectedTx(null)} maxWidth="md" fullWidth>
            <DialogTitle>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Transaction Details
                </Typography>
                {selectedTx && (
                    <Typography variant="body2" sx={{ color: '#64b5f6', fontFamily: 'monospace', mt: 1 }}>
                        {selectedTx.hash}
                    </Typography>
                )}
            </DialogTitle>
            <DialogContent>
                {selectedTx && (
                    <Box sx={{ pt: 2 }}>
                        {/* Basic Information */}
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2, color: '#64b5f6' }}>
                                📋 Basic Information
                            </Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                <Box>
                                    <Typography variant="body2" sx={{ color: '#888', mb: 0.5 }}>Block Number</Typography>
                                    <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                                        {selectedTx.blockNumber}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="body2" sx={{ color: '#888', mb: 0.5 }}>Timestamp</Typography>
                                    <Typography variant="body1">
                                        {formatDateTimeFull(selectedTx.timestamp)}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="body2" sx={{ color: '#888', mb: 0.5 }}>From</Typography>
                                    <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                                        {selectedTx.from}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="body2" sx={{ color: '#888', mb: 0.5 }}>To</Typography>
                                    <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                                        {selectedTx.to}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="body2" sx={{ color: '#888', mb: 0.5 }}>Value</Typography>
                                    <Typography variant="body1">
                                        {selectedTx.value} ETH
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="body2" sx={{ color: '#888', mb: 0.5 }}>Gas Used</Typography>
                                    <Typography variant="body1">
                                        {selectedTx.gasUsed}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="body2" sx={{ color: '#888', mb: 0.5 }}>Status</Typography>
                                    <Chip
                                        label={selectedTx.status}
                                        color={selectedTx.status === 'success' ? 'success' : 'error'}
                                        size="small"
                                    />
                                </Box>
                                <Box>
                                    <Typography variant="body2" sx={{ color: '#888', mb: 0.5 }}>Method</Typography>
                                    <Chip label={selectedTx.method || 'unknown'} size="small" />
                                </Box>
                            </Box>
                        </Box>

                        {/* Decoded Parameters */}
                        {selectedTx.decodedParams && Object.keys(selectedTx.decodedParams).length > 0 && (
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" sx={{ mb: 2, color: '#64b5f6' }}>
                                    🔍 Decoded Parameters
                                </Typography>
                                <Box sx={{ backgroundColor: 'rgba(100, 181, 246, 0.1)', p: 2, borderRadius: 2 }}>
                                    {Object.entries(selectedTx.decodedParams).map(([key, value]) => {
                                        if (key.startsWith('param')) return null; // Skip generic param names
                                        return (
                                            <Box key={key} sx={{ mb: 1 }}>
                                                <Typography variant="body2" sx={{ color: '#888', mb: 0.5 }}>
                                                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                </Typography>
                                                <Typography variant="body1" sx={{
                                                    fontFamily: typeof value === 'string' && value.startsWith('0x') ? 'monospace' : 'inherit',
                                                    wordBreak: 'break-all'
                                                }}>
                                                    {typeof value === 'string' && value.startsWith('0x') && value.length > 20
                                                        ? `${value.slice(0, 10)}...${value.slice(-8)}`
                                                        : String(value)
                                                    }
                                                </Typography>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Box>
                        )}

                        {/* Raw Transaction Data */}
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2, color: '#64b5f6' }}>
                                📄 Raw Transaction Data
                            </Typography>
                            <Box sx={{ backgroundColor: 'rgba(32, 33, 37, 0.5)', p: 2, borderRadius: 2 }}>
                                <Typography variant="body2" sx={{ color: '#888', mb: 1 }}>Transaction Hash</Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', mb: 2 }}>
                                    {selectedTx.hash}
                                </Typography>

                                {selectedTx.input && (
                                    <>
                                        <Typography variant="body2" sx={{ color: '#888', mb: 1 }}>Input Data</Typography>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                            {selectedTx.input}
                                        </Typography>
                                    </>
                                )}
                            </Box>
                        </Box>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setSelectedTx(null)} variant="outlined">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
        );
    };

    return (
        <>
            {(() => {
                if (currentPage === 'game') {
                    return (
                        <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #101010 0%, #1a1a1a 50%, #101010 100%)' }}>
                            {/* Game Intro Section */}
                            <Box sx={{ padding: { xs: "40px 20px 0", sm: "60px 40px 0" }, display: 'flex', justifyContent: 'center' }}>
                                <Box className="content-block fade-in" sx={{ width: '100%', maxWidth: '700px', borderRadius: '24px', p: { xs: 3, sm: 4 } }}>
                                    <GameIntro />
                                    <Alert severity="info" sx={{ mt: 2 }}>
                                        🎮 Demo Mode - Full functionality available offline
                                    </Alert>
                                    <Alert severity="success" sx={{ mt: 1 }}>
                                        ✅ Application loaded successfully - You can play immediately!
                                    </Alert>
                                </Box>
                            </Box>

                            {/* Game Content */}
                            <Box sx={{ padding: { xs: "30px 20px 0", sm: "50px 40px 0" }, display: 'flex', justifyContent: 'center' }}>
                                <div className="content-block fade-in" style={{ width: '100%', maxWidth: '700px', padding: '30px', borderRadius: '20px' }}>
                                    {/* Game Header */}
                                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                                        <Typography variant="h5" sx={{ color: '#64b5f6', fontWeight: 600, mb: 1 }}>
                                            🎯 Demo Game Mode
                                        </Typography>
                                        <Typography variant="body1" sx={{ color: '#b0b0b0' }}>
                                            Find the secret number between <span style={{ color: '#64b5f6', fontWeight: 600 }}>{demoGame.min_number}</span> and <span style={{ color: '#64b5f6', fontWeight: 600 }}>{demoGame.max_number}</span>
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#ff9800', mt: 1 }}>
                                            Secret number: 42 (for demo purposes)
                                        </Typography>
                                    </Box>

                                    {/* Attempts History */}
                                    {demoAttempts.length > 0 && (
                                        <Box sx={{ mb: 4 }}>
                                            <Typography variant="h6" sx={{ color: 'white', mb: 2, fontWeight: 600 }}>
                                                Your Attempts ({demoAttempts.length})
                                            </Typography>
                                            <Box sx={{
                                                maxHeight: '300px',
                                                overflowY: 'auto',
                                                '&::-webkit-scrollbar': {
                                                    width: '6px'
                                                },
                                                '&::-webkit-scrollbar-thumb': {
                                                    backgroundColor: 'rgba(100, 181, 246, 0.3)',
                                                    borderRadius: '3px'
                                                }
                                            }}>
                                                {demoAttempts.map(attempt => (
                                                    <Box
                                                        key={attempt.attemptNumber}
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            p: 2,
                                                            mb: 1,
                                                            borderRadius: '12px',
                                                            background: attempt.clue === null
                                                                ? 'rgba(255, 152, 0, 0.1)'
                                                                : attempt.clue === "Found"
                                                                    ? 'rgba(76, 175, 80, 0.1)'
                                                                    : 'rgba(32, 33, 37, 0.5)',
                                                            border: attempt.clue === null
                                                                ? '1px solid rgba(255, 152, 0, 0.3)'
                                                                : attempt.clue === "Found"
                                                                    ? '1px solid rgba(76, 175, 80, 0.3)'
                                                                    : '1px solid rgba(255, 255, 255, 0.1)'
                                                        }}
                                                    >
                                                        {attempt.clue === null ? (
                                                            <>
                                                                <Typography variant="body2" sx={{ mr: 2, color: '#ff9800' }}>
                                                                    Attempt #{attempt.attemptNumber}
                                                                </Typography>
                                                                <BlockchainLoader message="Processing on demo blockchain..." size="small" />
                                                                <Typography variant="body2" sx={{ ml: 2, color: '#b0b0b0' }}>
                                                                    Guessed: {attempt.guess}
                                                                </Typography>
                                                            </>
                                                        ) : attempt.clue === "Less" ? (
                                                            <>
                                                                <Typography variant="body2" sx={{ color: '#f44336', mr: 2 }}>
                                                                    #{attempt.attemptNumber}
                                                                </Typography>
                                                                <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                                                                    My number is <span style={{ color: '#f44336', fontWeight: 600 }}>less than</span> {attempt.guess}
                                                                </Typography>
                                                            </>
                                                        ) : attempt.clue === "More" ? (
                                                            <>
                                                                <Typography variant="body2" sx={{ color: '#4caf50', mr: 2 }}>
                                                                    #{attempt.attemptNumber}
                                                                </Typography>
                                                                <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                                                                    My number is <span style={{ color: '#4caf50', fontWeight: 600 }}>more than</span> {attempt.guess}
                                                                </Typography>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Typography variant="body2" sx={{ color: '#4caf50', mr: 2 }}>
                                                                    #{attempt.attemptNumber} 🎉
                                                                </Typography>
                                                                <Typography variant="body2" sx={{ color: '#4caf50', fontWeight: 600 }}>
                                                                    Congratulations! You found the number {attempt.guess}!
                                                                </Typography>
                                                            </>
                                                        )}
                                                    </Box>
                                                ))}
                                            </Box>
                                        </Box>
                                    )}

                                    {/* Make Guess Component */}
                                    <Box sx={{ padding: { xs: "30px 0 0", sm: "40px 0 0" }, display: 'flex', justifyContent: 'center' }}>
                                        <Box
                                            className="content-block fade-in"
                                            sx={{
                                                display: 'flex',
                                                flexDirection: { xs: 'column', sm: 'row' },
                                                alignItems: 'center',
                                                gap: 2,
                                                p: 3,
                                                width: '100%',
                                                maxWidth: '500px',
                                                borderRadius: '16px'
                                            }}
                                        >
                                            <TextField
                                                value={guessInput}
                                                onChange={(e) => setGuessInput(e.target.value)}
                                                label="Enter your guess"
                                                variant="outlined"
                                                type="number"
                                                disabled={isGuessing || demoGame.status === 'completed'}
                                                sx={{
                                                    flex: 1,
                                                    '& .MuiOutlinedInput-root': {
                                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                        transition: 'all 0.3s ease',
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                                        },
                                                        '&.Mui-focused': {
                                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                        }
                                                    }
                                                }}
                                                InputLabelProps={{ sx: { color: '#b0b0b0' } }}
                                                inputProps={{ sx: { color: 'white' } }}
                                            />
                                            <Button
                                                onClick={handleDemoGuess}
                                                variant="contained"
                                                disabled={isGuessing || demoGame.status === 'completed' || !guessInput}
                                                sx={{
                                                    minWidth: { xs: '100%', sm: '140px' },
                                                    height: '56px',
                                                    position: 'relative'
                                                }}
                                            >
                                                {isGuessing ? (
                                                    <>
                                                        <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                                                        Processing...
                                                    </>
                                                ) : (
                                                    '🚀 Make Guess'
                                                )}
                                            </Button>
                                        </Box>
                                    </Box>

                                    {/* New Game Button */}
                                    {demoGame.status === 'completed' && (
                                        <Box sx={{ textAlign: 'center', mt: 4 }}>
                                            <Button
                                                onClick={startNewDemoGame}
                                                variant="contained"
                                                color="success"
                                                size="large"
                                            >
                                                🎮 Start New Demo Game
                                            </Button>
                                        </Box>
                                    )}
                                </div>
                            </Box>
                        </Box>
                    );
                }

                if (currentPage === 'explorer') {
                    return (
                        <Box sx={{ width: '100%', p: 2 }}>
                            <Typography variant="h4" gutterBottom>
                                Contract Explorer - Demo Mode
                            </Typography>

                            <Alert severity={cachedTransactions.length > 0 ? "success" : "warning"} sx={{ mb: 2 }}>
                                {cachedTransactions.length > 0
                                    ? `💾 Cache Mode - Using ${cachedTransactions.length} cached transactions`
                                    : "🚨 Demo Mode - No cached data found, using demo data"
                                }
                            </Alert>

                            <Alert severity="info" sx={{ mb: 2 }}>
                                Connected to Local Cache • Contract: 0xDEMO1234567890abcdef • {cachedTransactions.length > 0 ? 'Real cached data' : 'Demo data'}
                            </Alert>

                            <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
                                <Tab label="Contract State" />
                                <Tab label="Transactions" />
                                <Tab label="Events" />
                                <Tab label="Contract Calls" />
                            </Tabs>

                            {/* Contract State Tab */}
                            {activeTab === 0 && (
                                <Card className="fade-in-scale card-hover" sx={{ mb: 2 }}>
                                    <CardHeader title="Contract State" />
                                    <CardContent>
                                        <Typography><strong>Game Number:</strong> {demoGame.game_number}</Typography>
                                        <Typography><strong>Min Number:</strong> {demoGame.min_number}</Typography>
                                        <Typography><strong>Max Number:</strong> {demoGame.max_number}</Typography>
                                        <Typography><strong>Attempts:</strong> {demoGame.attempt}</Typography>
                                        <Typography><strong>Last Guess:</strong> {demoGame.last_guess || 'None'}</Typography>
                                        <Typography><strong>Last Clue:</strong> {demoGame.last_clue || 'None'}</Typography>
                                        <Typography><strong>Status:</strong> {demoGame.status}</Typography>
                                        <Typography><strong>Network:</strong> Demo Mode</Typography>
                                        <Typography><strong>Contract Address:</strong> 0xDEMO1234567890abcdef</Typography>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Transactions Tab */}
                            {activeTab === 1 && (
                                <Card sx={{ mb: 2 }}>
                                    <CardHeader title={`Transaction History (${cachedTransactions.length > 0 ? 'Cached Data' : 'Demo Data'})`} />
                                    <CardContent>
                                        <TableContainer component={Paper}>
                                            <Table>
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>Hash</TableCell>
                                                        <TableCell>Block</TableCell>
                                                        <TableCell>Date/Time</TableCell>
                                                        <TableCell>Method</TableCell>
                                                        <TableCell>Parameters</TableCell>
                                                        <TableCell>From</TableCell>
                                                        <TableCell>Status</TableCell>
                                                        <TableCell>Gas Used</TableCell>
                                                        <TableCell>Actions</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {demoTransactions.map((tx) => (
                                                        <TableRow key={tx.hash}>
                                                            <TableCell>
                                                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                                    {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell>{tx.blockNumber}</TableCell>
                                                            <TableCell>
                                                                <Box>
                                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                                        {formatDateShort(tx.timestamp)}
                                                                    </Typography>
                                                                    <Typography variant="caption" sx={{ color: '#888', fontSize: '0.7rem' }}>
                                                                        {formatTimeShort(tx.timestamp)}
                                                                    </Typography>
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Chip label={tx.method || 'unknown'} size="small" />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#64b5f6' }}>
                                                                    {formatParameters(tx.decodedParams || {})}
                                                                </Typography>
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
                                                                    variant="outlined"
                                                                    sx={{ minWidth: '60px' }}
                                                                >
                                                                    View
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

                            {/* Events Tab */}
                            {activeTab === 2 && (
                                <Card>
                                    <CardHeader title={`Contract Events (${cachedEvents.length > 0 ? 'Cached Data' : 'Demo Data'})`} />
                                    <CardContent>
                                        <TableContainer component={Paper}>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>Event</TableCell>
                                                        <TableCell>Block</TableCell>
                                                        <TableCell>Parameters</TableCell>
                                                        <TableCell>Tx Hash</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {demoEvents.map((event, index) => (
                                                        <TableRow key={index} hover>
                                                            <TableCell>
                                                                <Chip
                                                                    label={event.event}
                                                                    size="small"
                                                                    color={
                                                                        event.event === 'NewGame' ? 'success' :
                                                                        event.event === 'GuessMade' ? 'primary' : 'default'
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell>{event.blockNumber}</TableCell>
                                                            <TableCell>
                                                                <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#64b5f6' }}>
                                                                    {Object.entries(event.decodedParams || {}).map(([key, value]) => `${key}: ${value}`).join(' • ')}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                                                                    {event.transactionHash.slice(0, 8)}...{event.transactionHash.slice(-6)}
                                                                </Typography>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Contract Calls Tab */}
                            {activeTab === 3 && (
                                <Card>
                                    <CardHeader title="Contract Calls" />
                                    <CardContent>
                                        <Typography variant="body1" sx={{ color: '#b0b0b0', textAlign: 'center', py: 4 }}>
                                            Contract calls are not available in offline mode.
                                            <br />
                                            Connect to a blockchain network to interact with smart contracts.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )}
                        </Box>
                    );
                }

                if (currentPage === 'debug') {
                    return (
                        <Box sx={{ width: '100%', p: 2 }}>
                            <Typography variant="h4" gutterBottom>
                                Debug Page - Demo Mode
                            </Typography>

                            <Alert severity="warning" sx={{ mb: 2 }}>
                                🚨 Demo Mode - No blockchain connection
                            </Alert>

                            <Card>
                                <CardHeader title="System Information" />
                                <CardContent>
                                    <Typography><strong>Mode:</strong> Offline/Cache</Typography>
                                    <Typography><strong>Timestamp:</strong> {new Date().toISOString()}</Typography>
                                    <Typography><strong>User Agent:</strong> {navigator.userAgent}</Typography>
                                    <Typography><strong>Local Storage:</strong> {typeof localStorage !== 'undefined' ? 'Available' : 'Not Available'}</Typography>
                                    <Typography><strong>Demo Game Status:</strong> {demoGame.status}</Typography>
                                    <Typography><strong>Demo Attempts:</strong> {demoAttempts.length}</Typography>
                                    <Typography><strong>Cached Transactions:</strong> {cachedTransactions.length}</Typography>
                                    <Typography><strong>Cached Events:</strong> {cachedEvents.length}</Typography>
                                    <Typography><strong>Cache Source:</strong> {cachedTransactions.length > 0 ? 'Real blockchain data' : 'Demo data'}</Typography>
                                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="warning"
                                            onClick={() => {
                                                localStorage.removeItem(CACHE_KEY);
                                                setCachedTransactions([]);
                                                setCachedEvents([]);
                                                console.log('🗑️ Cache cleared');
                                            }}
                                        >
                                            🗑️ Clear Cache
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="info"
                                            onClick={() => {
                                                // Force reload of cached data
                                                const cache = getCache();
                                                const transactions: any[] = [];
                                                const events: any[] = [];

                                                Object.values(cache.entries).forEach(entry => {
                                                    if (entry.transactions) {
                                                        transactions.push(...entry.transactions);
                                                    }
                                                    if (entry.events) {
                                                        events.push(...entry.events);
                                                    }
                                                });

                                                transactions.sort((a, b) => b.timestamp - a.timestamp);
                                                events.sort((a, b) => b.timestamp - a.timestamp);

                                                setCachedTransactions(transactions);
                                                setCachedEvents(events);
                                                console.log('🔄 Cache reloaded');
                                            }}
                                        >
                                            🔄 Reload Cache
                                        </Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Box>
                    );
                }

                return null;
            })()}

            {/* Transaction Details Dialog */}
            <TransactionDetailsDialog />
        </>
    );
}