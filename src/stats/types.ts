import type { Position } from '../types/poker';

export interface HeroStats {
  // Basic info
  handsAnalyzed: number;
  
  // Preflop stats
  vpip: number;              // % of hands where money voluntarily entered pot
  pfr: number;               // % of hands with preflop raise
  threeBet: number;          // % of times 3-bet when facing raise
  threeBetOpportunities: number;
  foldTo3Bet: number;        // % fold when facing 3-bet
  foldTo3BetOpportunities: number;
  
  // Postflop stats
  cbet: number;              // Continuation bet % on flop
  cbetOpportunities: number;
  foldToCbet: number;        // % fold to c-bet
  foldToCbetOpportunities: number;
  
  // Showdown stats
  wtsd: number;              // % went to showdown when saw flop
  wentToShowdownCount: number;
  sawFlopCount: number;
  wsd: number;               // % won at showdown
  wonAtShowdownCount: number;
  wsdOpportunities: number;
  
  // Aggression stats
  aggressionFactor: number;  // (bet+raise) / call
  aggressionFreq: number;    // (bet+raise) / (bet+raise+call+check)
  totalAggressiveActions: number;
  totalPassiveActions: number;
  
  // Results
  totalProfit: number;
  bbPer100Hands: number;
  winRate: number;
}

export interface PositionalStats {
  [key: string]: {
    hands: number;
    vpip: number;
    pfr: number;
    threeBet: number;
    profit: number;
    bbPer100: number;
    winRate: number;
  };
}

export interface RollingWindowStats {
  last50: HeroStats;
  last100: HeroStats;
  last500: HeroStats;
  allTime: HeroStats;
}

export interface Leak {
  id: string;
  severity: 'critical' | 'moderate' | 'minor';
  category: 'preflop' | 'postflop' | 'aggression' | 'position';
  title: string;
  description: string;
  yourStat: number;
  gtoStat: number;
  deviation: number;
  estimatedCost: number; // BB per 100 hands
  fix: string;
}

export interface PlayingStyle {
  style: 'LAG' | 'TAG' | 'LP' | 'TP' | 'Balanced';
  label: string;
  description: string;
  color: string;
}

export interface StatsSnapshot {
  handNumber: number;
  timestamp: number;
  handsAnalyzed: number;
  vpip: number;
  pfr: number;
  threeBet: number;
  aggressionFactor: number;
  profit: number;
  gtoAccuracy: number;
}

export const POSITIONS: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
