import { describe, it, expect } from 'vitest';
import { reconstructDecisionContext, getScenarioKey } from '../decision-context';
import type { GameState, GameAction, Player } from '../../types/poker';

describe('decision-context', () => {
  it('reconstructs context for preflop open', () => {
    const hero: Player = {
      id: 0,
      name: 'Hero',
      position: 'BTN',
      stack: 200,
      isHero: true,
      holeCards: ['Kd', 'Jh'],
      folded: false,
      allIn: false,
      totalBetThisHand: 0,
      betThisStreet: 0,
    };

    const state: GameState = {
      players: [hero],
      board: [],
      pot: 3,
      currentBet: 0,
      currentPlayerIndex: 0,
      dealerIndex: 0,
      street: 'preflop',
      phase: 'betting',
      actions: [
        { playerId: 0, action: 'bet', amount: 4, street: 'preflop' },
      ],
      pots: [],
      config: { smallBlind: 1, bigBlind: 2, startStack: 200 },
    };

    const action = state.actions[0];
    const context = reconstructDecisionContext(state, action, hero);

    expect(context.scenarioType).toBe('open');
    expect(context.heroPosition).toBe('BTN');
    expect(context.street).toBe('preflop');
    expect(context.boardLength).toBe(0);
  });

  it('reconstructs context for SB vs open', () => {
    const hero: Player = {
      id: 1,
      name: 'Hero',
      position: 'SB',
      stack: 199,
      isHero: true,
      holeCards: ['Kd', 'Jh'],
      folded: false,
      allIn: false,
      totalBetThisHand: 1,
      betThisStreet: 1,
    };

    const opponent: Player = {
      id: 0,
      name: 'Villain',
      position: 'CO',
      stack: 196,
      isHero: false,
      holeCards: [],
      folded: false,
      allIn: false,
      totalBetThisHand: 4,
      betThisStreet: 4,
    };

    const state: GameState = {
      players: [opponent, hero],
      board: [],
      pot: 5,
      currentBet: 4,
      currentPlayerIndex: 1,
      dealerIndex: 0,
      street: 'preflop',
      phase: 'betting',
      actions: [
        { playerId: 0, action: 'bet', amount: 4, street: 'preflop' },
        { playerId: 1, action: 'fold', amount: 0, street: 'preflop' },
      ],
      pots: [],
      config: { smallBlind: 1, bigBlind: 2, startStack: 200 },
    };

    const action = state.actions[1];
    const context = reconstructDecisionContext(state, action, hero);

    expect(context.scenarioType).toBe('vs_open');
    expect(context.heroPosition).toBe('SB');
    expect(context.wasOpened).toBe(true);
    expect(context.was3Bet).toBe(false);
    expect(context.amountToCall).toBe(4); // Full open amount
  });

  it('generates correct scenario keys', () => {
    const context1 = {
      street: 'preflop' as const,
      boardLength: 0,
      heroPosition: 'SB' as const,
      heroStack: 100,
      potBeforeAction: 3,
      currentBet: 4,
      amountToCall: 3,
      heroTotalBet: 1,
      scenarioType: 'vs_open' as const,
      facingSize: 1.5,
      activeOpponents: 1,
      foldedPlayers: 0,
      effectiveStack: 100,
      wasOpened: true,
      was3Bet: false,
      was4Bet: false,
      openSize: 2,
    };

    expect(getScenarioKey(context1)).toBe('SB_vs_open_small');

    const context2 = { ...context1, facingSize: 3, scenarioType: 'vs_open' as const };
    expect(getScenarioKey(context2)).toBe('SB_vs_open_standard');

    const context3 = { ...context1, scenarioType: 'open' as const };
    expect(getScenarioKey(context3)).toBe('SB_open');
  });
});
