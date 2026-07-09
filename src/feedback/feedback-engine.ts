import type { ActionType, GameAction, GameState, Player, Street } from '../types/poker';
import type { EVSimResult } from './ev-simulator.worker';
import { runEVSimulation } from './ev-client';
import { getGTOAlignment } from './gto-lookup';
import { analyzePosition } from './position-analysis';
import { opponentTracker } from './opponent-tracker';

export interface DecisionFeedback {
  street: Street;
  action: ActionType;
  amount: number;
  ev: {
    chosen: number;
    fold: number;
    call: number;
    bet: number;
    bestAction: string;
    message: string;
  };
  gto: {
    alignment: number;
    message: string;
    inRange: boolean;
  };
  position: {
    handRank: number;
    message: string;
    appropriate: boolean;
  };
  opponent: {
    message: string;
    vpip: number;
    threebet: number;
  };
  verdict: string;
}

export async function analyzeHeroDecision(
  state: GameState,
  action: GameAction,
  hero: Player,
): Promise<DecisionFeedback> {
  const facingBet = state.currentBet > action.amount;
  const pot = state.players.reduce((s, p) => s + p.totalBetThisHand, 0);
  const bb = state.config.bigBlind;

  let evResult: EVSimResult = {
    foldEV: 0,
    callEV: 0,
    betEV: 0,
    callWinRate: 0,
    betWinRate: 0,
    bestAction: 'fold',
  };

  try {
    const activeOpponents = state.players.filter((p) => !p.isHero && !p.folded).length;
    evResult = await runEVSimulation({
      heroCards: hero.holeCards,
      board: state.board,
      numOpponents: Math.max(1, activeOpponents),
      potSize: pot,
      callAmount: state.config.bigBlind * 2,
      betAmount: state.config.bigBlind * 3,
      simulations: 2000,
    });
  } catch {
    // Worker unavailable — use estimates
    evResult = {
      foldEV: 0,
      callEV: pot * 0.3 - bb,
      betEV: pot * 0.45 - bb * 2,
      callWinRate: 0.3,
      betWinRate: 0.45,
      bestAction: 'call',
    };
  }

  const chosenEV = action.action === 'fold' ? evResult.foldEV
    : action.action === 'call' || action.action === 'check' ? evResult.callEV
    : evResult.betEV;

  const evBB = (v: number) => `${v >= 0 ? '+' : ''}${(v / bb).toFixed(1)}BB`;

  const gto = getGTOAlignment(
    hero.position,
    action.action,
    hero.holeCards,
    facingBet,
  );

  const position = analyzePosition(hero.holeCards, hero.position);
  const villain = opponentTracker.getPrimaryVillain(state.players);

  const opponentMsg = villain
    ? opponentTracker.getExploitMessage(villain)
    : 'No opponent data yet.';

  const verdict = buildVerdict(action.action, chosenEV, gto, position, bb);

  return {
    street: action.street,
    action: action.action,
    amount: action.amount,
    ev: {
      chosen: chosenEV,
      fold: evResult.foldEV,
      call: evResult.callEV,
      bet: evResult.betEV,
      bestAction: evResult.bestAction,
      message: `Your ${action}: ${evBB(chosenEV)}. Fold: ${evBB(evResult.foldEV)}, Call: ${evBB(evResult.callEV)}, Bet: ${evBB(evResult.betEV)}. Best: ${evResult.bestAction}.`,
    },
    gto: {
      alignment: gto.alignment,
      message: gto.message,
      inRange: gto.inRange,
    },
    position: {
      handRank: position.handRank,
      message: position.message,
      appropriate: position.appropriate,
    },
    opponent: {
      message: opponentMsg,
      vpip: villain?.vpip ?? 0,
      threebet: villain?.threebet ?? 0,
    },
    verdict,
  };
}

function buildVerdict(
  action: ActionType,
  ev: number,
  gto: ReturnType<typeof getGTOAlignment>,
  position: ReturnType<typeof analyzePosition>,
  bb: number,
): string {
  const evBB = ev / bb;
  if (gto.alignment > 0.7 && evBB >= 0) {
    return `Good ${action}. Solid GTO-aligned play with positive EV.`;
  }
  if (evBB > 0.5) {
    return `+EV ${action} (${evBB.toFixed(1)}BB). ${gto.inRange ? 'Within range.' : 'Exploitative.'}`;
  }
  if (evBB < -0.5 && action !== 'fold') {
    return `Consider folding — ${action} rates as -EV (${evBB.toFixed(1)}BB).`;
  }
  if (!position.appropriate && action !== 'fold') {
    return `Marginal hand for this spot. ${gto.message}`;
  }
  return `Reasonable ${action}. Review GTO frequencies for improvement.`;
}

export async function analyzeHandDecisions(
  state: GameState,
): Promise<DecisionFeedback[]> {
  const hero = state.players.find((p) => p.isHero);
  if (!hero) return [];

  const heroActions = state.actions.filter((a) => a.playerId === hero.id);
  const feedbacks: DecisionFeedback[] = [];

  for (const action of heroActions) {
    const snapshot = { ...state, actions: state.actions.slice(0, state.actions.indexOf(action) + 1) };
    const fb = await analyzeHeroDecision(snapshot, action, hero);
    feedbacks.push(fb);
  }

  return feedbacks;
}
