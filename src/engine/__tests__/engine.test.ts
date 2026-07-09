import { describe, it, expect } from 'vitest';
import { createDeck, shuffleDeck, rankValue } from '../deck';
import { evaluateHand } from '../hand-evaluator';
import { GameEngine } from '../game-engine';

describe('deck', () => {
  it('creates a 52-card deck', () => {
    expect(createDeck()).toHaveLength(52);
  });

  it('shuffles without losing cards', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled).toHaveLength(52);
    expect(new Set(shuffled).size).toBe(52);
  });

  it('ranks ace highest', () => {
    expect(rankValue('A')).toBe(14);
  });
});

describe('hand-evaluator', () => {
  it('evaluates a pair', () => {
    const hand = evaluateHand(['As', 'Ah'], ['Ad', 'Kc', 'Qh', 'Js', '2d']);
    expect(hand.category).toBe('three-of-a-kind');
  });

  it('evaluates a straight', () => {
    const hand = evaluateHand(['9h', '8d'], ['7c', '6s', '5h', '2d', 'Kc']);
    expect(hand.category).toBe('straight');
  });

  it('evaluates a flush', () => {
    const hand = evaluateHand(['Ah', 'Kh'], ['Qh', 'Jh', '2h', '3d', '4c']);
    expect(hand.category).toBe('flush');
  });
});

describe('game-engine', () => {
  it('starts a new hand with blinds posted', () => {
    const engine = new GameEngine();
    const state = engine.startNewHand();

    expect(state.handNumber).toBe(1);
    expect(state.phase).toBe('preflop');
    expect(state.players.every((p) => p.holeCards.length === 2)).toBe(true);

    const totalBets = state.players.reduce((sum, p) => sum + p.totalBetThisHand, 0);
    expect(totalBets).toBe(3); // SB 1 + BB 2
  });

  it('allows hero to fold', () => {
    const engine = new GameEngine();
    engine.startNewHand();
    const state = engine.getState();
    const hero = state.players.find((p) => p.isHero)!;

    // Advance to hero's turn if needed
    let safety = 20;
    while (safety-- > 0) {
      const s = engine.getState();
      const current = s.players[s.currentPlayerIndex];
      if (current.isHero) break;
      engine.processAITurn();
    }

    const result = engine.applyAction(hero.id, 'fold');
    expect(result.success).toBe(true);
    expect(engine.getState().players[hero.id].folded).toBe(true);
  });
});
