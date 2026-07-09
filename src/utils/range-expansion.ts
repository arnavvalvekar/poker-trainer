import type { Rank } from '../types/poker';

const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

function rankIndex(r: Rank): number {
  return RANKS.indexOf(r);
}

/** Expand a range string like "AA-22", "AK", "ATs+" into hand notations. */
export function expandRange(rangeStr: string): string[] {
  const parts = rangeStr.split(',').map((s) => s.trim()).filter(Boolean);
  const result = new Set<string>();

  for (const part of parts) {
    if (part.includes('-')) {
      expandDashRange(part, result);
    } else if (part.endsWith('+')) {
      expandPlusRange(part.slice(0, -1), result);
    } else {
      result.add(normalizeHand(part));
    }
  }

  return [...result];
}

function normalizeHand(hand: string): string {
  if (hand.length === 2) {
    const r1 = hand[0] as Rank;
    const r2 = hand[1] as Rank;
    if (r1 === r2) return `${r1}${r2}`;
    const hi = rankIndex(r1) > rankIndex(r2) ? r1 : r2;
    const lo = rankIndex(r1) > rankIndex(r2) ? r2 : r1;
    return `${hi}${lo}o`;
  }
  return hand;
}

function expandDashRange(range: string, result: Set<string>): void {
  const [start, end] = range.split('-').map((s) => s.trim());
  if (!start || !end) return;

  if (start.length === 2 && start[0] === start[1]) {
    const startIdx = rankIndex(start[0] as Rank);
    const endIdx = rankIndex(end[0] as Rank);
    const lo = Math.min(startIdx, endIdx);
    const hi = Math.max(startIdx, endIdx);
    for (let i = hi; i >= lo; i--) {
      result.add(`${RANKS[i]}${RANKS[i]}`);
    }
    return;
  }

  const baseRank = start[0] as Rank;
  const startKicker = start[1] as Rank;
  const endKicker = end[1] as Rank;
  const suited = start.endsWith('s') || end.endsWith('s');
  const suffix = suited ? 's' : start.endsWith('o') || end.endsWith('o') ? 'o' : 'o';

  const lo = Math.min(rankIndex(startKicker), rankIndex(endKicker));
  const hi = Math.max(rankIndex(startKicker), rankIndex(endKicker));
  for (let i = hi; i >= lo; i--) {
    if (RANKS[i] !== baseRank) {
      result.add(`${baseRank}${RANKS[i]}${suffix}`);
    }
  }
}

function expandPlusRange(hand: string, result: Set<string>): void {
  if (hand.length === 2 && hand[0] === hand[1]) {
    const idx = rankIndex(hand[0] as Rank);
    for (let i = RANKS.length - 1; i >= idx; i--) {
      result.add(`${RANKS[i]}${RANKS[i]}`);
    }
    return;
  }

  const baseRank = hand[0] as Rank;
  const kicker = hand[1] as Rank;
  const suited = hand.endsWith('s');
  const suffix = suited ? 's' : 'o';
  const targetIdx = rankIndex(kicker);

  for (let i = RANKS.length - 1; i >= targetIdx; i--) {
    if (RANKS[i] !== baseRank) {
      result.add(`${baseRank}${RANKS[i]}${suffix}`);
    }
  }
}

export function isHandInRange(hand: string, range: string[]): boolean {
  return range.includes(hand);
}

export function getRangeFrequency(
  hand: string,
  frequencies: Record<string, number> | undefined,
  defaultFreq = 1,
): number {
  return frequencies?.[hand] ?? defaultFreq;
}
