export type Suit = 's' | 'h' | 'd' | 'c';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export type Card = `${Rank}${Suit}`;

export type Position = 'UTG' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';

export type Street = 'preflop' | 'flop' | 'turn' | 'river';

export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

export type HandResult = 'win' | 'loss' | 'split';

export interface Player {
  id: number;
  name: string;
  position: Position;
  stack: number;
  holeCards: Card[];
  isHero: boolean;
  isAI: boolean;
  folded: boolean;
  allIn: boolean;
  betThisStreet: number;
  totalBetThisHand: number;
}

export interface GameAction {
  playerId: number;
  action: ActionType;
  amount: number;
  street: Street;
  timestamp: number;
}

export interface Pot {
  amount: number;
  eligiblePlayerIds: number[];
}

export interface GameConfig {
  smallBlind: number;
  bigBlind: number;
  startingStackBB: number;
  playerCount: number;
}

export interface ValidActions {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  canBet: boolean;
  minBet: number;
  maxBet: number;
  canRaise: boolean;
  minRaise: number;
  maxRaise: number;
}

export type GamePhase =
  | 'waiting'
  | 'preflop'
  | 'flop'
  | 'turn'
  | 'river'
  | 'showdown'
  | 'hand-complete';

export interface GameState {
  handNumber: number;
  phase: GamePhase;
  street: Street;
  players: Player[];
  board: Card[];
  pots: Pot[];
  actions: GameAction[];
  dealerIndex: number;
  currentPlayerIndex: number;
  currentBet: number;
  minRaise: number;
  lastAggressorIndex: number | null;
  config: GameConfig;
}

export interface ShowdownResult {
  playerId: number;
  handName: string;
  handRank: number;
  cards: Card[];
  wonAmount: number;
}

export interface HandSummary {
  winners: ShowdownResult[];
  board: Card[];
  handNumber: number;
  totalPot: number;
  actions: GameAction[];
}

export interface HandHistoryEntry {
  handNumber: number;
  timestamp: number;
  heroCards: Card[];
  board: Card[];
  result: HandResult;
  stackChange: number;
  winnerName: string;
  winningHand: string;
  totalPot: number;
  actions: GameAction[];
  heroPosition?: Position;
}

export interface SessionStats {
  handsPlayed: number;
  wins: number;
  losses: number;
  splits: number;
  totalProfit: number;
  winRate: number;
  avgDecisionAccuracy: number;
  positionalStats: Record<Position, { hands: number; profit: number }>;
}
