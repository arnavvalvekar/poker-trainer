import type { GameState, Player, ValidActions, ActionType } from '../types/poker';

export function getValidActions(state: GameState, player: Player): ValidActions {
  const toCall = state.currentBet - player.betThisStreet;
  const canCheck = toCall === 0;
  const canCall = toCall > 0 && player.stack > 0;
  const callAmount = Math.min(toCall, player.stack);

  const minRaiseTotal = state.currentBet + state.minRaise;
  const minRaiseAmount = minRaiseTotal - player.betThisStreet;
  const canRaise = player.stack > toCall && state.currentBet > 0 && minRaiseAmount <= player.stack;

  const canBet = state.currentBet === 0 && player.stack > 0;
  const minBet = state.config.bigBlind;
  const maxBet = player.stack + player.betThisStreet;

  return {
    canFold: toCall > 0 || state.currentBet > 0,
    canCheck,
    canCall,
    callAmount,
    canBet,
    minBet,
    maxBet,
    canRaise,
    minRaise: canRaise ? minRaiseTotal : 0,
    maxRaise: maxBet,
  };
}

export function validateAction(
  state: GameState,
  player: Player,
  action: ActionType,
  amount = 0,
): { valid: boolean; error?: string } {
  const valid = getValidActions(state, player);

  switch (action) {
    case 'fold':
      if (!valid.canFold && valid.canCheck) {
        return { valid: false, error: 'Can check instead of fold' };
      }
      return { valid: true };

    case 'check':
      if (!valid.canCheck) {
        return { valid: false, error: 'Cannot check, must call or raise' };
      }
      return { valid: true };

    case 'call':
      if (!valid.canCall) {
        return { valid: false, error: 'Nothing to call' };
      }
      return { valid: true };

    case 'bet':
      if (!valid.canBet) {
        return { valid: false, error: 'Cannot bet' };
      }
      if (amount < valid.minBet && amount < player.stack + player.betThisStreet) {
        return { valid: false, error: `Minimum bet is ${valid.minBet}` };
      }
      if (amount > valid.maxBet) {
        return { valid: false, error: 'Bet exceeds stack' };
      }
      return { valid: true };

    case 'raise':
    case 'all-in': {
      const raiseTotal = action === 'all-in' ? player.stack + player.betThisStreet : amount;
      if (action === 'all-in') {
        return { valid: player.stack > 0 };
      }
      if (!valid.canRaise && !valid.canBet) {
        return { valid: false, error: 'Cannot raise' };
      }
      if (raiseTotal < valid.minRaise && raiseTotal < valid.maxRaise) {
        return { valid: false, error: `Minimum raise is ${valid.minRaise}` };
      }
      if (raiseTotal > valid.maxRaise) {
        return { valid: false, error: 'Raise exceeds stack' };
      }
      return { valid: true };
    }

    default:
      return { valid: false, error: 'Unknown action' };
  }
}

export function isBettingRoundComplete(state: GameState): boolean {
  const activePlayers = state.players.filter((p) => !p.folded && !p.allIn);

  if (activePlayers.length <= 1) return true;

  const allMatched = activePlayers.every(
    (p) => p.betThisStreet === state.currentBet || p.allIn,
  );

  if (!allMatched) return false;

  if (state.lastAggressorIndex === null) {
    return activePlayers.every((p) => p.betThisStreet === state.currentBet);
  }

  return true;
}
