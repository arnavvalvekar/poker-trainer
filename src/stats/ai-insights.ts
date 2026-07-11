import type { HeroStats } from './types';
import type { StoredHand } from '../storage/hand-history';
import { calculateHeroStats } from './hero-stats';
import { GTO_BENCHMARKS } from './gto-comparison';

export interface TiltIndicators {
  tiltDetected: boolean;
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  indicators: string[];
  recommendation: string;
  confidence: number; // 0-1
}

export interface Pattern {
  id: string;
  type: 'behavior' | 'tendency' | 'leak' | 'strength';
  title: string;
  description: string;
  frequency: number; // How often it occurs (0-1)
  impact: 'positive' | 'negative' | 'neutral';
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface PersonalizedInsight {
  id: string;
  category: 'preflop' | 'postflop' | 'mental' | 'adjustment' | 'general';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  insight: string;
  actionable: string;
  evidence: string[];
}

export interface AIInsights {
  tilt: TiltIndicators;
  patterns: Pattern[];
  recommendations: PersonalizedInsight[];
  playingStyleConsistency: number; // 0-1
  mentalGameScore: number; // 0-100
}

const HERO_PLAYER_ID = 0;

/**
 * Detect tilt based on recent behavior changes
 */
export function detectTilt(
  hands: StoredHand[],
  recentHandCount: number = 20,
  bigBlind: number = 2
): TiltIndicators {
  if (hands.length < recentHandCount * 2) {
    return {
      tiltDetected: false,
      severity: 'none',
      indicators: [],
      recommendation: 'Play more hands to detect tilt patterns.',
      confidence: 0,
    };
  }

  const sorted = [...hands].sort((a, b) => b.timestamp - a.timestamp);
  const recentHands = sorted.slice(0, recentHandCount);
  const baselineHands = sorted.slice(recentHandCount, recentHandCount * 3);

  const recentStats = calculateHeroStats(recentHands, bigBlind);
  const baselineStats = calculateHeroStats(baselineHands, bigBlind);

  const indicators: string[] = [];
  let tiltScore = 0;

  // Check VPIP spike
  const vpipChange = recentStats.vpip - baselineStats.vpip;
  if (vpipChange > 0.15) {
    indicators.push(`VPIP jumped ${(vpipChange * 100).toFixed(0)}% in last ${recentHandCount} hands (${(baselineStats.vpip * 100).toFixed(0)}% → ${(recentStats.vpip * 100).toFixed(0)}%)`);
    tiltScore += 2;
  }

  // Check aggression spike
  const afChange = recentStats.aggressionFactor - baselineStats.aggressionFactor;
  if (afChange > 1.0) {
    indicators.push(`Aggression Factor spiked +${afChange.toFixed(1)}x (${baselineStats.aggressionFactor.toFixed(1)} → ${recentStats.aggressionFactor.toFixed(1)})`);
    tiltScore += 2;
  }

  // Check recent losses
  const recentLosses = recentHands.slice(0, 5).filter(h => h.result === 'loss').length;
  if (recentLosses >= 4) {
    indicators.push(`Lost 4+ of last 5 hands - emotional play likely`);
    tiltScore += 1;
  }

  // Check profit trend
  const recentProfit = recentHands.slice(0, 10).reduce((sum, h) => sum + h.stackChange, 0);
  if (recentProfit < -bigBlind * 20) {
    indicators.push(`Down ${Math.abs(recentProfit).toFixed(0)} in last 10 hands`);
    tiltScore += 1;
  }

  // Check aggressive actions spike
  const recentAggPct = recentStats.aggressionFreq;
  const baselineAggPct = baselineStats.aggressionFreq;
  if (recentAggPct - baselineAggPct > 0.20) {
    indicators.push(`Playing ${((recentAggPct - baselineAggPct) * 100).toFixed(0)}% more aggressively`);
    tiltScore += 1;
  }

  // Check all-in frequency (if data available)
  const recentAllIns = recentHands.filter(h => 
    h.actions.some(a => a.playerId === HERO_PLAYER_ID && a.action === 'all-in')
  ).length;
  const baselineAllIns = baselineHands.filter(h => 
    h.actions.some(a => a.playerId === HERO_PLAYER_ID && a.action === 'all-in')
  ).length;
  
  if (recentAllIns > baselineAllIns * 2 && recentAllIns > 2) {
    indicators.push(`Going all-in ${recentAllIns}x in last ${recentHandCount} hands (usually ${baselineAllIns})`);
    tiltScore += 2;
  }

  const tiltDetected = tiltScore >= 2;
  let severity: TiltIndicators['severity'] = 'none';
  let recommendation = '';

  if (tiltScore >= 5) {
    severity = 'severe';
    recommendation = '🛑 STOP PLAYING NOW. You\'re clearly tilting. Take a 30 minute break, review your recent hands, and come back with a clear head.';
  } else if (tiltScore >= 3) {
    severity = 'moderate';
    recommendation = '⚠️ Warning signs of tilt detected. Take a 5-10 minute break. Review your ranges and reset mentally before continuing.';
  } else if (tiltScore >= 2) {
    severity = 'mild';
    recommendation = '💡 Possible tilt detected. Take 3 deep breaths, check your ranges, and play your next few hands extra carefully.';
  } else {
    recommendation = '✅ No tilt detected. Your play is consistent with your baseline.';
  }

  return {
    tiltDetected,
    severity,
    indicators,
    recommendation,
    confidence: Math.min(1, tiltScore / 6),
  };
}

/**
 * Detect behavioral patterns in play
 */
export function detectPatterns(
  hands: StoredHand[],
  stats: HeroStats,
  bigBlind: number = 2
): Pattern[] {
  if (hands.length < 50) {
    return [];
  }

  const patterns: Pattern[] = [];

  // Pattern: Post-loss behavior
  const handsAfterLoss = hands.filter((_h, i) => {
    if (i === 0) return false;
    const prevHand = hands[i - 1];
    return prevHand.result === 'loss';
  });
  
  if (handsAfterLoss.length >= 10) {
    const afterLossStats = calculateHeroStats(handsAfterLoss, bigBlind);
    const vpipDiff = afterLossStats.vpip - stats.vpip;
    
    if (Math.abs(vpipDiff) > 0.10) {
      patterns.push({
        id: 'post_loss_adjustment',
        type: 'behavior',
        title: vpipDiff > 0 ? 'Loose After Losses' : 'Tight After Losses',
        description: `Your VPIP ${vpipDiff > 0 ? 'increases' : 'decreases'} by ${Math.abs(vpipDiff * 100).toFixed(0)}% after losing a hand (${(stats.vpip * 100).toFixed(0)}% → ${(afterLossStats.vpip * 100).toFixed(0)}%)`,
        frequency: handsAfterLoss.length / hands.length,
        impact: 'negative',
        severity: Math.abs(vpipDiff) > 0.15 ? 'high' : 'medium',
        recommendation: vpipDiff > 0 
          ? 'You tend to play too loose after losses - "chasing" losses. Stick to your ranges regardless of recent results.'
          : 'You tend to tighten up too much after losses - don\'t let one loss affect your range. Trust your strategy.',
      });
    }
  }

  // Pattern: Position-specific tendencies
  const btnHands = hands.filter(h => h.heroPosition === 'BTN');
  const utgHands = hands.filter(h => h.heroPosition === 'UTG');
  
  if (btnHands.length >= 15 && utgHands.length >= 15) {
    const btnStats = calculateHeroStats(btnHands, bigBlind);
    const utgStats = calculateHeroStats(utgHands, bigBlind);
    
    // Check if button VPIP is too low
    if (btnStats.vpip < 0.35) {
      patterns.push({
        id: 'btn_too_tight',
        type: 'leak',
        title: 'Not Stealing Enough from Button',
        description: `Button VPIP is ${(btnStats.vpip * 100).toFixed(0)}% but you can profitably open 40-45% of hands`,
        frequency: btnHands.length / hands.length,
        impact: 'negative',
        severity: 'medium',
        recommendation: 'Open wider from the button. Add hands like K7s, Q9s, J9s, any suited ace, any pocket pair, and many broadway combos.',
      });
    }
    
    // Check if UTG VPIP is too high
    if (utgStats.vpip > 0.20) {
      patterns.push({
        id: 'utg_too_loose',
        type: 'leak',
        title: 'Opening Too Wide from UTG',
        description: `UTG VPIP is ${(utgStats.vpip * 100).toFixed(0)}% but optimal is 12-15%`,
        frequency: utgHands.length / hands.length,
        impact: 'negative',
        severity: 'high',
        recommendation: 'Tighten your UTG range significantly. Only open 88+, AJs+, AQo+, KQs.',
      });
    }
  }

  // Pattern: C-bet on board textures (simplified)
  if (stats.cbetOpportunities >= 20) {
    const cbetDeviation = Math.abs(stats.cbet - GTO_BENCHMARKS.cbet.optimal);
    
    if (cbetDeviation > 0.15) {
      patterns.push({
        id: 'cbet_frequency',
        type: stats.cbet > GTO_BENCHMARKS.cbet.optimal ? 'leak' : 'tendency',
        title: stats.cbet > GTO_BENCHMARKS.cbet.optimal ? 'Over-C-betting' : 'Under-C-betting',
        description: `C-bet frequency is ${(stats.cbet * 100).toFixed(0)}%, ${cbetDeviation > 0 ? 'above' : 'below'} optimal (65%)`,
        frequency: stats.cbetOpportunities / stats.handsAnalyzed,
        impact: 'negative',
        severity: cbetDeviation > 0.25 ? 'high' : 'medium',
        recommendation: stats.cbet > GTO_BENCHMARKS.cbet.optimal
          ? 'You c-bet too often. Check more on bad boards (low cards, very coordinated). Give up when you miss.'
          : 'You don\'t c-bet enough. Bet with your strong hands, draws, and some air for balance.',
      });
    }
  }

  // Pattern: Aggression consistency
  if (stats.handsAnalyzed >= 100) {
    const recentHands = [...hands].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
    const oldHands = [...hands].sort((a, b) => b.timestamp - a.timestamp).slice(50, 100);
    
    const recentAF = calculateHeroStats(recentHands, bigBlind).aggressionFactor;
    const oldAF = calculateHeroStats(oldHands, bigBlind).aggressionFactor;
    
    const afChange = Math.abs(recentAF - oldAF);
    
    if (afChange > 0.5) {
      patterns.push({
        id: 'aggression_inconsistency',
        type: 'behavior',
        title: 'Inconsistent Aggression',
        description: `Your aggression varies significantly (${oldAF.toFixed(1)}x → ${recentAF.toFixed(1)}x over last 50 hands)`,
        frequency: 1.0,
        impact: 'negative',
        severity: 'medium',
        recommendation: 'Try to maintain consistent aggression levels. Don\'t shift between passive and hyper-aggressive without good reason.',
      });
    }
  }

  // Pattern: Strong GTO adherence (positive pattern)
  if (stats.handsAnalyzed >= 50) {
    const gtoAccuracy = hands.reduce((sum, h) => {
      const avg = h.feedback.reduce((s, f) => s + f.gto.alignment, 0) / Math.max(h.feedback.length, 1);
      return sum + avg;
    }, 0) / hands.length;
    
    if (gtoAccuracy > 0.80) {
      patterns.push({
        id: 'strong_gto',
        type: 'strength',
        title: 'Strong GTO Foundation',
        description: `Your decisions align ${(gtoAccuracy * 100).toFixed(0)}% with GTO - well above average`,
        frequency: 1.0,
        impact: 'positive',
        severity: 'high',
        recommendation: 'Excellent GTO fundamentals! Consider learning exploitative adjustments against weak opponents.',
      });
    }
  }

  return patterns.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Generate personalized insights and recommendations
 */
export function generatePersonalizedInsights(
  _hands: StoredHand[],
  stats: HeroStats,
  patterns: Pattern[],
  tilt: TiltIndicators,
  _bigBlind: number = 2
): PersonalizedInsight[] {
  const insights: PersonalizedInsight[] = [];

  // Critical: Tilt detected
  if (tilt.severity === 'severe') {
    insights.push({
      id: 'tilt_critical',
      category: 'mental',
      priority: 'critical',
      title: 'Severe Tilt Detected',
      insight: `Multiple tilt indicators detected: ${tilt.indicators.join('; ')}`,
      actionable: tilt.recommendation,
      evidence: tilt.indicators,
    });
  }

  // High priority: Major leaks from patterns
  const highSeverityPatterns = patterns.filter(p => p.severity === 'high' && p.impact === 'negative');
  for (const pattern of highSeverityPatterns.slice(0, 2)) {
    insights.push({
      id: `pattern_${pattern.id}`,
      category: pattern.type === 'behavior' ? 'mental' : 'preflop',
      priority: 'high',
      title: pattern.title,
      insight: pattern.description,
      actionable: pattern.recommendation,
      evidence: [pattern.description],
    });
  }

  // Medium: VPIP/PFR imbalance
  const pfrVpipRatio = stats.vpip > 0 ? stats.pfr / stats.vpip : 0;
  if (stats.handsAnalyzed >= 50 && pfrVpipRatio < 0.60) {
    insights.push({
      id: 'pfr_vpip_ratio',
      category: 'preflop',
      priority: 'high',
      title: 'Too Passive Preflop',
      insight: `You're only raising ${(stats.pfr * 100).toFixed(0)}% of the ${(stats.vpip * 100).toFixed(0)}% of hands you play. You should be raising 70-80% of hands you enter with.`,
      actionable: 'Almost never limp. If a hand is worth playing, raise it. Only call when facing raises with speculative hands like suited connectors or small pairs.',
      evidence: [
        `VPIP: ${(stats.vpip * 100).toFixed(0)}%`,
        `PFR: ${(stats.pfr * 100).toFixed(0)}%`,
        `Ratio: ${(pfrVpipRatio * 100).toFixed(0)}% (should be 70-80%)`,
      ],
    });
  }

  // Medium: Showdown tendency
  if (stats.sawFlopCount >= 30) {
    if (stats.wtsd > 0.35) {
      insights.push({
        id: 'high_wtsd',
        category: 'postflop',
        priority: 'medium',
        title: 'Going to Showdown Too Often',
        insight: `You go to showdown ${(stats.wtsd * 100).toFixed(0)}% of the time when you see a flop (optimal: 20-25%). This suggests you're not folding enough to aggression.`,
        actionable: 'Fold more on turn and river when facing bets with marginal hands. Not every pair is worth taking to showdown.',
        evidence: [
          `WTSD: ${(stats.wtsd * 100).toFixed(0)}%`,
          `Flops seen: ${stats.sawFlopCount}`,
        ],
      });
    } else if (stats.wtsd < 0.18) {
      insights.push({
        id: 'low_wtsd',
        category: 'postflop',
        priority: 'medium',
        title: 'Folding Too Much Postflop',
        insight: `You only go to showdown ${(stats.wtsd * 100).toFixed(0)}% of the time. You might be giving up too easily to aggression.`,
        actionable: 'Call down lighter with pairs and draws. Don\'t fold every time someone bets - they could be bluffing.',
        evidence: [`WTSD: ${(stats.wtsd * 100).toFixed(0)}%`],
      });
    }
  }

  // Low: Positive reinforcement
  if (stats.handsAnalyzed >= 100 && stats.totalProfit > 0 && stats.bbPer100Hands > 3) {
    insights.push({
      id: 'profitable_play',
      category: 'general',
      priority: 'low',
      title: 'Consistently Profitable',
      insight: `You're winning at ${stats.bbPer100Hands.toFixed(1)} BB/100 hands over ${stats.handsAnalyzed} hands. That's solid!`,
      actionable: 'Keep doing what you\'re doing. Focus on volume and avoiding tilt to maximize your edge.',
      evidence: [
        `Profit: +$${stats.totalProfit.toFixed(0)}`,
        `BB/100: +${stats.bbPer100Hands.toFixed(1)}`,
      ],
    });
  }

  // Adjustment recommendations
  if (insights.length === 0 && stats.handsAnalyzed >= 50) {
    insights.push({
      id: 'keep_learning',
      category: 'general',
      priority: 'low',
      title: 'Solid Foundation',
      insight: 'Your play shows no major leaks. Focus on refinement and exploitative adjustments.',
      actionable: 'Study opponent tendencies, work on board texture recognition, and practice mixed strategies for balance.',
      evidence: [],
    });
  }

  return insights.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Calculate playing style consistency (how stable your style is)
 */
export function calculateStyleConsistency(hands: StoredHand[], bigBlind: number = 2): number {
  if (hands.length < 100) return 0.5;

  const sorted = [...hands].sort((a, b) => a.timestamp - b.timestamp);
  const windowSize = 25;
  const windows: HeroStats[] = [];

  for (let i = 0; i + windowSize <= sorted.length; i += windowSize) {
    const window = sorted.slice(i, i + windowSize);
    windows.push(calculateHeroStats(window, bigBlind));
  }

  if (windows.length < 2) return 0.5;

  // Calculate variance in VPIP and AF
  const vpips = windows.map(w => w.vpip);
  const afs = windows.map(w => w.aggressionFactor);

  const vpipVariance = calculateVariance(vpips);
  const afVariance = calculateVariance(afs);

  // Lower variance = higher consistency
  const vpipConsistency = 1 - Math.min(1, vpipVariance / 0.05);
  const afConsistency = 1 - Math.min(1, afVariance / 2.0);

  return (vpipConsistency + afConsistency) / 2;
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((sum, sq) => sum + sq, 0) / values.length;
}

/**
 * Calculate mental game score (discipline, consistency, emotional control)
 */
export function calculateMentalGameScore(
  tilt: TiltIndicators,
  consistency: number,
  patterns: Pattern[]
): number {
  let score = 50; // Base score

  // Tilt impact (0-30 points)
  if (tilt.severity === 'none') score += 30;
  else if (tilt.severity === 'mild') score += 20;
  else if (tilt.severity === 'moderate') score += 10;
  // severe gives 0

  // Consistency (0-30 points)
  score += consistency * 30;

  // Negative behavioral patterns (-20 points)
  const behavioralLeaks = patterns.filter(p => p.type === 'behavior' && p.impact === 'negative');
  score -= Math.min(20, behavioralLeaks.length * 10);

  // Positive patterns (+20 points)
  const strengths = patterns.filter(p => p.impact === 'positive');
  score += Math.min(20, strengths.length * 10);

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Main function: Calculate all AI insights
 */
export function calculateAIInsights(
  hands: StoredHand[],
  stats: HeroStats,
  bigBlind: number = 2
): AIInsights {
  const tilt = detectTilt(hands, 20, bigBlind);
  const patterns = detectPatterns(hands, stats, bigBlind);
  const playingStyleConsistency = calculateStyleConsistency(hands, bigBlind);
  const recommendations = generatePersonalizedInsights(hands, stats, patterns, tilt, bigBlind);
  const mentalGameScore = calculateMentalGameScore(tilt, playingStyleConsistency, patterns);

  return {
    tilt,
    patterns,
    recommendations,
    playingStyleConsistency,
    mentalGameScore,
  };
}
