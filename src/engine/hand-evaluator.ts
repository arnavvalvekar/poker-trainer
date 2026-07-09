import type { Card, Rank } from '../types/poker';
import { rankValue } from './deck';

export type HandCategory =
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'three-of-a-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-of-a-kind'
  | 'straight-flush';

export interface EvaluatedHand {
  category: HandCategory;
  rank: number;
  name: string;
  bestFive: Card[];
  kickers: number[];
}

const CATEGORY_NAMES: Record<HandCategory, string> = {
  'high-card': 'High Card',
  pair: 'Pair',
  'two-pair': 'Two Pair',
  'three-of-a-kind': 'Three of a Kind',
  straight: 'Straight',
  flush: 'Flush',
  'full-house': 'Full House',
  'four-of-a-kind': 'Four of a Kind',
  'straight-flush': 'Straight Flush',
};

const CATEGORY_BASE: Record<HandCategory, number> = {
  'high-card': 0,
  pair: 1_000_000,
  'two-pair': 2_000_000,
  'three-of-a-kind': 3_000_000,
  straight: 4_000_000,
  flush: 5_000_000,
  'full-house': 6_000_000,
  'four-of-a-kind': 7_000_000,
  'straight-flush': 8_000_000,
};

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map((c) => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function isFlush(cards: Card[]): boolean {
  const suit = cards[0][1];
  return cards.every((c) => c[1] === suit);
}

function isStraight(values: number[]): { isStraight: boolean; high: number } {
  const unique = [...new Set(values)].sort((a, b) => b - a);
  if (unique.length < 5) return { isStraight: false, high: 0 };

  for (let i = 0; i <= unique.length - 5; i++) {
    const slice = unique.slice(i, i + 5);
    if (slice[0] - slice[4] === 4) {
      return { isStraight: true, high: slice[0] };
    }
  }

  if (unique.includes(14) && unique.includes(5) && unique.includes(4) &&
      unique.includes(3) && unique.includes(2)) {
    return { isStraight: true, high: 5 };
  }

  return { isStraight: false, high: 0 };
}

function countRanks(cards: Card[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const card of cards) {
    const v = rankValue(card[0] as Rank);
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return counts;
}

function evaluateFive(cards: Card[]): EvaluatedHand {
  const values = cards.map((c) => rankValue(c[0] as Rank)).sort((a, b) => b - a);
  const counts = countRanks(cards);
  const countEntries = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  const flush = isFlush(cards);
  const straight = isStraight(values);

  if (flush && straight.isStraight) {
    return makeHand('straight-flush', straight.high, cards, [straight.high]);
  }
  if (countEntries[0][1] === 4) {
    const quad = countEntries[0][0];
    const kicker = countEntries[1][0];
    return makeHand('four-of-a-kind', quad, cards, [quad, kicker]);
  }
  if (countEntries[0][1] === 3 && countEntries[1][1] === 2) {
    return makeHand('full-house', countEntries[0][0], cards, [countEntries[0][0], countEntries[1][0]]);
  }
  if (flush) {
    return makeHand('flush', values[0], cards, values);
  }
  if (straight.isStraight) {
    return makeHand('straight', straight.high, cards, [straight.high]);
  }
  if (countEntries[0][1] === 3) {
    const trips = countEntries[0][0];
    const kickers = countEntries.filter((e) => e[1] === 1).map((e) => e[0]);
    return makeHand('three-of-a-kind', trips, cards, [trips, ...kickers]);
  }
  if (countEntries[0][1] === 2 && countEntries[1][1] === 2) {
    const highPair = Math.max(countEntries[0][0], countEntries[1][0]);
    const lowPair = Math.min(countEntries[0][0], countEntries[1][0]);
    const kicker = countEntries.find((e) => e[1] === 1)![0];
    return makeHand('two-pair', highPair, cards, [highPair, lowPair, kicker]);
  }
  if (countEntries[0][1] === 2) {
    const pair = countEntries[0][0];
    const kickers = countEntries.filter((e) => e[1] === 1).map((e) => e[0]);
    return makeHand('pair', pair, cards, [pair, ...kickers]);
  }

  return makeHand('high-card', values[0], cards, values);
}

function makeHand(
  category: HandCategory,
  primary: number,
  cards: Card[],
  kickers: number[],
): EvaluatedHand {
  const rankScore = kickers.reduce(
    (acc, k, i) => acc + k * Math.pow(15, 4 - i),
    CATEGORY_BASE[category] + primary * 15,
  );
  const rankName = rankToName(primary);
  let name = CATEGORY_NAMES[category];
  if (category === 'pair') {
    name = `Pair of ${rankName}s`;
  } else if (category === 'four-of-a-kind') {
    name = `Four ${rankName}s`;
  } else if (category === 'three-of-a-kind') {
    name = `Three ${rankName}s`;
  } else if (category === 'high-card') {
    name = `${rankName} High`;
  }

  return {
    category,
    rank: rankScore,
    name,
    bestFive: cards,
    kickers,
  };
}

function rankToName(value: number): string {
  const names: Record<number, string> = {
    14: 'Ace', 13: 'King', 12: 'Queen', 11: 'Jack', 10: 'Ten',
    9: 'Nine', 8: 'Eight', 7: 'Seven', 6: 'Six', 5: 'Five',
    4: 'Four', 3: 'Three', 2: 'Two',
  };
  return names[value] ?? String(value);
}

export function evaluateHand(holeCards: Card[], board: Card[]): EvaluatedHand {
  const allCards = [...holeCards, ...board];
  if (allCards.length < 5) {
    throw new Error('Need at least 5 cards to evaluate');
  }

  let best: EvaluatedHand | null = null;
  const combos = combinations(allCards, 5);

  for (const five of combos) {
    const evaluated = evaluateFive(five);
    if (!best || evaluated.rank > best.rank) {
      best = evaluated;
    }
  }

  return best!;
}

export function compareHands(a: EvaluatedHand, b: EvaluatedHand): number {
  return a.rank - b.rank;
}
