import { NETWORK_CONFIG } from "../config";

export type IndexerToken = {
  id: string;
  tokenId: string;
  ownerAddress: string;
  maxAttempts: string;
  mintedAt: string | null;
  mintedAtBlock: number | null;
  burnt: boolean;
  burntAt: string | null;
  burntAtBlock: number | null;
};

export type TokensQueryResult = {
  data: { tokens: IndexerToken[] };
};

const TOKENS_FIELDS = `
  mintedAt
  mintedAtBlock
  ownerAddress
  tokenId
  maxAttempts
  burnt
  burntAt
  burntAtBlock
  id
`;

/** Fetch all tokens from the indexer */
export async function fetchAllTokens(): Promise<IndexerToken[]> {
  const query = `query Tokens { tokens { ${TOKENS_FIELDS} } }`;
  const res = await fetch(NETWORK_CONFIG.INDEXER_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    throw new Error(`Indexer request failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as TokensQueryResult;
  if (!json?.data?.tokens) {
    return [];
  }
  return json.data.tokens;
}

/** Fetch tokens owned by a specific address (H160) */
export async function fetchTokensByOwner(ownerAddress: string): Promise<IndexerToken[]> {
  const query = `query TokensByOwner($ownerAddress: String!) {
    tokens(where: { ownerAddress_eq: $ownerAddress }) { ${TOKENS_FIELDS} }
  }`;
  const res = await fetch(NETWORK_CONFIG.INDEXER_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { ownerAddress } }),
  });
  if (!res.ok) {
    throw new Error(`Indexer request failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as TokensQueryResult;
  if (!json?.data?.tokens) {
    return [];
  }
  return json.data.tokens;
}

export type PlayerMaxMaxAttemptsResult = {
  data: { players: Array<{ maxMaxAttempts: string | null }> };
};

export type GuessHistoryItem = {
  attemptNumber: number;
  guess: number;
  result: string; // "Less", "More", "Found", "Pending"
};

export type IndexerGame = {
  id: string;
  isOver: boolean;
  lastClue: string | null;
  lastGuess: number | null;
  maxAttempts: string | null;
  maxNumber: number;
  minNumber: number;
  playerAddress: string;
  attempt: number;
  cancelled: boolean | null;
  createdAt: string;
  createdAtBlock: number;
  gameNumber: string;
  guessHistory: GuessHistoryItem[];
  /** Cible (nombre à trouver), disponible quand la partie est terminée (game_over) */
  target?: number;
};

export type GameQueryResult = {
  data: { games: IndexerGame[] };
};

/** Fetch game data by player address and game number */
export async function fetchGameByNumber(
  playerAddress: string,
  gameNumber: string | number | bigint
): Promise<IndexerGame | null> {
  const query = `query Game($playerAddress: String!, $gameNumber: BigInt!) {
    games(where: {playerAddress_eq: $playerAddress, gameNumber_eq: $gameNumber}) {
      id
      isOver
      lastClue
      lastGuess
      maxAttempts
      maxNumber
      minNumber
      playerAddress
      attempt
      cancelled
      createdAt
      createdAtBlock
      gameNumber
      guessHistory {
        attemptNumber
        guess
        result
      }
    }
  }`;
  
  const gameNumberStr = typeof gameNumber === 'bigint' 
    ? gameNumber.toString() 
    : String(gameNumber);
    
  const res = await fetch(NETWORK_CONFIG.INDEXER_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      query, 
      variables: { 
        playerAddress, 
        gameNumber: gameNumberStr 
      } 
    }),
  });
  
  if (!res.ok) {
    throw new Error(`Indexer request failed: ${res.status} ${res.statusText}`);
  }
  
  const json = (await res.json()) as GameQueryResult;
  if (!json?.data?.games || json.data.games.length === 0) {
    return null;
  }
  
  return json.data.games[0];
}

/** Fetch maxMaxAttempts for a player by address (H160) */
export async function fetchMaxMaxAttempts(playerAddress: string): Promise<number | null> {
  const query = `query MaxMaxAttempts($id: String!) {
    players(where: { id_eq: $id }) {
      maxMaxAttempts
    }
  }`;
  const res = await fetch(NETWORK_CONFIG.INDEXER_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { id: playerAddress } }),
  });
  if (!res.ok) {
    throw new Error(`Indexer request failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as PlayerMaxMaxAttemptsResult;
  if (!json?.data?.players || json.data.players.length === 0) {
    return null;
  }
  const maxMaxAttempts = json.data.players[0]?.maxMaxAttempts;
  return maxMaxAttempts != null ? parseInt(maxMaxAttempts, 10) : null;
}
