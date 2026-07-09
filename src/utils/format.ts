import type { ActionType, GameAction, Player, Street } from '../types/poker';

export function formatMoney(amount: number): string {
  return `$${amount}`;
}

export function formatAction(
  action: GameAction,
  player: Player | undefined,
): string {
  const name = player?.name ?? `Player ${action.playerId}`;
  const verb = action.action.charAt(0).toUpperCase() + action.action.slice(1);

  if (action.action === 'fold' || action.action === 'check') {
    return `${name} ${verb.toLowerCase()}s`;
  }
  if (action.amount > 0) {
    return `${name} ${verb.toLowerCase()}s ${formatMoney(action.amount)}`;
  }
  return `${name} ${verb.toLowerCase()}s`;
}

export function streetLabel(street: Street): string {
  const labels: Record<Street, string> = {
    preflop: 'Preflop',
    flop: 'Flop',
    turn: 'Turn',
    river: 'River',
  };
  return labels[street];
}

export function actionColor(action: ActionType): string {
  const colors: Record<ActionType, string> = {
    fold: 'text-offsuit-grey',
    check: 'text-offsuit-grey',
    call: 'text-white/80',
    bet: 'text-white',
    raise: 'text-white',
    'all-in': 'text-white',
  };
  return colors[action];
}

export function resultColor(change: number): string {
  if (change > 0) return 'text-[#34C759]';
  if (change < 0) return 'text-[#FF3B30]';
  return 'text-offsuit-grey';
}

export function resultLabel(change: number): string {
  if (change > 0) return `+${formatMoney(change)}`;
  if (change < 0) return `-${formatMoney(Math.abs(change))}`;
  return '$0';
}
