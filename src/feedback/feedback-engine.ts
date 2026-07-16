import type { ActionType, GameAction, GameState, Player, Street } from '../types/poker';
import type { EVSimResult } from './ev-simulator.worker';
import { runEVSimulation } from './ev-client';
import { getGTOAlignment } from './gto-lookup';
import { analyzePosition } from './position-analysis';
import { opponentTracker } from './opponent-tracker';
import { reconstructDecisionContext, type DecisionContext } from './decision-context';

export interface DecisionFeedback {
  street: Street;
  action: ActionType;
  amount: number;
  context: DecisionContext;
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
  const bb = state.config.bigBlind;
  
  // Reconstruct decision context at the moment of this decision
  const context = reconstructDecisionContext(state, action, hero);

  let evResult: EVSimResult = {
    foldEV: 0,
    callEV: 0,
    betEV: 0,
    callWinRate: 0,
    betWinRate: 0,
    bestAction: 'fold',
  };

  try {
    // Use actual decision context for EV calculation
    evResult = await runEVSimulation({
      heroCards: hero.holeCards,
      board: state.board.slice(0, context.boardLength),
      numOpponents: Math.max(1, context.activeOpponents),
      potSize: context.potBeforeAction,
      callAmount: context.amountToCall,
      betAmount: Math.max(bb * 3, context.potBeforeAction * 0.66), // 3BB or 2/3 pot
      simulations: 2000,
    });
  } catch {
    // Worker unavailable — use estimates
    const potFraction = context.potBeforeAction > 0 ? 0.3 : 0;
    evResult = {
      foldEV: 0,
      callEV: context.potBeforeAction * potFraction - context.amountToCall * 0.5,
      betEV: context.potBeforeAction * 0.45 - bb * 2,
      callWinRate: 0.3,
      betWinRate: 0.45,
      bestAction: context.amountToCall === 0 ? 'call' : 'call',
    };
  }

  const chosenEV = action.action === 'fold' ? evResult.foldEV
    : action.action === 'call' || action.action === 'check' ? evResult.callEV
    : evResult.betEV;

  const evBB = (v: number) => `${v >= 0 ? '+' : ''}${(v / bb).toFixed(1)}BB`;

  const gto = getGTOAlignment(
    context,
    action.action,
    hero.holeCards,
  );

  const position = analyzePosition(hero.holeCards, hero.position);
  const villain = opponentTracker.getPrimaryVillain(state.players);

  const opponentMsg = villain
    ? opponentTracker.getExploitMessage(villain)
    : 'No opponent data yet.';

  const verdict = buildVerdict(action.action, chosenEV, gto, position, bb, evResult);

  return {
    street: action.street,
    action: action.action,
    amount: action.amount,
    context,
    ev: {
      chosen: chosenEV,
      fold: evResult.foldEV,
      call: evResult.callEV,
      bet: evResult.betEV,
      bestAction: evResult.bestAction,
      message: `Your ${action.action}: ${evBB(chosenEV)}. Fold: ${evBB(evResult.foldEV)}, Call: ${evBB(evResult.callEV)}, Bet: ${evBB(evResult.betEV)}. Best: ${evResult.bestAction}.`,
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
  evResult: EVSimResult,
): string {
  const evBB = ev / bb;
  
  // Find best alternative EV
  const alternatives = [
    { action: 'fold', ev: evResult.foldEV },
    { action: 'call', ev: evResult.callEV },
    { action: 'bet', ev: evResult.betEV },
  ];
  const bestAlt = alternatives.reduce((best, curr) => curr.ev > best.ev ? curr : best);
  const evDelta = (ev - bestAlt.ev) / bb;
  
  // Fix fold scoring: don't praise folds when better alternatives exist
  if (action === 'fold') {
    if (evDelta < -0.3) {
      // Fold is significantly worse than best alternative
      return `Fold cost you ${Math.abs(evDelta).toFixed(1)}BB. ${bestAlt.action} was better here.`;
    } else if (evDelta < -0.1) {
      return `Fold was okay, but ${bestAlt.action} would gain ${Math.abs(evDelta).toFixed(1)}BB more.`;
    } else {
      return `Good fold. ${gto.inRange ? 'Out of GTO range.' : 'Correct decision.'}`;
    }
  }
  
  // Non-fold actions
  if (gto.alignment > 0.7 && evBB >= 0) {
    return `Good ${action}. Solid GTO-aligned play with positive EV.`;
  }
  if (evDelta > -0.1 && evBB >= 0) {
    return `+EV ${action} (${evBB.toFixed(1)}BB). ${gto.inRange ? 'Within range.' : 'Exploitative play.'}`;
  }
  if (evBB < -0.5) {
    return `Consider ${bestAlt.action} — ${action} rates as -EV (${evBB.toFixed(1)}BB).`;
  }
  if (!position.appropriate) {
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
