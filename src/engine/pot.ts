import type { Player, Pot } from '../types/poker';

export function getTotalPot(pots: Pot[]): number {
  return pots.reduce((sum, pot) => sum + pot.amount, 0);
}

export function createMainPot(players: Player[]): Pot {
  return {
    amount: 0,
    eligiblePlayerIds: players.filter((p) => !p.folded).map((p) => p.id),
  };
}

export function calculatePots(players: Player[]): Pot[] {
  const activePlayers = players.filter((p) => p.totalBetThisHand > 0);
  if (activePlayers.length === 0) {
    return [{ amount: 0, eligiblePlayerIds: [] }];
  }

  const sorted = [...activePlayers].sort((a, b) => a.totalBetThisHand - b.totalBetThisHand);
  const pots: Pot[] = [];
  let previousLevel = 0;

  for (let i = 0; i < sorted.length; i++) {
    const currentLevel = sorted[i].totalBetThisHand;
    const increment = currentLevel - previousLevel;
    if (increment <= 0) continue;

    const contributors = sorted.slice(i);
    const eligible = contributors.filter((p) => !p.folded).map((p) => p.id);
    const potAmount = increment * contributors.length;

    if (pots.length > 0) {
      pots[pots.length - 1].amount += increment * (sorted.length - contributors.length);
    }

    pots.push({
      amount: potAmount,
      eligiblePlayerIds: eligible,
    });

    previousLevel = currentLevel;
  }

  return pots.length > 0 ? pots : [{ amount: 0, eligiblePlayerIds: [] }];
}
