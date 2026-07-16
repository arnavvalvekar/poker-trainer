import type { GameState, GameAction, Player, Street, Position } from '../types/poker';

export type ScenarioType =
  | 'open'
  | 'vs_open'
  | 'vs_limp'
  | '3bet'
  | 'vs_3bet'
  | '4bet'
  | 'vs_4bet'
  | 'postflop_bet'
  | 'postflop_call'
  | 'postflop_raise';

export interface DecisionContext {
  // Game state at decision time
  street: Street;
  boardLength: number;
  heroPosition: Position;
  heroStack: number;
  
  // Pot and betting
  potBeforeAction: number;
  currentBet: number;
  amountToCall: number;
  heroTotalBet: number;
  
  // Scenario classification
  scenarioType: ScenarioType;
  facingSize: number; // in BB
  
  // Players
  activeOpponents: number;
  foldedPlayers: number;
  
  // Stack depths
  effectiveStack: number; // in BB
  
  // Preflop action history
  wasOpened: boolean;
  was3Bet: boolean;
  was4Bet: boolean;
  openSize: number; // in BB
}

/**
 * Reconstruct game state at the moment of a specific hero decision.
 * This ensures feedback analyzes the actual spot, not end-of-hand state.
 */
export function reconstructDecisionContext(
  state: GameState,
  action: GameAction,
  hero: Player,
): DecisionContext {
  const bb = state.config.bigBlind;
  
  // Find all actions up to (but not including) this decision
  const actionIndex = state.actions.indexOf(action);
  const priorActions = state.actions.slice(0, actionIndex);
  
  // Reconstruct street at decision time
  const street = action.street;
  const boardLength = getBoardLength(street);
  
  // Calculate pot at decision time
  const potBeforeAction = priorActions.reduce((sum, a) => {
    if (a.action === 'bet' || a.action === 'call' || a.action === 'raise') {
      return sum + a.amount;
    }
    return sum;
  }, state.config.smallBlind + state.config.bigBlind);
  
  // Find current bet and amount to call
  const streetActions = priorActions.filter(a => a.street === street);
  const currentBet = Math.max(0, ...streetActions
    .filter(a => a.action === 'bet' || a.action === 'raise')
    .map(a => a.amount));
  
  const heroTotalBet = priorActions
    .filter(a => a.playerId === hero.id && (a.action === 'bet' || a.action === 'call' || a.action === 'raise'))
    .reduce((sum, a) => sum + a.amount, 0);
  
  const amountToCall = Math.max(0, currentBet - heroTotalBet);
  
  // Count active opponents at decision time
  const foldedPlayerIds = new Set(
    priorActions.filter(a => a.action === 'fold').map(a => a.playerId)
  );
  const activeOpponents = state.players.filter(
    p => !p.isHero && !foldedPlayerIds.has(p.id)
  ).length;
  
  // Calculate effective stack (hero vs smallest opponent, in BB)
  const heroStack = hero.stack / bb;
  const opponentStacks = state.players
    .filter(p => !p.isHero && !foldedPlayerIds.has(p.id))
    .map(p => p.stack / bb);
  const effectiveStack = opponentStacks.length > 0
    ? Math.min(heroStack, ...opponentStacks)
    : heroStack;
  
  // Classify scenario
  const { scenarioType, wasOpened, was3Bet, was4Bet, openSize } = classifyScenario(
    priorActions,
    street,
    hero,
    bb,
  );
  
  const facingSize = amountToCall / bb;
  
  return {
    street,
    boardLength,
    heroPosition: hero.position,
    heroStack,
    potBeforeAction,
    currentBet,
    amountToCall,
    heroTotalBet,
    scenarioType,
    facingSize,
    activeOpponents,
    foldedPlayers: foldedPlayerIds.size,
    effectiveStack,
    wasOpened,
    was3Bet,
    was4Bet,
    openSize,
  };
}

function getBoardLength(street: Street): number {
  switch (street) {
    case 'preflop':
      return 0;
    case 'flop':
      return 3;
    case 'turn':
      return 4;
    case 'river':
      return 5;
    default:
      return 0;
  }
}

interface ScenarioClassification {
  scenarioType: ScenarioType;
  wasOpened: boolean;
  was3Bet: boolean;
  was4Bet: boolean;
  openSize: number;
}

function classifyScenario(
  priorActions: GameAction[],
  street: Street,
  hero: Player,
  bb: number,
): ScenarioClassification {
  const preflopActions = priorActions.filter(a => a.street === 'preflop');
  
  // Postflop scenarios
  if (street !== 'preflop') {
    const streetActions = priorActions.filter(a => a.street === street);
    const hasBet = streetActions.some(a => a.action === 'bet' || a.action === 'raise');
    
    if (hasBet) {
      const heroBet = streetActions.find(a => a.playerId === hero.id && (a.action === 'bet' || a.action === 'raise'));
      if (heroBet) {
        return {
          scenarioType: 'postflop_bet',
          wasOpened: true,
          was3Bet: false,
          was4Bet: false,
          openSize: 0,
        };
      }
      return {
        scenarioType: streetActions.some(a => a.action === 'raise') ? 'postflop_raise' : 'postflop_call',
        wasOpened: true,
        was3Bet: false,
        was4Bet: false,
        openSize: 0,
      };
    }
  }
  
  // Preflop scenario classification
  const raises = preflopActions.filter(a => a.action === 'raise' || a.action === 'bet');
  const limps = preflopActions.filter(a => a.action === 'call' && a.amount === bb);
  
  const wasOpened = raises.length > 0;
  const was3Bet = raises.length >= 2;
  const was4Bet = raises.length >= 3;
  const openSize = raises.length > 0 ? raises[0].amount / bb : 0;
  
  // Determine scenario type
  let scenarioType: ScenarioType;
  
  if (!wasOpened && limps.length > 0) {
    scenarioType = 'vs_limp';
  } else if (was4Bet) {
    scenarioType = raises[raises.length - 1].playerId === hero.id ? '4bet' : 'vs_4bet';
  } else if (was3Bet) {
    scenarioType = raises[raises.length - 1].playerId === hero.id ? '3bet' : 'vs_3bet';
  } else if (wasOpened) {
    scenarioType = raises[0].playerId === hero.id ? 'open' : 'vs_open';
  } else {
    // No raise yet - hero can open
    scenarioType = 'open';
  }
  
  return {
    scenarioType,
    wasOpened,
    was3Bet,
    was4Bet,
    openSize,
  };
}

/**
 * Generate a scenario key for GTO lookup based on decision context.
 * More granular than the old {position}_open / {position}_vs_3bet.
 */
export function getScenarioKey(context: DecisionContext): string {
  const { heroPosition, scenarioType, facingSize } = context;
  
  // Postflop - simplified for now (can expand later)
  if (context.boardLength >= 3) {
    return `${heroPosition}_postflop`;
  }
  
  // Preflop scenarios with position and action type
  let key = `${heroPosition}_${scenarioType}`;
  
  // Add size bucket for vs_open scenarios
  if (scenarioType === 'vs_open') {
    if (facingSize <= 2.5) {
      key += '_small';
    } else if (facingSize <= 3.5) {
      key += '_standard';
    } else {
      key += '_large';
    }
  }
  
  return key;
}
