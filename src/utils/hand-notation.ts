import type { Card, Rank } from '../types/poker';
import { rankValue } from '../engine/deck';

const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

/** Standard 169-hand strength ordering (1 = AA, 169 = 32o). */
export const HAND_STRENGTH_ORDER: string[] = (() => {
  const hands: string[] = [];
  for (let i = RANKS.length - 1; i >= 0; i--) {
    for (let j = i; j >= 0; j--) {
      const hi = RANKS[i];
      const lo = RANKS[j];
      if (i === j) hands.push(`${hi}${lo}`);
      else {
        hands.push(`${hi}${lo}s`);
        hands.push(`${hi}${lo}o`);
      }
    }
  }
  return hands;
})();

export function cardsToHandNotation(holeCards: Card[]): string {
  if (holeCards.length !== 2) return '';

  const [c1, c2] = holeCards;
  const r1 = c1[0] as Rank;
  const r2 = c2[0] as Rank;
  const v1 = rankValue(r1);
  const v2 = rankValue(r2);

  const hi = v1 >= v2 ? r1 : r2;
  const lo = v1 >= v2 ? r2 : r1;

  if (hi === lo) return `${hi}${lo}`;
  const suited = c1[1] === c2[1];
  return `${hi}${lo}${suited ? 's' : 'o'}`;
}

export function handStrengthRank(notation: string): number {
  const idx = HAND_STRENGTH_ORDER.indexOf(notation);
  return idx === -1 ? 169 : idx + 1;
}

export function handStrengthPercentile(notation: string): number {
  const rank = handStrengthRank(notation);
  return Math.round((1 - (rank - 1) / 168) * 100);
}
