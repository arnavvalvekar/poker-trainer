import type { Position } from '../types/poker';
import { cardsToHandNotation, handStrengthRank } from '../utils/hand-notation';

const POSITION_THRESHOLDS: Record<Position, number> = {
  UTG: 40,
  HJ: 55,
  CO: 75,
  BTN: 110,
  SB: 90,
  BB: 120,
};

export interface PositionAnalysis {
  handRank: number;
  positionThreshold: number;
  percentile: number;
  message: string;
  appropriate: boolean;
}

export function analyzePosition(
  holeCards: string[],
  position: Position,
): PositionAnalysis {
  const notation = cardsToHandNotation(holeCards as never);
  const handRank = handStrengthRank(notation);
  const threshold = POSITION_THRESHOLDS[position];
  const appropriate = handRank <= threshold;
  const percentile = Math.round((1 - (handRank - 1) / 168) * 100);

  let message: string;
  if (appropriate) {
    message = `Rank ${handRank}/169 (top ${percentile}%) — playable from ${position}.`;
  } else if (position === 'UTG' || position === 'HJ') {
    message = `Rank ${handRank}/169 (bottom ${100 - percentile}%) — too weak for ${position}, fold more.`;
  } else {
    message = `Rank ${handRank}/169 — marginal for ${position}, proceed with caution.`;
  }

  return { handRank, positionThreshold: threshold, percentile, message, appropriate };
}
