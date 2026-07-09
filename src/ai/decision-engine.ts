import type { ActionType, Card, GameState, Player } from '../types/poker';
import { evaluateHand } from '../engine/hand-evaluator';
import { getValidActions } from '../engine/action-validator';
import { cardsToHandNotation, handStrengthRank } from '../utils/hand-notation';
import { getRangeFrequency, isHandInRange } from '../utils/range-expansion';
import { stackDepthBB } from '../utils/situation-hash';
import type { AIPlayerProfile } from './profiles';
import { getScenario } from './range-lookup';

const VARIANCE_RATE = 0.08;

export interface AIDecision {
  action: ActionType;
  amount?: number;
}

function shouldDeviate(): boolean {
  return Math.random() < VARIANCE_RATE;
}

function getPreflopScenarioKey(player: Player, state: GameState): string {
  const { position } = player;
  const facingRaise = state.currentBet > state.config.bigBlind;
  const is3betSpot = state.currentBet > state.config.bigBlind * 2;

  if (facingRaise) {
    if (is3betSpot) return `${position}_vs_3bet`;
    if (position === 'BB') return 'BB_vs_open';
    if (['CO', 'BTN', 'SB'].includes(position)) return `${position}_3bet`;
    return 'BB_vs_open';
  }

  if (position === 'BB') return 'BB_vs_open';
  return `${position}_open`;
}

function applyStackAdjustment(
  inRange: boolean,
  notation: string,
  stackBB: number,
  profile: AIPlayerProfile,
): boolean {
  const rank = handStrengthRank(notation);

  if (stackBB < 25) {
    return inRange && rank <= 50;
  }
  if (stackBB < 40) {
    return inRange && (rank <= 80 || Math.random() < 0.85 * profile.tightness);
  }
  if (stackBB > 80) {
    return inRange || Math.random() < 0.1 * (1 / profile.tightness);
  }

  return inRange;
}

function getPostflopStrength(holeCards: Card[], board: Card[]): number {
  if (board.length < 3) return 0.5;
  try {
    const eval_ = evaluateHand(holeCards, board);
    return Math.min(1, eval_.rank / 9_000_000);
  } catch {
    return 0.3;
  }
}

export function getAIDecision(
  state: GameState,
  player: Player,
  profile: AIPlayerProfile,
): AIDecision {
  const valid = getValidActions(state, player);
  const toCall = state.currentBet - player.betThisStreet;
  const stackBB = stackDepthBB(player.stack, state.config.bigBlind);
  const notation = cardsToHandNotation(player.holeCards);
  const pot = state.players.reduce((s, p) => s + p.totalBetThisHand, 0);

  if (state.street === 'preflop') {
    return getPreflopDecision(state, player, profile, valid, notation, stackBB, toCall);
  }

  return getPostflopDecision(state, player, profile, valid, toCall, pot);
}

function getPreflopDecision(
  state: GameState,
  player: Player,
  profile: AIPlayerProfile,
  valid: ReturnType<typeof getValidActions>,
  notation: string,
  stackBB: number,
  toCall: number,
): AIDecision {
  const scenarioKey = getPreflopScenarioKey(player, state);
  const scenario = getScenario(scenarioKey);
  const hands = scenario?.hands ?? [];
  let inRange = isHandInRange(notation, hands);
  const freq = getRangeFrequency(notation, scenario?.frequencies);
  inRange = inRange && Math.random() < freq;

  inRange = applyStackAdjustment(inRange, notation, stackBB, profile);

  const aggressionBoost = profile.tiltFactor + (profile.aggression - 1) * 0.1;
  if (shouldDeviate()) {
    inRange = !inRange;
  }

  if (toCall === 0) {
    if (inRange && valid.canBet) {
      const raiseSize = state.config.bigBlind * (2.5 + aggressionBoost * 2);
      const amount = Math.min(Math.round(raiseSize), valid.maxBet);
      if (Math.random() < 0.3 + aggressionBoost) {
        return { action: 'raise', amount: Math.max(valid.minBet, amount) };
      }
      return { action: 'call' }; // limp
    }
    return { action: 'check' };
  }

  if (inRange) {
    if (Math.random() < 0.15 + aggressionBoost && valid.canRaise) {
      const amount = Math.min(
        state.currentBet + state.minRaise * 2,
        valid.maxRaise,
      );
      return { action: 'raise', amount };
    }
    if (valid.canCall) return { action: 'call' };
  }

  if (valid.canCheck) return { action: 'check' };
  return { action: 'fold' };
}

function getPostflopDecision(
  state: GameState,
  player: Player,
  profile: AIPlayerProfile,
  valid: ReturnType<typeof getValidActions>,
  toCall: number,
  pot: number,
): AIDecision {
  const strength = getPostflopStrength(player.holeCards, state.board);
  const aggressionBoost = profile.tiltFactor + (profile.aggression - 1) * 0.15;
  const scenario = getScenario(toCall === 0 ? 'default_cbet' : 'default_call');
  const actions = scenario?.actions?.default ?? { fold: 0.35, call: 0.4, raise: 0.25 };

  let foldW = actions.fold ?? 0.35;
  let callW = actions.call ?? 0.4;
  let raiseW = actions.raise ?? 0.25;

  if (strength > 0.7) { foldW *= 0.2; raiseW *= 1.5; }
  else if (strength > 0.45) { foldW *= 0.5; callW *= 1.3; }
  else if (strength < 0.25) { foldW *= 2; raiseW *= 0.3; }

  foldW *= 1 - aggressionBoost;
  raiseW *= 1 + aggressionBoost;

  if (shouldDeviate()) {
    [foldW, callW, raiseW] = [callW, raiseW, foldW];
  }

  const total = foldW + callW + raiseW;
  const roll = Math.random() * total;

  if (toCall === 0) {
    if (roll < raiseW / total && valid.canBet) {
      const betSize = Math.max(valid.minBet, Math.round(pot * (0.5 + strength * 0.5)));
      return { action: 'bet', amount: Math.min(betSize, valid.maxBet) };
    }
    return { action: 'check' };
  }

  if (roll < foldW / total) {
    return valid.canCheck ? { action: 'check' } : { action: 'fold' };
  }
  if (roll < (foldW + callW) / total && valid.canCall) {
    return { action: 'call' };
  }
  if (valid.canRaise) {
    const amount = Math.min(state.currentBet + state.minRaise * 2, valid.maxRaise);
    return { action: 'raise', amount };
  }
  if (valid.canCall) return { action: 'call' };
  return { action: 'fold' };
}
