import type { StoredHand } from '../storage/hand-history';
import type { RollingWindowStats, StatsSnapshot } from './types';
import { calculateHeroStats } from './hero-stats';

/**
 * Calculate stats for different rolling windows (recent hands)
 */
export function calculateRollingWindows(hands: StoredHand[], bigBlind = 2): RollingWindowStats {
  // Sort hands by timestamp (most recent first)
  const sorted = [...hands].sort((a, b) => b.timestamp - a.timestamp);
  
  return {
    last50: calculateHeroStats(sorted.slice(0, 50), bigBlind),
    last100: calculateHeroStats(sorted.slice(0, 100), bigBlind),
    last500: calculateHeroStats(sorted.slice(0, 500), bigBlind),
    allTime: calculateHeroStats(sorted, bigBlind),
  };
}

/**
 * Generate snapshots of stats over time at regular intervals
 * Useful for showing trends and improvement over time
 */
export function generateSnapshots(
  hands: StoredHand[],
  interval: number = 50,
  bigBlind = 2
): StatsSnapshot[] {
  if (hands.length < interval) {
    return [];
  }

  const snapshots: StatsSnapshot[] = [];
  const sorted = [...hands].sort((a, b) => a.timestamp - b.timestamp);
  
  for (let i = interval; i <= sorted.length; i += interval) {
    const window = sorted.slice(Math.max(0, i - interval), i);
    const stats = calculateHeroStats(window, bigBlind);
    
    snapshots.push({
      handNumber: sorted[i - 1].handNumber,
      timestamp: sorted[i - 1].timestamp,
      handsAnalyzed: window.length,
      vpip: stats.vpip,
      pfr: stats.pfr,
      threeBet: stats.threeBet,
      aggressionFactor: stats.aggressionFactor,
      profit: window.reduce((sum, h) => sum + h.stackChange, 0),
      gtoAccuracy: calculateGTOAccuracy(window),
    });
  }
  
  return snapshots;
}

/**
 * Calculate average GTO alignment from feedback
 */
function calculateGTOAccuracy(hands: StoredHand[]): number {
  let totalAlignment = 0;
  let count = 0;
  
  for (const hand of hands) {
    for (const feedback of hand.feedback) {
      totalAlignment += feedback.gto.alignment;
      count++;
    }
  }
  
  return count > 0 ? totalAlignment / count : 0;
}
