import type { ActionType } from '../types/poker';

export function describeAction(
  playerName: string,
  action: ActionType,
  amount: number,
): string {
  switch (action) {
    case 'fold':
      return `${playerName} folds`;
    case 'check':
      return `${playerName} checks`;
    case 'call':
      return amount > 0 ? `${playerName} calls $${amount}` : `${playerName} calls`;
    case 'bet':
      return `${playerName} bets $${amount}`;
    case 'raise':
      return amount > 0 ? `${playerName} raises $${amount}` : `${playerName} raises`;
    case 'all-in':
      return `${playerName} goes all-in`;
    default:
      return `${playerName} acts`;
  }
}
