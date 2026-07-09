import { describe, it, expect } from 'vitest';
import type { DecisionFeedback } from '../../feedback/feedback-engine';
import { toReadableFeedback } from '../../feedback/feedback-copy';

const sampleFeedback: DecisionFeedback = {
  street: 'preflop',
  action: 'call',
  amount: 4,
  ev: {
    chosen: 0.6,
    fold: 0,
    call: 0.6,
    bet: 1.2,
    bestAction: 'bet',
    message: '',
  },
  gto: {
    alignment: 0.7,
    message: '',
    inRange: true,
  },
  position: {
    handRank: 25,
    message: '',
    appropriate: true,
  },
  opponent: {
    message: 'Tight opponent. Steal more.',
    vpip: 0.15,
    threebet: 0.05,
  },
  verdict: '',
};

describe('feedback-copy', () => {
  it('produces natural language headline', () => {
    const readable = toReadableFeedback(sampleFeedback, 2);
    expect(readable.headline).toContain('Before the flop');
    expect(readable.headline).toContain('called');
    expect(readable.explanation).not.toContain('GTO');
    expect(readable.explanation).not.toContain('BB');
  });

  it('rates good plays appropriately', () => {
    const readable = toReadableFeedback({
      ...sampleFeedback,
      ev: { ...sampleFeedback.ev, chosen: 2, bestAction: 'call' },
      gto: { ...sampleFeedback.gto, alignment: 0.8 },
    }, 2);
    expect(['great', 'good']).toContain(readable.rating);
  });
});
