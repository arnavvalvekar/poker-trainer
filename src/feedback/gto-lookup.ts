import type { ActionType, Position } from '../types/poker';
import { getScenario } from '../ai/range-lookup';
import { cardsToHandNotation } from '../utils/hand-notation';
import { getRangeFrequency, isHandInRange } from '../utils/range-expansion';

export interface GTOAlignment {
  actionFrequency: number;
  recommendedAction: ActionType;
  alignment: number;
  message: string;
  inRange: boolean;
}

export function getGTOAlignment(
  position: Position,
  action: ActionType,
  holeCards: string[],
  facingBet: boolean,
): GTOAlignment {
  const notation = cardsToHandNotation(holeCards as never);
  const scenarioKey = facingBet
    ? position === 'BB' ? 'BB_vs_open' : `${position}_vs_3bet`
    : `${position}_open`;
  const scenario = getScenario(scenarioKey);
  const hands = scenario?.hands ?? [];
  const inRange = isHandInRange(notation, hands);
  const freq = getRangeFrequency(notation, scenario?.frequencies);

  const actionFreqs = scenario?.actions?.default ?? {
    fold: 0.35,
    call: 0.4,
    raise: 0.25,
  };

  let recommendedAction: ActionType = 'fold';
  let actionFrequency = actionFreqs.fold ?? 0.35;

  if (inRange) {
    if ((actionFreqs.raise ?? 0) >= (actionFreqs.call ?? 0)) {
      recommendedAction = facingBet ? 'raise' : 'bet';
      actionFrequency = actionFreqs.raise ?? 0.25;
    } else {
      recommendedAction = 'call';
      actionFrequency = actionFreqs.call ?? 0.4;
    }
  }

  const chosenFreq = action === 'fold' ? (actionFreqs.fold ?? 0.35)
    : action === 'call' || action === 'check' ? (actionFreqs.call ?? 0.4)
    : (actionFreqs.raise ?? 0.25);

  const alignment = inRange
    ? Math.min(1, freq * (action === recommendedAction ? 1 : 0.6))
    : action === 'fold' ? 0.8 : 0.2;

  let message: string;
  if (action === recommendedAction) {
    message = `GTO ${action}s ${Math.round(chosenFreq * 100)}% here; your play matches.`;
  } else if (inRange) {
    message = `GTO prefers ${recommendedAction} (${Math.round(actionFrequency * 100)}%); you ${action}d.`;
  } else {
    message = action === 'fold'
      ? 'Hand outside GTO range — fold is correct.'
      : 'Hand outside GTO range — consider folding more often.';
  }

  return { actionFrequency: chosenFreq, recommendedAction, alignment, message, inRange };
}
