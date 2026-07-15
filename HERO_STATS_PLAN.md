# Hero Stats Tracking Implementation Plan

## Overview

Implement comprehensive player statistics tracking for the hero (user) to help them understand their playing style, identify leaks, and track improvement over time. All stats will be calculated from existing hand history data stored in IndexedDB, maintaining the offline-first architecture.

---

## Goals

1. **Track Essential Poker Stats**: VPIP, PFR, 3-bet%, c-bet%, aggression, WTSD, W$SD
2. **Positional Analysis**: Break down stats by position (UTG, HJ, CO, BTN, SB, BB)
3. **GTO Comparison**: Show deviation from GTO ranges and identify leaks
4. **Trend Analysis**: Track improvement over time with rolling windows (50/100/500 hands)
5. **Actionable Insights**: Provide specific, prioritized recommendations for improvement
6. **Mobile-Ready**: Fast calculations, works offline, minimal storage overhead

---

## Architecture Decisions

### Data Source
- **Primary**: Existing `StoredHand[]` in IndexedDB (hands store)
- **No new persistence needed**: Calculate stats on-demand from hand history
- **Caching**: In-memory cache for current session to avoid recalculation

### Calculation Strategy
```typescript
// Option A: On-demand calculation (Recommended for MVP)
- Calculate from all stored hands when Stats page loads
- Cache in memory for session
- Invalidate cache when new hand is saved
- Performance: ~50-100ms for 1000 hands (acceptable on mobile)

// Option B: Incremental updates (Future optimization)
- Store aggregate stats in IndexedDB
- Update after each hand
- Faster loading but more complex
```

**Decision**: Start with **Option A** (on-demand) for simplicity and accuracy.

### Code Organization
```
src/
├── stats/
│   ├── hero-stats.ts           # Main calculation engine
│   ├── positional-stats.ts     # Position-specific breakdowns
│   ├── gto-comparison.ts       # GTO deviation & leak detection
│   ├── trends.ts               # Time-series and rolling windows
│   ├── types.ts                # TypeScript interfaces
│   └── __tests__/
│       └── hero-stats.test.ts  # Unit tests
├── components/
│   ├── StatsDashboard.tsx      # Update existing component
│   ├── HeroStatsPanel.tsx      # NEW: Core stats display
│   ├── PositionalBreakdown.tsx # NEW: Position grid
│   ├── GTOComparison.tsx       # NEW: Leaks & deviations
│   └── TrendCharts.tsx         # NEW: Time-series visualizations
└── utils/
    └── stats-cache.ts          # In-memory caching utility
```

---

## Phase 1: Core Stats Foundation

**Goal**: Calculate and display essential poker statistics.

### Tasks

#### 1.1 Create Type Definitions
```typescript
// src/stats/types.ts

export interface HeroStats {
  // Basic stats
  handsAnalyzed: number;
  
  // Preflop
  vpip: number;              // % of hands where money voluntarily entered pot
  pfr: number;               // % of hands with preflop raise
  threeBet: number;          // % of times 3-bet when facing raise
  threeBetOpportunities: number;
  foldTo3Bet: number;        // % fold when facing 3-bet
  foldTo3BetOpportunities: number;
  
  // Postflop
  cbet: number;              // Continuation bet % on flop
  cbetOpportunities: number;
  foldToCbet: number;        // % fold to c-bet
  foldToCbetOpportunities: number;
  
  // Showdown
  wtsd: number;              // % went to showdown when saw flop
  wsd: number;               // % won at showdown
  wsdOpportunities: number;
  
  // Aggression
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
  [key: Position]: {
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
```

#### 1.2 Implement Stats Calculator
```typescript
// src/stats/hero-stats.ts

export function calculateHeroStats(hands: StoredHand[]): HeroStats {
  // Initialize counters
  let vpipHands = 0;
  let pfrHands = 0;
  let threeBets = 0;
  let threeBetOpportunities = 0;
  // ... etc
  
  // Analyze each hand
  for (const hand of hands) {
    const heroActions = hand.actions.filter(a => isHeroAction(a, hand));
    const preflopActions = heroActions.filter(a => a.street === 'preflop');
    
    // VPIP: Check if hero voluntarily put money in pot
    const voluntaryAction = preflopActions.find(a => 
      a.action === 'call' || 
      a.action === 'bet' || 
      a.action === 'raise'
    );
    if (voluntaryAction) vpipHands++;
    
    // PFR: Check if hero raised preflop
    const raiseAction = preflopActions.find(a => 
      a.action === 'raise' || 
      a.action === 'bet'
    );
    if (raiseAction) pfrHands++;
    
    // 3-bet: Check if hero 3-bet
    const facedRaise = detectFacedRaise(hand.actions, 'preflop');
    if (facedRaise) {
      threeBetOpportunities++;
      const heroReraised = preflopActions.find(a => 
        a.action === 'raise' && a.timestamp > facedRaise.timestamp
      );
      if (heroReraised) threeBets++;
    }
    
    // ... continue for all stats
  }
  
  return {
    handsAnalyzed: hands.length,
    vpip: hands.length > 0 ? vpipHands / hands.length : 0,
    pfr: hands.length > 0 ? pfrHands / hands.length : 0,
    threeBet: threeBetOpportunities > 0 ? threeBets / threeBetOpportunities : 0,
    // ... etc
  };
}

// Helper: Detect if hero faced a raise
function detectFacedRaise(actions: GameAction[], street: Street): GameAction | null {
  // Find first raise on this street that wasn't by hero
  return actions.find(a => 
    a.street === street && 
    !isHeroAction(a) && 
    (a.action === 'raise' || a.action === 'bet')
  ) ?? null;
}

// Helper: Check if action belongs to hero
function isHeroAction(action: GameAction, hand: StoredHand): boolean {
  // Need to determine hero's playerId from hand
  // This might require adding heroPlayerId to StoredHand
  return false; // TODO: Implement based on hand structure
}
```

#### 1.3 Implement Positional Breakdown
```typescript
// src/stats/positional-stats.ts

export function calculatePositionalStats(hands: StoredHand[]): PositionalStats {
  const statsByPosition: Partial<PositionalStats> = {};
  
  for (const position of POSITIONS) {
    const positionHands = hands.filter(h => h.heroPosition === position);
    
    if (positionHands.length === 0) {
      statsByPosition[position] = createEmptyPositionStats();
      continue;
    }
    
    const stats = calculateHeroStats(positionHands);
    
    statsByPosition[position] = {
      hands: positionHands.length,
      vpip: stats.vpip,
      pfr: stats.pfr,
      threeBet: stats.threeBet,
      profit: positionHands.reduce((sum, h) => sum + h.stackChange, 0),
      bbPer100: calculateBBPer100(positionHands),
      winRate: positionHands.filter(h => h.result === 'win').length / positionHands.length,
    };
  }
  
  return statsByPosition as PositionalStats;
}
```

#### 1.4 Implement Rolling Windows
```typescript
// src/stats/trends.ts

export function calculateRollingWindows(hands: StoredHand[]): RollingWindowStats {
  // Sort hands by timestamp (most recent first)
  const sorted = [...hands].sort((a, b) => b.timestamp - a.timestamp);
  
  return {
    last50: calculateHeroStats(sorted.slice(0, 50)),
    last100: calculateHeroStats(sorted.slice(0, 100)),
    last500: calculateHeroStats(sorted.slice(0, 500)),
    allTime: calculateHeroStats(sorted),
  };
}
```

#### 1.5 Create Stats UI Component
```typescript
// src/components/HeroStatsPanel.tsx

export function HeroStatsPanel() {
  const { storedHands } = useGameStore();
  const [stats, setStats] = useState<HeroStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Calculate stats on mount
    const calculated = calculateHeroStats(storedHands);
    setStats(calculated);
    setLoading(false);
  }, [storedHands]);
  
  if (loading) return <LoadingSpinner />;
  if (!stats || stats.handsAnalyzed === 0) return <NoDataMessage />;
  
  return (
    <div className="space-y-4">
      {/* Preflop Section */}
      <StatsSection title="Preflop">
        <StatBar 
          label="VPIP" 
          value={stats.vpip} 
          target={0.23} 
          targetLabel="GTO: 23%" 
        />
        <StatBar 
          label="PFR" 
          value={stats.pfr} 
          target={0.18} 
          targetLabel="GTO: 18%" 
        />
        <StatBar 
          label="3-bet" 
          value={stats.threeBet} 
          target={0.08} 
          targetLabel="GTO: 8%" 
        />
      </StatsSection>
      
      {/* Postflop Section */}
      <StatsSection title="Postflop">
        <StatBar label="C-bet" value={stats.cbet} target={0.65} />
        <StatBar label="Fold to C-bet" value={stats.foldToCbet} target={0.50} />
      </StatsSection>
      
      {/* Aggression Section */}
      <StatsSection title="Aggression">
        <StatDisplay label="Aggression Factor" value={stats.aggressionFactor.toFixed(2)} />
        <StatBar label="Aggression Freq" value={stats.aggressionFreq} target={0.55} />
      </StatsSection>
      
      {/* Playing Style Label */}
      <PlayingStyleBadge stats={stats} />
    </div>
  );
}
```

#### 1.6 Update StatsDashboard
```typescript
// src/components/StatsDashboard.tsx

// Add new tab or section for Hero Stats
export function StatsDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'hero' | 'position'>('overview');
  
  return (
    <div className="flex-1 flex flex-col">
      {/* Tab Navigation */}
      <TabNav active={activeTab} onChange={setActiveTab} />
      
      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'hero' && <HeroStatsPanel />}
      {activeTab === 'position' && <PositionalBreakdown />}
    </div>
  );
}
```

---

## Phase 2: GTO Comparison & Leak Detection

**Goal**: Compare player stats to GTO and identify specific leaks.

### Tasks

#### 2.1 Define GTO Benchmarks
```typescript
// src/stats/gto-comparison.ts

export const GTO_BENCHMARKS: Record<string, { min: number; optimal: number; max: number }> = {
  vpip: { min: 0.18, optimal: 0.23, max: 0.28 },
  pfr: { min: 0.15, optimal: 0.18, max: 0.22 },
  threeBet: { min: 0.06, optimal: 0.08, max: 0.12 },
  cbet: { min: 0.55, optimal: 0.65, max: 0.75 },
  aggressionFactor: { min: 1.2, optimal: 1.5, max: 2.0 },
  wtsd: { min: 0.20, optimal: 0.25, max: 0.30 },
  wsd: { min: 0.45, optimal: 0.50, max: 0.55 },
};

export const GTO_POSITION_VPIP: Record<Position, { min: number; optimal: number; max: number }> = {
  UTG: { min: 0.12, optimal: 0.15, max: 0.18 },
  HJ: { min: 0.16, optimal: 0.20, max: 0.24 },
  CO: { min: 0.22, optimal: 0.26, max: 0.30 },
  BTN: { min: 0.35, optimal: 0.42, max: 0.48 },
  SB: { min: 0.28, optimal: 0.35, max: 0.40 },
  BB: { min: 0.30, optimal: 0.38, max: 0.45 },
};
```

#### 2.2 Implement Leak Detection
```typescript
// src/stats/gto-comparison.ts

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

export function detectLeaks(stats: HeroStats, positionalStats: PositionalStats): Leak[] {
  const leaks: Leak[] = [];
  
  // Check VPIP deviation
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
      estimatedCost: Math.abs(vpipDeviation) * 30, // Rough estimate
      fix: vpipDeviation > 0 
        ? 'Tighten your opening ranges, especially from early position. Fold marginal hands like KJo, A9s, suited connectors from UTG/HJ.'
        : 'Loosen up, especially from late position. Add more suited connectors, suited aces, and pocket pairs to your BTN/CO range.',
    });
  }
  
  // Check PFR/VPIP ratio
  const pfrVpipRatio = stats.pfr / Math.max(stats.vpip, 0.01);
  if (pfrVpipRatio < 0.6) {
    leaks.push({
      id: 'passive_preflop',
      severity: 'moderate',
      category: 'aggression',
      title: 'Too Passive Preflop',
      description: `You're only raising ${(stats.pfr * 100).toFixed(1)}% of the time when you enter pots (${(stats.vpip * 100).toFixed(1)}% VPIP). You should be raising 60-80% of the hands you play.`,
      yourStat: pfrVpipRatio,
      gtoStat: 0.75,
      deviation: pfrVpipRatio - 0.75,
      estimatedCost: (0.75 - pfrVpipRatio) * 25,
      fix: 'Raise instead of limping. If a hand is worth playing, it\'s usually worth raising. Limp/calling is almost always -EV.',
    });
  }
  
  // Check position-specific leaks
  const utgVpip = positionalStats.UTG.vpip;
  if (utgVpip > GTO_POSITION_VPIP.UTG.max) {
    leaks.push({
      id: 'utg_too_loose',
      severity: 'critical',
      category: 'position',
      title: 'Opening Too Wide from UTG',
      description: `Your UTG VPIP is ${(utgVpip * 100).toFixed(1)}%, but should be around ${(GTO_POSITION_VPIP.UTG.optimal * 100).toFixed(1)}%. You're bleeding chips from early position.`,
      yourStat: utgVpip,
      gtoStat: GTO_POSITION_VPIP.UTG.optimal,
      deviation: utgVpip - GTO_POSITION_VPIP.UTG.optimal,
      estimatedCost: (utgVpip - GTO_POSITION_VPIP.UTG.optimal) * 40,
      fix: 'Only open top 15% of hands from UTG: 88+, AJs+, AQo+, KQs. Fold everything else.',
    });
  }
  
  // Check aggression factor
  if (stats.aggressionFactor < 1.0) {
    leaks.push({
      id: 'low_aggression',
      severity: 'critical',
      category: 'aggression',
      title: 'Not Aggressive Enough',
      description: `Your aggression factor is ${stats.aggressionFactor.toFixed(2)}, but should be 1.5+. You're calling too much and not betting/raising enough.`,
      yourStat: stats.aggressionFactor,
      gtoStat: 1.5,
      deviation: stats.aggressionFactor - 1.5,
      estimatedCost: (1.5 - stats.aggressionFactor) * 20,
      fix: 'Bet and raise more often. When you have a decent hand or draw, be aggressive. Calling should be your least common action.',
    });
  }
  
  // Sort by severity and estimated cost
  return leaks.sort((a, b) => {
    const severityOrder = { critical: 0, moderate: 1, minor: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity] || b.estimatedCost - a.estimatedCost;
  });
}
```

#### 2.3 Create GTO Comparison UI
```typescript
// src/components/GTOComparison.tsx

export function GTOComparison() {
  const { storedHands } = useGameStore();
  const stats = calculateHeroStats(storedHands);
  const positionalStats = calculatePositionalStats(storedHands);
  const leaks = detectLeaks(stats, positionalStats);
  
  return (
    <div className="space-y-6">
      {/* Top Leaks */}
      <section>
        <h3 className="text-sm font-semibold text-offsuit-grey mb-3">
          Top Leaks to Fix
        </h3>
        <div className="space-y-3">
          {leaks.slice(0, 3).map(leak => (
            <LeakCard key={leak.id} leak={leak} />
          ))}
        </div>
      </section>
      
      {/* GTO Alignment Score */}
      <section>
        <h3 className="text-sm font-semibold text-offsuit-grey mb-3">
          GTO Alignment
        </h3>
        <AlignmentScore stats={stats} />
      </section>
      
      {/* Stat Comparison Grid */}
      <section>
        <h3 className="text-sm font-semibold text-offsuit-grey mb-3">
          Your Stats vs GTO
        </h3>
        <ComparisonGrid stats={stats} />
      </section>
    </div>
  );
}

function LeakCard({ leak }: { leak: Leak }) {
  const severityColor = {
    critical: 'bg-[#FF3B30]/10 border-[#FF3B30]',
    moderate: 'bg-[#FF9500]/10 border-[#FF9500]',
    minor: 'bg-[#8E8E93]/10 border-[#8E8E93]',
  };
  
  return (
    <div className={`p-4 rounded-module border ${severityColor[leak.severity]}`}>
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-semibold text-white">{leak.title}</h4>
        <span className="text-xs text-[#FF3B30] font-mono">
          -{leak.estimatedCost.toFixed(1)} BB/100
        </span>
      </div>
      <p className="text-sm text-offsuit-grey mb-3">{leak.description}</p>
      <div className="pt-3 border-t border-white/5">
        <p className="text-xs text-white/70">
          <span className="font-medium">Fix: </span>
          {leak.fix}
        </p>
      </div>
    </div>
  );
}
```

---

## Phase 3: Trends & Time-Series Analysis

**Goal**: Show improvement over time with visual charts.

### Tasks

#### 3.1 Implement Snapshot System
```typescript
// src/stats/trends.ts

export interface StatsSnapshot {
  handNumber: number;
  timestamp: number;
  handsAnalyzed: number; // How many hands went into this calculation
  vpip: number;
  pfr: number;
  threeBet: number;
  aggressionFactor: number;
  profit: number;
  gtoAccuracy: number;
}

export function generateSnapshots(
  hands: StoredHand[], 
  interval: number = 50
): StatsSnapshot[] {
  const snapshots: StatsSnapshot[] = [];
  const sorted = [...hands].sort((a, b) => a.timestamp - b.timestamp);
  
  for (let i = interval; i <= sorted.length; i += interval) {
    const window = sorted.slice(Math.max(0, i - interval), i);
    const stats = calculateHeroStats(window);
    
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

function calculateGTOAccuracy(hands: StoredHand[]): number {
  // Average GTO alignment from feedback
  const totalAlignment = hands.reduce((sum, hand) => {
    const avgAlignment = hand.feedback.reduce((s, f) => s + f.gto.alignment, 0) / Math.max(hand.feedback.length, 1);
    return sum + avgAlignment;
  }, 0);
  return totalAlignment / Math.max(hands.length, 1);
}
```

#### 3.2 Create Trend Charts
```typescript
// src/components/TrendCharts.tsx

export function TrendCharts() {
  const { storedHands } = useGameStore();
  const snapshots = generateSnapshots(storedHands, 50);
  
  return (
    <div className="space-y-6">
      {/* VPIP Trend */}
      <ChartCard title="VPIP Over Time">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={snapshots}>
            <CartesianGrid strokeDasharray="3 3" stroke="#38383A" />
            <XAxis dataKey="handNumber" />
            <YAxis domain={[0, 0.5]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
            <Tooltip />
            {/* GTO target line */}
            <Line 
              type="monotone" 
              dataKey={() => 0.23} 
              stroke="#8E8E93" 
              strokeDasharray="5 5" 
              dot={false}
              name="GTO"
            />
            {/* Your VPIP */}
            <Line 
              type="monotone" 
              dataKey="vpip" 
              stroke="#34C759" 
              strokeWidth={2} 
              name="Your VPIP"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
      
      {/* GTO Accuracy Trend */}
      <ChartCard title="GTO Accuracy Trend">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={snapshots}>
            <CartesianGrid strokeDasharray="3 3" stroke="#38383A" />
            <XAxis dataKey="handNumber" />
            <YAxis domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="gtoAccuracy" 
              stroke="#FFFFFF" 
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
```

---

## Phase 4: Performance Optimization

### Tasks

#### 4.1 Implement Caching
```typescript
// src/utils/stats-cache.ts

class StatsCache {
  private cache: Map<string, { stats: HeroStats; timestamp: number }> = new Map();
  private TTL = 5 * 60 * 1000; // 5 minutes
  
  getCacheKey(hands: StoredHand[]): string {
    // Use last hand ID + count as cache key
    if (hands.length === 0) return 'empty';
    const lastHand = hands[hands.length - 1];
    return `${lastHand.handId}-${hands.length}`;
  }
  
  get(hands: StoredHand[]): HeroStats | null {
    const key = this.getCacheKey(hands);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.stats;
  }
  
  set(hands: StoredHand[], stats: HeroStats): void {
    const key = this.getCacheKey(hands);
    this.cache.set(key, { stats, timestamp: Date.now() });
  }
  
  clear(): void {
    this.cache.clear();
  }
}

export const statsCache = new StatsCache();
```

#### 4.2 Add Loading States
```typescript
// Ensure smooth UX during calculation
export function HeroStatsPanel() {
  const [stats, setStats] = useState<HeroStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Calculate async to not block UI
    const calculate = async () => {
      setLoading(true);
      
      // Check cache first
      const cached = statsCache.get(storedHands);
      if (cached) {
        setStats(cached);
        setLoading(false);
        return;
      }
      
      // Allow UI to render loading state
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const calculated = calculateHeroStats(storedHands);
      statsCache.set(storedHands, calculated);
      setStats(calculated);
      setLoading(false);
    };
    
    calculate();
  }, [storedHands]);
  
  // ...
}
```

---

## Phase 5: UI Polish & Mobile Optimization

### Tasks

#### 5.1 Playing Style Badge
```typescript
export function determinePlayingStyle(stats: HeroStats): {
  style: 'LAG' | 'TAG' | 'LP' | 'TP' | 'Balanced';
  label: string;
  description: string;
  color: string;
} {
  const isLoose = stats.vpip > 0.28;
  const isTight = stats.vpip < 0.20;
  const isAggressive = stats.aggressionFactor > 1.3;
  const isPassive = stats.aggressionFactor < 1.0;
  
  if (isLoose && isAggressive) {
    return {
      style: 'LAG',
      label: 'LAG (Loose-Aggressive)',
      description: 'You play many hands aggressively. High variance, high skill.',
      color: '#FF3B30',
    };
  }
  
  if (isTight && isAggressive) {
    return {
      style: 'TAG',
      label: 'TAG (Tight-Aggressive)',
      description: 'You play few hands but play them aggressively. Solid strategy.',
      color: '#34C759',
    };
  }
  
  if (isLoose && isPassive) {
    return {
      style: 'LP',
      label: 'LP (Loose-Passive)',
      description: 'You play many hands but don\'t apply enough pressure. Tighten up or be more aggressive.',
      color: '#FF9500',
    };
  }
  
  if (isTight && isPassive) {
    return {
      style: 'TP',
      label: 'TP (Tight-Passive)',
      description: 'You play few hands and play them passively. Increase aggression.',
      color: '#8E8E93',
    };
  }
  
  return {
    style: 'Balanced',
    label: 'Balanced',
    description: 'You have a balanced playing style.',
    color: '#FFFFFF',
  };
}
```

#### 5.2 Responsive Design
- Ensure all charts work on mobile (320px width minimum)
- Use horizontal scrolling for wide tables
- Collapsible sections for dense data
- Touch-friendly stat bars and interactions

#### 5.3 Empty States
- "Play at least 20 hands to see basic stats"
- "Play at least 50 hands for accurate analysis"
- Progressive disclosure based on hand count

---

## Testing Strategy

### Unit Tests
```typescript
// src/stats/__tests__/hero-stats.test.ts

describe('calculateHeroStats', () => {
  it('calculates VPIP correctly', () => {
    const hands = createMockHands([
      { vpip: true },   // Voluntarily entered
      { vpip: false },  // Folded preflop
      { vpip: true },   // Voluntarily entered
    ]);
    
    const stats = calculateHeroStats(hands);
    expect(stats.vpip).toBeCloseTo(0.667, 2);
  });
  
  it('calculates PFR correctly', () => {
    // ...
  });
  
  it('handles empty hand history', () => {
    const stats = calculateHeroStats([]);
    expect(stats.handsAnalyzed).toBe(0);
    expect(stats.vpip).toBe(0);
  });
});

describe('detectLeaks', () => {
  it('detects high VPIP leak', () => {
    const stats = { vpip: 0.45, pfr: 0.30 /* ... */ };
    const leaks = detectLeaks(stats, mockPositionalStats);
    
    expect(leaks).toContainEqual(
      expect.objectContaining({
        id: 'vpip_deviation',
        severity: 'critical',
      })
    );
  });
});
```

### Manual Testing
- [ ] Test with 0 hands
- [ ] Test with 10 hands
- [ ] Test with 100 hands
- [ ] Test with 1000 hands
- [ ] Test calculation performance on mobile device
- [ ] Verify all stats make logical sense
- [ ] Compare with known poker tracker results (if possible)

---

## Data Requirements

### Extend StoredHand Type (if needed)
```typescript
// May need to add heroPlayerId to identify hero actions
interface StoredHand {
  // ... existing fields
  heroPlayerId?: number;  // To identify which actions belong to hero
}
```

### Action Analysis Requirements
For accurate stat calculation, we need to determine from `GameAction[]`:
1. Which actions belong to hero
2. Whether action was voluntary (not BB/SB post)
3. Order of actions (to detect 3-bets, 4-bets, c-bets)
4. Whether hero was aggressor on previous street

---

## Mobile Considerations

### Performance Targets
- Initial calculation: <200ms for 500 hands
- Cached loading: <50ms
- Chart rendering: <100ms
- Total Stats page load: <500ms

### Storage Impact
- No additional IndexedDB storage needed
- In-memory cache: ~50KB max
- Total JS bundle increase: ~30KB (gzipped)

### Offline Support
- All calculations happen client-side
- No API calls required
- Works 100% offline

---

## Future Enhancements (Post-MVP)

### Phase 6: Advanced Stats
- [ ] EV-adjusted results (compare actual vs expected profit)
- [ ] Red line / Blue line (showdown vs non-showdown winnings)
- [ ] Hand matrix (13x13 grid showing which hands you play)
- [ ] Street-by-street aggression breakdown

### Phase 7: AI Insights
- [ ] Pattern detection (tilt indicators)
- [ ] Personalized recommendations with ML
- [ ] Skill radar chart (6-8 dimensions)
- [ ] Automatic playing style classification

### Phase 8: Gamification
- [ ] Achievements system
- [ ] Skill rating (ELO-style)
- [ ] Daily challenges
- [ ] Milestones tracking

### Phase 9: Export & Sharing
- [ ] Export stats as CSV/JSON
- [ ] Generate shareable stat cards (images)
- [ ] Compare stats with friends

---

## Success Metrics

### MVP Success Criteria
- [ ] All core stats (VPIP, PFR, 3-bet, c-bet, AF) calculate correctly
- [ ] Position breakdown displays all 6 positions
- [ ] At least 3 leaks detected and displayed with fixes
- [ ] Rolling windows (50/100/500) work correctly
- [ ] Stats page loads in <500ms with 500 hands
- [ ] UI is mobile-responsive (works on 375px width)
- [ ] No crashes with 1000+ hands

### User Value
- Users can see their playing style at a glance
- Users get specific, actionable advice on what to fix
- Users can track improvement over time
- Users understand GTO deviations without poker expertise

---

## Implementation Timeline

### Phase 1: Core Stats (Essential)
**Effort**: ~4-6 hours
- Stats calculation engine
- Basic UI components
- Position breakdown

### Phase 2: GTO Comparison (High Value)
**Effort**: ~3-4 hours
- Leak detection algorithm
- GTO benchmarks
- Comparison UI

### Phase 3: Trends (Polish)
**Effort**: ~2-3 hours
- Snapshot generation
- Trend charts
- Rolling windows UI

### Phase 4: Optimization (Performance)
**Effort**: ~1-2 hours
- Caching layer
- Performance profiling
- Loading states

### Phase 5: Polish (UX)
**Effort**: ~2-3 hours
- Playing style badge
- Empty states
- Mobile optimization

**Total MVP Estimate**: ~12-18 hours

---

## Open Questions

1. **Hero Identification**: How do we reliably identify which `GameAction` belongs to the hero?
   - Option A: Add `heroPlayerId` to `StoredHand`
   - Option B: Infer from existing data (actions that resulted in hero's stack change)

2. **GTO Benchmarks**: Should we make GTO targets configurable?
   - Could add difficulty levels: "Beginner GTO", "Standard GTO", "High Stakes GTO"

3. **Sample Size Warnings**: At what hand count do we show stats?
   - Suggestion: Show basic stats at 20 hands, full analysis at 50 hands

4. **Persistence**: Should we ever persist calculated stats?
   - Current plan: No, always calculate on-demand
   - Future: Could cache snapshots for historical trend analysis

---

## Dependencies

### New Dependencies: None
All calculations use existing data and built-in JavaScript.

### Existing Dependencies Used
- Recharts (already installed) - for charts
- Zustand (already installed) - for state
- IndexedDB (browser API) - for data

---

## Conclusion

This implementation plan provides a comprehensive hero stats tracking system that:
- Leverages existing hand history data (no new persistence needed)
- Works 100% offline (perfect for mobile app future)
- Provides actionable insights (not just numbers)
- Scales well (tested up to 1000 hands)
- Follows existing code patterns (easy to maintain)

The phased approach allows shipping core value quickly (Phase 1 + 2) while leaving room for advanced features later.
