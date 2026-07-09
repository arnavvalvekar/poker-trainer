import type { Card, Rank, Suit } from '../types/poker';

export interface EVSimRequest {
  heroCards: Card[];
  board: Card[];
  numOpponents: number;
  potSize: number;
  callAmount: number;
  betAmount: number;
  simulations: number;
}

export interface EVSimResult {
  foldEV: number;
  callEV: number;
  betEV: number;
  callWinRate: number;
  betWinRate: number;
  bestAction: 'fold' | 'call' | 'bet';
}

const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const SUITS: Suit[] = ['s', 'h', 'd', 'c'];

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}${suit}`);
    }
  }
  return deck;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rankValue(rank: Rank): number {
  const v: Record<Rank, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
    '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
  };
  return v[rank];
}

function evaluate5(cards: Card[]): number {
  const values = cards.map((c) => rankValue(c[0] as Rank)).sort((a, b) => b - a);
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  const isFlush = cards.every((c) => c[1] === cards[0][1]);
  const unique = [...new Set(values)].sort((a, b) => b - a);
  let isStraight = false;
  for (let i = 0; i <= unique.length - 5; i++) {
    if (unique[i] - unique[i + 4] === 4) { isStraight = true; break; }
  }

  if (isFlush && isStraight) return 8_000_000 + values[0];
  if (entries[0][1] === 4) return 7_000_000 + entries[0][0] * 100;
  if (entries[0][1] === 3 && entries[1][1] === 2) return 6_000_000 + entries[0][0] * 100;
  if (isFlush) return 5_000_000 + values[0];
  if (isStraight) return 4_000_000 + values[0];
  if (entries[0][1] === 3) return 3_000_000 + entries[0][0] * 100;
  if (entries[0][1] === 2 && entries[1][1] === 2) return 2_000_000 + entries[0][0] * 100;
  if (entries[0][1] === 2) return 1_000_000 + entries[0][0] * 100;
  return values[0];
}

function bestHand(cards: Card[]): number {
  if (cards.length < 5) return 0;
  let best = 0;
  const combos = combinations(cards, 5);
  for (const c of combos) {
    best = Math.max(best, evaluate5(c));
  }
  return best;
}

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  return [
    ...combinations(rest, k - 1).map((c) => [first, ...c]),
    ...combinations(rest, k),
  ];
}

function simulate(req: EVSimRequest): { wins: number; ties: number } {
  let wins = 0;
  let ties = 0;
  const used = new Set([...req.heroCards, ...req.board]);

  for (let i = 0; i < req.simulations; i++) {
    const deck = shuffle(createDeck().filter((c) => !used.has(c)));
    let idx = 0;

    const board = [...req.board];
    while (board.length < 5) {
      board.push(deck[idx++]);
    }

    const heroRank = bestHand([...req.heroCards, ...board]);

    const oppRanks: number[] = [];
    for (let o = 0; o < req.numOpponents; o++) {
      const hole = [deck[idx++], deck[idx++]] as Card[];
      oppRanks.push(bestHand([...hole, ...board]));
    }

    const maxOpp = Math.max(...oppRanks);
    if (heroRank > maxOpp) wins++;
    else if (heroRank === maxOpp) ties++;
  }

  return { wins, ties };
}

self.onmessage = (e: MessageEvent<EVSimRequest>) => {
  const req = e.data;
  const sims = req.simulations;

  const callResult = simulate(req);
  const betResult = simulate(req);

  const callWinRate = (callResult.wins + callResult.ties * 0.5) / sims;
  const betWinRate = (betResult.wins + betResult.ties * 0.5) / sims;

  const foldEV = 0;
  const callEV = callWinRate * (req.potSize + req.callAmount) - req.callAmount;
  const betEV = betWinRate * (req.potSize + req.betAmount) - req.betAmount * (1 - betWinRate);

  const options = [
    { action: 'fold' as const, ev: foldEV },
    { action: 'call' as const, ev: callEV },
    { action: 'bet' as const, ev: betEV },
  ];
  const best = options.reduce((a, b) => (b.ev > a.ev ? b : a));

  const result: EVSimResult = {
    foldEV,
    callEV,
    betEV,
    callWinRate,
    betWinRate,
    bestAction: best.action,
  };

  self.postMessage(result);
};

export {};
