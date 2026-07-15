import type { HeroStats } from './types';
import type { StoredHand } from '../storage/hand-history';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  target: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: 'hands' | 'profit' | 'gto' | 'style' | 'special';
}

export interface SkillRating {
  overall: number;
  preflop: number;
  postflop: number;
  aggression: number;
  position: number;
  gtoAlignment: number;
  
  // Ranking
  rank: string;
  nextRank: string;
  progressToNext: number;
}

const SKILL_RANKS = [
  { name: 'Beginner', minRating: 0 },
  { name: 'Novice', minRating: 1000 },
  { name: 'Intermediate', minRating: 1200 },
  { name: 'Advanced', minRating: 1400 },
  { name: 'Expert', minRating: 1600 },
  { name: 'Master', minRating: 1800 },
  { name: 'GTO Crusher', minRating: 2000 },
];

/**
 * Calculate skill rating based on stats and performance
 */
export function calculateSkillRating(
  stats: HeroStats,
  hands: StoredHand[]
): SkillRating {
  if (stats.handsAnalyzed < 20) {
    return {
      overall: 800,
      preflop: 800,
      postflop: 800,
      aggression: 800,
      position: 800,
      gtoAlignment: 800,
      rank: 'Beginner',
      nextRank: 'Novice',
      progressToNext: (stats.handsAnalyzed / 20) * 100,
    };
  }

  // Preflop rating (VPIP/PFR alignment with GTO)
  const vpipScore = 1 - Math.min(1, Math.abs(stats.vpip - 0.23) / 0.15);
  const pfrScore = 1 - Math.min(1, Math.abs(stats.pfr - 0.18) / 0.12);
  const preflopRating = 800 + (vpipScore + pfrScore) * 600;
  
  // Postflop rating (c-bet, WTSD, W$SD)
  const cbetScore = stats.cbetOpportunities >= 5 
    ? 1 - Math.min(1, Math.abs(stats.cbet - 0.65) / 0.20)
    : 0.5;
  const wtsdScore = stats.sawFlopCount >= 10
    ? 1 - Math.min(1, Math.abs(stats.wtsd - 0.25) / 0.10)
    : 0.5;
  const postflopRating = 800 + (cbetScore + wtsdScore) * 600;
  
  // Aggression rating
  const afScore = 1 - Math.min(1, Math.abs(stats.aggressionFactor - 1.5) / 1.0);
  const aggressionRating = 800 + afScore * 1200;
  
  // Position rating (placeholder - would need position-specific analysis)
  const positionRating = 1200; // TODO: Calculate from positional stats
  
  // GTO alignment rating
  const gtoAccuracy = hands.length > 0
    ? hands.reduce((sum, h) => {
        const avg = h.feedback.reduce((s, f) => s + f.gto.alignment, 0) / Math.max(h.feedback.length, 1);
        return sum + avg;
      }, 0) / hands.length
    : 0;
  const gtoRating = 800 + gtoAccuracy * 1200;
  
  // Overall rating (weighted average)
  const overall = (
    preflopRating * 0.25 +
    postflopRating * 0.25 +
    aggressionRating * 0.15 +
    positionRating * 0.15 +
    gtoRating * 0.20
  );
  
  // Determine rank
  let rank = 'Beginner';
  let nextRank = 'Novice';
  let progressToNext = 0;
  
  for (let i = SKILL_RANKS.length - 1; i >= 0; i--) {
    if (overall >= SKILL_RANKS[i].minRating) {
      rank = SKILL_RANKS[i].name;
      if (i < SKILL_RANKS.length - 1) {
        nextRank = SKILL_RANKS[i + 1].name;
        const currentMin = SKILL_RANKS[i].minRating;
        const nextMin = SKILL_RANKS[i + 1].minRating;
        progressToNext = ((overall - currentMin) / (nextMin - currentMin)) * 100;
      } else {
        nextRank = 'Max Rank';
        progressToNext = 100;
      }
      break;
    }
  }
  
  return {
    overall: Math.round(overall),
    preflop: Math.round(preflopRating),
    postflop: Math.round(postflopRating),
    aggression: Math.round(aggressionRating),
    position: Math.round(positionRating),
    gtoAlignment: Math.round(gtoRating),
    rank,
    nextRank,
    progressToNext,
  };
}

/**
 * Check and return all achievements with progress
 */
export function checkAchievements(
  stats: HeroStats,
  hands: StoredHand[]
): Achievement[] {
  const achievements: Achievement[] = [];
  
  // Hands played achievements
  achievements.push({
    id: 'first_hand',
    name: 'First Steps',
    description: 'Play your first hand',
    icon: '🎯',
    unlocked: stats.handsAnalyzed >= 1,
    progress: Math.min(stats.handsAnalyzed, 1),
    target: 1,
    rarity: 'common',
    category: 'hands',
  });
  
  achievements.push({
    id: 'century',
    name: 'Century',
    description: 'Play 100 hands',
    icon: '💯',
    unlocked: stats.handsAnalyzed >= 100,
    progress: Math.min(stats.handsAnalyzed, 100),
    target: 100,
    rarity: 'rare',
    category: 'hands',
  });
  
  achievements.push({
    id: 'grinder',
    name: 'The Grinder',
    description: 'Play 500 hands',
    icon: '⚙️',
    unlocked: stats.handsAnalyzed >= 500,
    progress: Math.min(stats.handsAnalyzed, 500),
    target: 500,
    rarity: 'epic',
    category: 'hands',
  });
  
  achievements.push({
    id: 'pro',
    name: 'Professional',
    description: 'Play 1000 hands',
    icon: '👑',
    unlocked: stats.handsAnalyzed >= 1000,
    progress: Math.min(stats.handsAnalyzed, 1000),
    target: 1000,
    rarity: 'legendary',
    category: 'hands',
  });
  
  // GTO achievements
  const gtoAccuracy = hands.length > 0
    ? hands.reduce((sum, h) => {
        const avg = h.feedback.reduce((s, f) => s + f.gto.alignment, 0) / Math.max(h.feedback.length, 1);
        return sum + avg;
      }, 0) / hands.length
    : 0;
  
  achievements.push({
    id: 'gto_grinder',
    name: 'GTO Grinder',
    description: 'Achieve 85% GTO alignment over 50 hands',
    icon: '🎓',
    unlocked: stats.handsAnalyzed >= 50 && gtoAccuracy >= 0.85,
    progress: stats.handsAnalyzed >= 50 ? Math.min(gtoAccuracy * 100, 85) : 0,
    target: 85,
    rarity: 'epic',
    category: 'gto',
  });
  
  // VPIP achievements
  const vpipInRange = stats.vpip >= 0.18 && stats.vpip <= 0.28;
  achievements.push({
    id: 'balanced_vpip',
    name: 'Balanced Player',
    description: 'Maintain VPIP between 18-28% for 50 hands',
    icon: '⚖️',
    unlocked: stats.handsAnalyzed >= 50 && vpipInRange,
    progress: vpipInRange ? 100 : (1 - Math.min(Math.abs(stats.vpip - 0.23) / 0.10, 1)) * 100,
    target: 100,
    rarity: 'rare',
    category: 'gto',
  });
  
  // Style achievements
  achievements.push({
    id: 'tag_master',
    name: 'TAG Master',
    description: 'Play tight-aggressive style for 100 hands',
    icon: '🔥',
    unlocked: stats.handsAnalyzed >= 100 && stats.vpip < 0.25 && stats.aggressionFactor > 1.3,
    progress: stats.handsAnalyzed >= 100 && stats.vpip < 0.25 && stats.aggressionFactor > 1.3 ? 100 : 0,
    target: 100,
    rarity: 'epic',
    category: 'style',
  });
  
  achievements.push({
    id: 'lag_master',
    name: 'LAG Master',
    description: 'Play loose-aggressive style for 100 hands',
    icon: '🌪️',
    unlocked: stats.handsAnalyzed >= 100 && stats.vpip > 0.28 && stats.aggressionFactor > 1.5,
    progress: stats.handsAnalyzed >= 100 && stats.vpip > 0.28 && stats.aggressionFactor > 1.5 ? 100 : 0,
    target: 100,
    rarity: 'epic',
    category: 'style',
  });
  
  // Aggression achievements
  achievements.push({
    id: 'aggressor',
    name: 'The Aggressor',
    description: 'Maintain aggression factor > 2.0 for 50 hands',
    icon: '💪',
    unlocked: stats.handsAnalyzed >= 50 && stats.aggressionFactor > 2.0,
    progress: Math.min((stats.aggressionFactor / 2.0) * 100, 100),
    target: 100,
    rarity: 'rare',
    category: 'style',
  });
  
  // 3-bet achievement
  achievements.push({
    id: 'three_bet_king',
    name: '3-Bet King',
    description: '3-bet 15+ times',
    icon: '👊',
    unlocked: stats.threeBetOpportunities >= 15 && stats.threeBet > 0.05,
    progress: Math.min(stats.threeBetOpportunities >= 15 ? (stats.threeBet * 200) : 0, 100),
    target: 100,
    rarity: 'rare',
    category: 'style',
  });
  
  // Profit achievements
  achievements.push({
    id: 'first_profit',
    name: 'First Profit',
    description: 'Reach +$100 profit',
    icon: '💰',
    unlocked: stats.totalProfit >= 100,
    progress: Math.min(stats.totalProfit, 100),
    target: 100,
    rarity: 'common',
    category: 'profit',
  });
  
  achievements.push({
    id: 'crusher',
    name: 'The Crusher',
    description: 'Reach +$500 profit',
    icon: '💎',
    unlocked: stats.totalProfit >= 500,
    progress: Math.min(stats.totalProfit, 500),
    target: 500,
    rarity: 'epic',
    category: 'profit',
  });
  
  achievements.push({
    id: 'whale',
    name: 'High Roller',
    description: 'Reach +$1000 profit',
    icon: '🐋',
    unlocked: stats.totalProfit >= 1000,
    progress: Math.min(stats.totalProfit, 1000),
    target: 1000,
    rarity: 'legendary',
    category: 'profit',
  });
  
  // Win rate achievements
  achievements.push({
    id: 'winner',
    name: 'Consistent Winner',
    description: 'Maintain 55%+ win rate over 100 hands',
    icon: '🏆',
    unlocked: stats.handsAnalyzed >= 100 && stats.winRate >= 0.55,
    progress: stats.handsAnalyzed >= 100 ? Math.min((stats.winRate / 0.55) * 100, 100) : 0,
    target: 100,
    rarity: 'rare',
    category: 'profit',
  });
  
  // Special achievements
  achievements.push({
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Play 10 consecutive hands with 90%+ GTO accuracy',
    icon: '✨',
    unlocked: false, // TODO: Track consecutive hands
    progress: 0,
    target: 10,
    rarity: 'legendary',
    category: 'special',
  });
  
  return achievements.sort((a, b) => {
    // Sort by: unlocked first, then by rarity, then by progress
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    
    const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
    if (rarityOrder[a.rarity] !== rarityOrder[b.rarity]) {
      return rarityOrder[a.rarity] - rarityOrder[b.rarity];
    }
    
    return (b.progress / b.target) - (a.progress / a.target);
  });
}
