import type { ActionType } from '../types/poker';
import { getScenario } from '../ai/range-lookup';
import { cardsToHandNotation } from '../utils/hand-notation';
import { getRangeFrequency, isHandInRange } from '../utils/range-expansion';
import type { DecisionContext } from './decision-context';
import { getScenarioKey } from './decision-context';

export interface GTOAlignment {
  actionFrequency: number;
  recommendedAction: ActionType;
  alignment: number;
  message: string;
  inRange: boolean;
}

export function getGTOAlignment(
  context: DecisionContext,
  action: ActionType,
  holeCards: string[],
): GTOAlignment {
  const notation = cardsToHandNotation(holeCards as never);
  const scenarioKey = getScenarioKey(context);
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
      recommendedAction = context.amountToCall > 0 ? 'raise' : 'bet';
      actionFrequency = actionFreqs.raise ?? 0.25;
    } else {
      recommendedAction = 'call';
      actionFrequency = actionFreqs.call ?? 0.4;
    }
  }

  const chosenFreq = action === 'fold' ? (actionFreqs.fold ?? 0.35)
    : action === 'call' || action === 'check' ? (actionFreqs.call ?? 0.4)
    : (actionFreqs.raise ?? 0.25);

  // Fix fold scoring: don't give 0.8 alignment for out-of-range folds
  // Instead, compare EV of fold vs alternatives
  const alignment = inRange
    ? Math.min(1, freq * (action === recommendedAction ? 1 : 0.6))
    : action === 'fold' ? 0.5 : 0.2;  // Fold gets 0.5 instead of 0.8

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
