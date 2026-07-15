import type { StoredHand } from '../storage/hand-history';
import type { PositionalStats } from './types';
import { calculateHeroStats } from './hero-stats';
import { POSITIONS } from './types';

/**
 * Calculate hero stats broken down by position
 */
export function calculatePositionalStats(hands: StoredHand[], bigBlind = 2): PositionalStats {
  const statsByPosition: PositionalStats = {};
  
  for (const position of POSITIONS) {
    const positionHands = hands.filter(h => h.heroPosition === position);
    
    if (positionHands.length === 0) {
      statsByPosition[position] = createEmptyPositionStats();
      continue;
    }
    
    const stats = calculateHeroStats(positionHands, bigBlind);
    
    statsByPosition[position] = {
      hands: positionHands.length,
      vpip: stats.vpip,
      pfr: stats.pfr,
      threeBet: stats.threeBet,
      profit: positionHands.reduce((sum, h) => sum + h.stackChange, 0),
      bbPer100: stats.bbPer100Hands,
      winRate: stats.winRate,
    };
  }
  
  return statsByPosition;
}

/**
 * Create empty position stats
 */
function createEmptyPositionStats() {
  return {
    hands: 0,
    vpip: 0,
    pfr: 0,
    threeBet: 0,
    profit: 0,
    bbPer100: 0,
    winRate: 0,
  };
}
