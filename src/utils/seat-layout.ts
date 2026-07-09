import type { Player } from '../types/poker';

export interface SeatPosition {
  top: string;
  left: string;
  transform?: string;
  betOffset: { top: string; left: string };
}

/** Visual seat positions around a 6-max oval (hero always at index 0 / bottom). */
export const SEAT_POSITIONS: SeatPosition[] = [
  {
    top: '78%',
    left: '50%',
    transform: 'translate(-50%, 0)',
    betOffset: { top: '-28px', left: '50%' },
  },
  {
    top: '62%',
    left: '88%',
    transform: 'translate(-100%, 0)',
    betOffset: { top: '-20px', left: '-40px' },
  },
  {
    top: '28%',
    left: '92%',
    transform: 'translate(-100%, -50%)',
    betOffset: { top: '50%', left: '-50px' },
  },
  {
    top: '6%',
    left: '50%',
    transform: 'translate(-50%, 0)',
    betOffset: { top: '100%', left: '50%' },
  },
  {
    top: '28%',
    left: '8%',
    transform: 'translate(0, -50%)',
    betOffset: { top: '50%', left: '50px' },
  },
  {
    top: '62%',
    left: '12%',
    transform: 'translate(0, 0)',
    betOffset: { top: '-20px', left: '50px' },
  },
];

/** Reorder players so hero is always first (bottom seat). */
export function getVisualPlayerOrder(players: Player[]): Player[] {
  const heroIndex = players.findIndex((p) => p.isHero);
  if (heroIndex === -1) return players;

  const ordered: Player[] = [];
  for (let i = 0; i < players.length; i++) {
    ordered.push(players[(heroIndex + i) % players.length]);
  }
  return ordered;
}

export function getDealerVisualIndex(players: Player[], dealerIndex: number): number {
  const heroIndex = players.findIndex((p) => p.isHero);
  if (heroIndex === -1) return dealerIndex;
  return (dealerIndex - heroIndex + players.length) % players.length;
}
