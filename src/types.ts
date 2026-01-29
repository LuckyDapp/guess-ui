// Game-related types
export type ClueType = "More" | "Less" | "Found";

export type Clue = {
  type: ClueType;
  value: undefined;
};

export type Attempt = {
  gameNumber: bigint;
  attemptNumber: number;
  guess: number;
  clue: Clue | undefined;
};

export type Game = {
  game_number: bigint;
  min_number: number;
  max_number: number;
  attempt: number;
  last_guess: number | undefined;
  last_clue: Clue | undefined;
};

// Game context types
export type GameContextType = {
  game: Game | undefined;
  getAttempts: () => Attempt[];
  refreshGuesses: () => void;
  refreshGame: () => void;
  isGameCompleted: () => boolean;
};

// UI component props
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Form validation types
export interface GameFormData {
  minNumber: number;
  maxNumber: number;
}

export interface GuessFormData {
  guess: number;
}

// Error types
export interface GameError {
  message: string;
  code?: string;
  field?: string;
}

// Animation types
export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
}

// Theme types
export interface ThemeColors {
  primary: string;
  secondary: string;
  success: string;
  error: string;
  warning: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
}

// Game event types
export interface GameEvent {
  id: string;
  timestamp: number;
  blockNumber?: number;
  eventType: 'guess_submitted' | 'guess_result' | 'game_started' | 'game_over';
  data: {
    gameNumber?: bigint;
    attemptNumber?: number;
    guess?: number;
    result?: 'More' | 'Less' | 'Found';
    minNumber?: number;
    maxNumber?: number;
    maxAttempts?: number; // V2: max_attempts dans NewGame
    player?: string; // V2: player dans GuessMade, ClueGiven, GameOver
    win?: boolean; // V2: win dans GameOver
    target?: number; // V2: target dans GameOver
  };
  txHash?: string;
}

// Transaction history types
export interface TransactionHistory {
  id: string;
  timestamp: number;
  txHash?: string;
  blockNumber?: number;
  call: string;
  parameters: Record<string, any>;
  status: 'pending' | 'submitted' | 'finalized' | 'error';
  error?: string;
  gasUsed?: string;
  fee?: string;
  events?: GameEvent[]; // Événements associés à cette transaction
}

// Transaction history context types
export interface TransactionHistoryContextType {
  transactions: TransactionHistory[];
  addTransaction: (transaction: Omit<TransactionHistory, 'id' | 'timestamp'>) => string;
  updateTransaction: (id: string, updates: Partial<TransactionHistory>) => void;
  addEventToTransaction: (txId: string, event: Omit<GameEvent, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
  getTransactionsByCall: (call: string) => TransactionHistory[];
  getGameEvents: () => GameEvent[];
}
