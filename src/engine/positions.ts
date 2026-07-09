import type { Position } from '../types/poker';

const POSITION_ORDER: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

export function getPositionForSeat(seatIndex: number, dealerIndex: number, playerCount = 6): Position {
  const relativeSeat = (seatIndex - dealerIndex + playerCount) % playerCount;
  return POSITION_ORDER[relativeSeat];
}

export function getActionOrder(dealerIndex: number, playerCount: number): number[] {
  const order: number[] = [];
  const utgOffset = 3;
  for (let i = 0; i < playerCount; i++) {
    order.push((dealerIndex + utgOffset + i) % playerCount);
  }
  return order;
}

export function getPostflopActionOrder(dealerIndex: number, playerCount: number): number[] {
  const order: number[] = [];
  const sbOffset = 4;
  for (let i = 0; i < playerCount; i++) {
    order.push((dealerIndex + sbOffset + i) % playerCount);
  }
  return order;
}

export function nextActivePlayer(
  players: { folded: boolean; allIn: boolean }[],
  fromIndex: number,
): number | null {
  const count = players.length;
  for (let i = 1; i <= count; i++) {
    const idx = (fromIndex + i) % count;
    if (!players[idx].folded && !players[idx].allIn) {
      return idx;
    }
  }
  return null;
}

export function countActivePlayers(players: { folded: boolean }[]): number {
  return players.filter((p) => !p.folded).length;
}
