import type { DecisionFeedback } from '../feedback/feedback-engine';
import type { ActionType, Street } from '../types/poker';

export type FeedbackRating = 'great' | 'good' | 'okay' | 'mistake';

export interface ReadableFeedback {
  street: Street;
  action: ActionType;
  amount: number;
  rating: FeedbackRating;
  headline: string;
  explanation: string;
  tip: string;
}

const STREET_NAMES: Record<Street, string> = {
  preflop: 'Before the flop',
  flop: 'On the flop',
  turn: 'On the turn',
  river: 'On the river',
};

const ACTION_VERBS: Record<ActionType, string> = {
  fold: 'folded',
  check: 'checked',
  call: 'called',
  bet: 'bet',
  raise: 'raised',
  'all-in': 'went all-in',
};

function formatBB(amount: number, bb: number): string {
  const bbAmount = amount / bb;
  const rounded = Math.abs(bbAmount) < 0.05 ? '0' : bbAmount.toFixed(1);
  if (bbAmount > 0) return `gains about ${rounded} big blinds`;
  if (bbAmount < 0) return `loses about ${Math.abs(parseFloat(rounded))} big blinds`;
  return 'breaks even';
}

function bestActionLabel(action: string): string {
  const labels: Record<string, string> = {
    fold: 'folding',
    call: 'calling',
    check: 'checking',
    bet: 'betting',
    raise: 'raising',
  };
  return labels[action] ?? action;
}

export function toReadableFeedback(fb: DecisionFeedback, bigBlind = 2): ReadableFeedback {
  const street = STREET_NAMES[fb.street];
  const verb = ACTION_VERBS[fb.action];
  const amountStr = fb.amount > 0 ? ` $${fb.amount}` : '';

  const chosenBB = fb.ev.chosen / bigBlind;
  const bestBB = Math.max(fb.ev.fold, fb.ev.call, fb.ev.bet) / bigBlind;
  const isBestAction = Math.abs(chosenBB - bestBB) < 0.15;

  let rating: FeedbackRating = 'okay';
  if (fb.gto.alignment > 0.75 && chosenBB >= -0.3) rating = 'great';
  else if (fb.gto.alignment > 0.55 && chosenBB >= -0.5) rating = 'good';
  else if (chosenBB < -1 && fb.action !== 'fold') rating = 'mistake';
  else if (!fb.gto.inRange && fb.action !== 'fold' && chosenBB < 0) rating = 'mistake';

  const ratingHeadlines: Record<FeedbackRating, string> = {
    great: 'Nice play',
    good: 'Solid choice',
    okay: 'Could be better',
    mistake: 'Rethink this spot',
  };

  // EV explanation in plain English
  let evExplanation: string;
  if (fb.action === 'fold') {
    evExplanation = chosenBB >= -0.1
      ? 'Giving up the hand costs you nothing here.'
      : 'Folding avoids losing more, but you might be giving up a profitable spot.';
  } else if (isBestAction) {
    evExplanation = `This was the most profitable option — it ${formatBB(fb.ev.chosen, bigBlind)} on average.`;
  } else {
    const best = fb.ev.bestAction;
    const bestEV = best === 'fold' ? fb.ev.fold : best === 'call' ? fb.ev.call : fb.ev.bet;
    evExplanation = `You ${formatBB(fb.ev.chosen, bigBlind)}, but ${bestActionLabel(best)} would have been better (${formatBB(bestEV, bigBlind)}).`;
  }

  // GTO in plain English
  let gtoExplanation: string;
  if (fb.gto.inRange && fb.gto.alignment > 0.6) {
    gtoExplanation = 'This matches what strong players typically do with this hand in this spot.';
  } else if (fb.gto.inRange) {
    gtoExplanation = 'Your hand is strong enough to play, but a different action might be more balanced.';
  } else if (fb.action === 'fold') {
    gtoExplanation = 'Your hand was too weak to continue — folding was the right idea.';
  } else {
    gtoExplanation = 'This hand is usually too weak to play here. Consider folding more often in similar spots.';
  }

  // Position in plain English
  const percentile = Math.round((1 - (fb.position.handRank - 1) / 168) * 100);
  let positionExplanation: string;
  if (fb.position.appropriate) {
    positionExplanation = `Your hand is strong enough for your seat (top ${percentile}% of all hands).`;
  } else if (fb.position.handRank > 120) {
    positionExplanation = 'This was a weak hand for your position. Tighter play from early seats is usually correct.';
  } else {
    positionExplanation = 'Borderline hand for your seat. Proceed carefully or fold to aggression.';
  }

  const explanation = [evExplanation, gtoExplanation, positionExplanation].join(' ');

  // Actionable tip
  let tip: string;
  if (fb.opponent.vpip > 0 && fb.opponent.message) {
    tip = fb.opponent.message;
  } else if (rating === 'mistake') {
    tip = 'Next time, compare calling vs folding before committing chips with a marginal hand.';
  } else if (rating === 'great') {
    tip = 'Keep applying this logic — you read the spot well.';
  } else {
    tip = 'Review similar hands in the Review tab to build your instincts.';
  }

  const headline = `${street}, you ${verb}${amountStr}. ${ratingHeadlines[rating]}.`;

  return {
    street: fb.street,
    action: fb.action,
    amount: fb.amount,
    rating,
    headline,
    explanation,
    tip,
  };
}

export const RATING_STYLES: Record<FeedbackRating, { bg: string; border: string; badge: string; label: string }> = {
  great: {
    bg: 'bg-surface',
    border: 'border-[#34C759]/30',
    badge: 'bg-[#34C759] text-white',
    label: 'Great',
  },
  good: {
    bg: 'bg-surface',
    border: 'border-white/10',
    badge: 'bg-white/20 text-white',
    label: 'Good',
  },
  okay: {
    bg: 'bg-surface',
    border: 'border-white/10',
    badge: 'bg-surface-raised text-offsuit-grey',
    label: 'Okay',
  },
  mistake: {
    bg: 'bg-surface',
    border: 'border-[#FF3B30]/30',
    badge: 'bg-[#FF3B30] text-white',
    label: 'Learn',
  },
};
