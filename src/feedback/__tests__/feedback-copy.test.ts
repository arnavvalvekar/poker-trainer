import { describe, it, expect } from 'vitest';
import type { DecisionFeedback } from '../../feedback/feedback-engine';
import { toReadableFeedback } from '../../feedback/feedback-copy';
import type { DecisionContext } from '../../feedback/decision-context';

const mockContext: DecisionContext = {
  street: 'preflop',
  boardLength: 0,
  heroPosition: 'BTN',
  heroStack: 100,
  potBeforeAction: 3,
  currentBet: 2,
  amountToCall: 2,
  heroTotalBet: 0,
  scenarioType: 'vs_open',
  facingSize: 1,
  activeOpponents: 2,
  foldedPlayers: 0,
  effectiveStack: 100,
  wasOpened: true,
  was3Bet: false,
  was4Bet: false,
  openSize: 2,
};

const sampleFeedback: DecisionFeedback = {
  street: 'preflop',
  action: 'call',
  amount: 4,
  context: mockContext,
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
      context: mockContext,
      ev: { ...sampleFeedback.ev, chosen: 2, bestAction: 'call' },
      gto: { ...sampleFeedback.gto, alignment: 0.8 },
    }, 2);
    expect(['great', 'good']).toContain(readable.rating);
  });
});
