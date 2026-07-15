import type { Position } from '../types/poker';
import type { HeroStats, PositionalStats, Leak, PlayingStyle } from './types';

/**
 * GTO benchmark ranges for various stats
 */
export const GTO_BENCHMARKS: Record<string, { min: number; optimal: number; max: number }> = {
  vpip: { min: 0.18, optimal: 0.23, max: 0.28 },
  pfr: { min: 0.15, optimal: 0.18, max: 0.22 },
  threeBet: { min: 0.06, optimal: 0.08, max: 0.12 },
  cbet: { min: 0.55, optimal: 0.65, max: 0.75 },
  aggressionFactor: { min: 1.2, optimal: 1.5, max: 2.0 },
  aggressionFreq: { min: 0.50, optimal: 0.55, max: 0.65 },
  wtsd: { min: 0.20, optimal: 0.25, max: 0.30 },
  wsd: { min: 0.45, optimal: 0.50, max: 0.55 },
};

/**
 * GTO VPIP ranges by position
 */
export const GTO_POSITION_VPIP: Record<Position, { min: number; optimal: number; max: number }> = {
  UTG: { min: 0.12, optimal: 0.15, max: 0.18 },
  HJ: { min: 0.16, optimal: 0.20, max: 0.24 },
  CO: { min: 0.22, optimal: 0.26, max: 0.30 },
  BTN: { min: 0.35, optimal: 0.42, max: 0.48 },
  SB: { min: 0.28, optimal: 0.35, max: 0.40 },
  BB: { min: 0.30, optimal: 0.38, max: 0.45 },
};

/**
 * GTO PFR ranges by position
 */
export const GTO_POSITION_PFR: Record<Position, { min: number; optimal: number; max: number }> = {
  UTG: { min: 0.10, optimal: 0.12, max: 0.15 },
  HJ: { min: 0.13, optimal: 0.16, max: 0.20 },
  CO: { min: 0.18, optimal: 0.22, max: 0.26 },
  BTN: { min: 0.30, optimal: 0.36, max: 0.42 },
  SB: { min: 0.22, optimal: 0.28, max: 0.34 },
  BB: { min: 0.08, optimal: 0.12, max: 0.16 },
};

/**
 * Detect leaks in hero's play compared to GTO
 * Returns array of leaks sorted by severity and cost
 */
export function detectLeaks(stats: HeroStats, positionalStats: PositionalStats): Leak[] {
  const leaks: Leak[] = [];
  
  // Check overall VPIP deviation
  const vpipDeviation = stats.vpip - GTO_BENCHMARKS.vpip.optimal;
  if (Math.abs(vpipDeviation) > 0.08) {
    leaks.push({
      id: 'vpip_deviation',
      severity: Math.abs(vpipDeviation) > 0.15 ? 'critical' : 'moderate',
      category: 'preflop',
      title: vpipDeviation > 0 ? 'Playing Too Loose' : 'Playing Too Tight',
      description: `Your VPIP is ${(stats.vpip * 100).toFixed(1)}%, which is ${Math.abs(vpipDeviation * 100).toFixed(1)}% ${vpipDeviation > 0 ? 'higher' : 'lower'} than optimal (23%).`,
      yourStat: stats.vpip,
      gtoStat: GTO_BENCHMARKS.vpip.optimal,
      deviation: vpipDeviation,
      estimatedCost: Math.abs(vpipDeviation) * 30,
      fix: vpipDeviation > 0
        ? 'Tighten your opening ranges, especially from early position. Fold marginal hands like KJo, A9s, suited connectors from UTG/HJ.'
        : 'Loosen up, especially from late position. Add more suited connectors, suited aces (A5s-A2s), and pocket pairs (22-66) to your BTN/CO range.',
    });
  }
  
  // Check PFR/VPIP ratio
  const pfrVpipRatio = stats.vpip > 0 ? stats.pfr / stats.vpip : 0;
  if (pfrVpipRatio < 0.6 && stats.vpip > 0.10) {
    leaks.push({
      id: 'passive_preflop',
      severity: pfrVpipRatio < 0.4 ? 'critical' : 'moderate',
      category: 'aggression',
      title: 'Too Passive Preflop',
      description: `You're only raising ${(stats.pfr * 100).toFixed(1)}% of the time when you enter pots (${(stats.vpip * 100).toFixed(1)}% VPIP). You should be raising 60-80% of the hands you play.`,
      yourStat: pfrVpipRatio,
      gtoStat: 0.75,
      deviation: pfrVpipRatio - 0.75,
      estimatedCost: (0.75 - pfrVpipRatio) * 25,
      fix: 'Raise instead of limping or calling. If a hand is worth playing, it\'s usually worth raising. Open-limping is almost always -EV. Only call when facing raises with speculative hands.',
    });
  }
  
  // Check UTG VPIP
  const utgStats = positionalStats['UTG'];
  if (utgStats && utgStats.hands >= 10) {
    const utgVpip = utgStats.vpip;
    const utgDeviation = utgVpip - GTO_POSITION_VPIP.UTG.optimal;
    
    if (utgDeviation > 0.08) {
      leaks.push({
        id: 'utg_too_loose',
        severity: utgDeviation > 0.15 ? 'critical' : 'moderate',
        category: 'position',
        title: 'Opening Too Wide from UTG',
        description: `Your UTG VPIP is ${(utgVpip * 100).toFixed(1)}%, but should be around ${(GTO_POSITION_VPIP.UTG.optimal * 100).toFixed(1)}%. You're bleeding chips from early position.`,
        yourStat: utgVpip,
        gtoStat: GTO_POSITION_VPIP.UTG.optimal,
        deviation: utgDeviation,
        estimatedCost: utgDeviation * 40,
        fix: 'Only open top 12-15% of hands from UTG: 88+, AJs+, AQo+, KQs. Fold everything else including hands like A9s, KJo, 77-, QJs.',
      });
    }
  }
  
  // Check BTN VPIP (too tight from button)
  const btnStats = positionalStats['BTN'];
  if (btnStats && btnStats.hands >= 10) {
    const btnVpip = btnStats.vpip;
    const btnDeviation = btnVpip - GTO_POSITION_VPIP.BTN.optimal;
    
    if (btnDeviation < -0.10) {
      leaks.push({
        id: 'btn_too_tight',
        severity: 'moderate',
        category: 'position',
        title: 'Not Stealing Enough from Button',
        description: `Your BTN VPIP is ${(btnVpip * 100).toFixed(1)}%, but you can profitably open ${(GTO_POSITION_VPIP.BTN.optimal * 100).toFixed(1)}% from the button.`,
        yourStat: btnVpip,
        gtoStat: GTO_POSITION_VPIP.BTN.optimal,
        deviation: btnDeviation,
        estimatedCost: Math.abs(btnDeviation) * 20,
        fix: 'Open wider from BTN. You can profitably open hands like K7s, Q9s, J9s, any suited ace, any pocket pair, and many broadway combinations.',
      });
    }
  }
  
  // Check aggression factor
  if (stats.aggressionFactor < 1.0 && stats.handsAnalyzed >= 20) {
    leaks.push({
      id: 'low_aggression',
      severity: stats.aggressionFactor < 0.7 ? 'critical' : 'moderate',
      category: 'aggression',
      title: 'Not Aggressive Enough',
      description: `Your aggression factor is ${stats.aggressionFactor.toFixed(2)}, but should be 1.5+. You're calling too much and not betting/raising enough.`,
      yourStat: stats.aggressionFactor,
      gtoStat: 1.5,
      deviation: stats.aggressionFactor - 1.5,
      estimatedCost: (1.5 - stats.aggressionFactor) * 20,
      fix: 'Bet and raise more often. When you have a decent hand or draw, be aggressive. Checking and calling should be your least common actions postflop.',
    });
  }
  
  // Check high aggression
  if (stats.aggressionFactor > 2.5 && stats.handsAnalyzed >= 20) {
    leaks.push({
      id: 'over_aggressive',
      severity: 'moderate',
      category: 'aggression',
      title: 'Too Aggressive - Possible Spewy',
      description: `Your aggression factor is ${stats.aggressionFactor.toFixed(2)}, which is very high. You may be bluffing too much or betting with marginal hands.`,
      yourStat: stats.aggressionFactor,
      gtoStat: 1.5,
      deviation: stats.aggressionFactor - 1.5,
      estimatedCost: (stats.aggressionFactor - 2.0) * 15,
      fix: 'Mix in more checks and calls. Not every hand needs to be bet. Check some medium-strength hands and give up more often when facing resistance.',
    });
  }
  
  // Check C-bet frequency
  if (stats.cbetOpportunities >= 10) {
    const cbetDeviation = stats.cbet - GTO_BENCHMARKS.cbet.optimal;
    
    if (cbetDeviation < -0.20) {
      leaks.push({
        id: 'low_cbet',
        severity: 'moderate',
        category: 'postflop',
        title: 'Not C-betting Enough',
        description: `You're only c-betting ${(stats.cbet * 100).toFixed(1)}% when you raise preflop, but should be around 65%.`,
        yourStat: stats.cbet,
        gtoStat: GTO_BENCHMARKS.cbet.optimal,
        deviation: cbetDeviation,
        estimatedCost: Math.abs(cbetDeviation) * 15,
        fix: 'Continuation bet more often on the flop after raising preflop. Bet with your strong hands, draws, and some air to maintain balance.',
      });
    } else if (cbetDeviation > 0.20) {
      leaks.push({
        id: 'high_cbet',
        severity: 'moderate',
        category: 'postflop',
        title: 'C-betting Too Often',
        description: `You're c-betting ${(stats.cbet * 100).toFixed(1)}% of the time, which is too high (optimal ~65%). You're likely betting on bad boards.`,
        yourStat: stats.cbet,
        gtoStat: GTO_BENCHMARKS.cbet.optimal,
        deviation: cbetDeviation,
        estimatedCost: Math.abs(cbetDeviation) * 12,
        fix: 'Check more on bad flops (low cards, very coordinated boards). You don\'t need to c-bet every time. Give up when you miss and the board favors your opponent.',
      });
    }
  }
  
  // Check WTSD - going to showdown too much or too little
  if (stats.sawFlopCount >= 20) {
    const wtsdDeviation = stats.wtsd - GTO_BENCHMARKS.wtsd.optimal;
    
    if (wtsdDeviation > 0.10) {
      leaks.push({
        id: 'high_wtsd',
        severity: 'minor',
        category: 'postflop',
        title: 'Going to Showdown Too Often',
        description: `You're going to showdown ${(stats.wtsd * 100).toFixed(1)}% of the time when you see a flop. This suggests you're not folding enough to aggression.`,
        yourStat: stats.wtsd,
        gtoStat: GTO_BENCHMARKS.wtsd.optimal,
        deviation: wtsdDeviation,
        estimatedCost: wtsdDeviation * 15,
        fix: 'Fold more on later streets when facing bets. Not every pair or draw is worth taking to showdown.',
      });
    }
  }
  
  // Sort by severity and estimated cost
  return leaks.sort((a, b) => {
    const severityOrder = { critical: 0, moderate: 1, minor: 2 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.estimatedCost - a.estimatedCost;
  });
}

/**
 * Determine playing style based on stats
 */
export function determinePlayingStyle(stats: HeroStats): PlayingStyle {
  if (stats.handsAnalyzed < 20) {
    return {
      style: 'Balanced',
      label: 'Not Enough Data',
      description: 'Play more hands to determine your playing style.',
      color: '#8E8E93',
    };
  }

  const isLoose = stats.vpip > 0.28;
  const isTight = stats.vpip < 0.20;
  const isAggressive = stats.aggressionFactor > 1.3;
  const isPassive = stats.aggressionFactor < 1.0;
  
  if (isLoose && isAggressive) {
    return {
      style: 'LAG',
      label: 'LAG (Loose-Aggressive)',
      description: 'You play many hands aggressively. This is high variance but can be very profitable with good postflop play.',
      color: '#FF3B30',
    };
  }
  
  if (isTight && isAggressive) {
    return {
      style: 'TAG',
      label: 'TAG (Tight-Aggressive)',
      description: 'You play few hands but play them aggressively. This is the most fundamentally sound and profitable strategy.',
      color: '#34C759',
    };
  }
  
  if (isLoose && isPassive) {
    return {
      style: 'LP',
      label: 'Calling Station (Loose-Passive)',
      description: 'You play many hands passively. This is generally -EV. You should either tighten up significantly or increase aggression.',
      color: '#FF9500',
    };
  }
  
  if (isTight && isPassive) {
    return {
      style: 'TP',
      label: 'Nit (Tight-Passive)',
      description: 'You play few hands and play them passively. Increase your aggression - bet and raise more with your strong hands.',
      color: '#8E8E93',
    };
  }
  
  return {
    style: 'Balanced',
    label: 'Balanced',
    description: 'You have a balanced playing style. Continue refining your ranges and postflop strategy.',
    color: '#FFFFFF',
  };
}

/**
 * Calculate GTO alignment score (0-1) based on how close stats are to GTO
 */
export function calculateGTOAlignment(stats: HeroStats): number {
  const scores: number[] = [];
  
  // VPIP alignment
  const vpipScore = 1 - Math.min(1, Math.abs(stats.vpip - GTO_BENCHMARKS.vpip.optimal) / 0.15);
  scores.push(vpipScore);
  
  // PFR alignment
  const pfrScore = 1 - Math.min(1, Math.abs(stats.pfr - GTO_BENCHMARKS.pfr.optimal) / 0.12);
  scores.push(pfrScore);
  
  // Aggression alignment
  const afScore = 1 - Math.min(1, Math.abs(stats.aggressionFactor - GTO_BENCHMARKS.aggressionFactor.optimal) / 1.0);
  scores.push(afScore);
  
  // C-bet alignment (if enough opportunities)
  if (stats.cbetOpportunities >= 5) {
    const cbetScore = 1 - Math.min(1, Math.abs(stats.cbet - GTO_BENCHMARKS.cbet.optimal) / 0.20);
    scores.push(cbetScore);
  }
  
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}
