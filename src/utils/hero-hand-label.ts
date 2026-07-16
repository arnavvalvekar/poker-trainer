import type { Card } from '../types/poker';
import { cardsToHandNotation } from './hand-notation';
import { evaluateHand } from '../engine/hand-evaluator';

/**
 * Get the label to display above hero's hole cards.
 * - Preflop (board < 3 cards): starting hand notation (e.g. "KJo", "AKs")
 * - Postflop (board >= 3 cards): made hand name (e.g. "Pair of Kings")
 * - Returns null if no cards or not enough cards to evaluate
 */
export function getHeroHandLabel(
  holeCards: Card[],
  board: Card[],
  folded: boolean = false,
): string | null {
  if (holeCards.length !== 2 || folded) {
    return null;
  }

  // Preflop: show starting hand notation
  if (board.length < 3) {
    return cardsToHandNotation(holeCards);
  }

  // Postflop: show made hand name from evaluator
  try {
    const evaluated = evaluateHand(holeCards, board);
    return evaluated.name;
  } catch {
    // If evaluation fails (shouldn't happen with board >= 3), fall back to notation
    return cardsToHandNotation(holeCards);
  }
}
