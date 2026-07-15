import { useEffect, useState } from 'react';
import { useGameStore } from '../store/game-store';
import { calculateHeroStats } from '../stats/hero-stats';
import { determinePlayingStyle, GTO_BENCHMARKS } from '../stats/gto-comparison';
import { statsCache } from '../utils/stats-cache';
import type { HeroStats } from '../stats/types';

export function HeroStatsPanel() {
  const { storedHands, settings } = useGameStore();
  const [stats, setStats] = useState<HeroStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
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
      
      const calculated = calculateHeroStats(storedHands, settings.bigBlind);
      statsCache.set(storedHands, calculated);
      setStats(calculated);
      setLoading(false);
    };
    
    calculate();
  }, [storedHands, settings.bigBlind]);
  
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span className="text-sm text-offsuit-grey">Calculating stats...</span>
        </div>
      </div>
    );
  }
  
  if (!stats || stats.handsAnalyzed === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="space-y-2">
          <p className="text-offsuit-grey text-sm">
            Play at least 20 hands to see your detailed statistics.
          </p>
          <p className="text-white/50 text-xs">
            VPIP, PFR, aggression, and more will appear here.
          </p>
        </div>
      </div>
    );
  }
  
  const playingStyle = determinePlayingStyle(stats);
  const sampleSizeWarning = stats.handsAnalyzed < 50;
  
  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-6">
      {/* Sample size warning */}
      {sampleSizeWarning && (
        <div className="p-3 rounded-module bg-[#FF9500]/10 border border-[#FF9500]/30">
          <p className="text-xs text-[#FF9500]">
            ⚠️ Only {stats.handsAnalyzed} hands analyzed. Stats become more accurate after 50+ hands.
          </p>
        </div>
      )}
      
      {/* Playing style badge */}
      <div 
        className="p-4 rounded-module border"
        style={{ borderColor: playingStyle.color + '40', backgroundColor: playingStyle.color + '10' }}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold" style={{ color: playingStyle.color }}>
            Your Playing Style
          </h3>
          <span 
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: playingStyle.color, color: '#000' }}
          >
            {playingStyle.style}
          </span>
        </div>
        <p className="text-sm text-white/80">{playingStyle.description}</p>
      </div>
      
      {/* Preflop Stats */}
      <StatsSection title="Preflop">
        <StatBar
          label="VPIP"
          sublabel="Voluntarily put $ in pot"
          value={stats.vpip}
          target={GTO_BENCHMARKS.vpip.optimal}
          targetRange={[GTO_BENCHMARKS.vpip.min, GTO_BENCHMARKS.vpip.max]}
          format="percent"
        />
        <StatBar
          label="PFR"
          sublabel="Preflop raise"
          value={stats.pfr}
          target={GTO_BENCHMARKS.pfr.optimal}
          targetRange={[GTO_BENCHMARKS.pfr.min, GTO_BENCHMARKS.pfr.max]}
          format="percent"
        />
        {stats.threeBetOpportunities >= 5 && (
          <StatBar
            label="3-bet"
            sublabel={`${stats.threeBetOpportunities} opportunities`}
            value={stats.threeBet}
            target={GTO_BENCHMARKS.threeBet.optimal}
            targetRange={[GTO_BENCHMARKS.threeBet.min, GTO_BENCHMARKS.threeBet.max]}
            format="percent"
          />
        )}
      </StatsSection>
      
      {/* Postflop Stats */}
      {stats.cbetOpportunities >= 3 && (
        <StatsSection title="Postflop">
          <StatBar
            label="C-bet"
            sublabel={`${stats.cbetOpportunities} opportunities`}
            value={stats.cbet}
            target={GTO_BENCHMARKS.cbet.optimal}
            targetRange={[GTO_BENCHMARKS.cbet.min, GTO_BENCHMARKS.cbet.max]}
            format="percent"
          />
          {stats.sawFlopCount >= 10 && (
            <StatBar
              label="WTSD"
              sublabel="Went to showdown"
              value={stats.wtsd}
              target={GTO_BENCHMARKS.wtsd.optimal}
              targetRange={[GTO_BENCHMARKS.wtsd.min, GTO_BENCHMARKS.wtsd.max]}
              format="percent"
            />
          )}
        </StatsSection>
      )}
      
      {/* Aggression */}
      <StatsSection title="Aggression">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-white">Aggression Factor</div>
              <div className="text-xs text-offsuit-grey">(bet+raise) / call</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-white tabular-nums">
                {stats.aggressionFactor.toFixed(2)}x
              </div>
              <div className="text-xs text-offsuit-grey">
                Target: {GTO_BENCHMARKS.aggressionFactor.optimal}x
              </div>
            </div>
          </div>
          <StatBar
            label="Aggression Freq"
            sublabel="% aggressive actions"
            value={stats.aggressionFreq}
            target={GTO_BENCHMARKS.aggressionFreq.optimal}
            targetRange={[GTO_BENCHMARKS.aggressionFreq.min, GTO_BENCHMARKS.aggressionFreq.max]}
            format="percent"
          />
        </div>
      </StatsSection>
      
      {/* Results */}
      <StatsSection title="Results">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Hands"
            value={stats.handsAnalyzed.toString()}
          />
          <StatCard
            label="Win Rate"
            value={`${(stats.winRate * 100).toFixed(1)}%`}
          />
          <StatCard
            label="Profit"
            value={stats.totalProfit >= 0 ? `+$${stats.totalProfit}` : `-$${Math.abs(stats.totalProfit)}`}
            valueClass={stats.totalProfit >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}
          />
          <StatCard
            label="BB/100"
            value={stats.bbPer100Hands >= 0 ? `+${stats.bbPer100Hands.toFixed(1)}` : stats.bbPer100Hands.toFixed(1)}
            valueClass={stats.bbPer100Hands >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}
          />
        </div>
      </StatsSection>
    </div>
  );
}

function StatsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-offsuit-grey mb-3">{title}</h3>
      <div className="space-y-3">
        {children}
      </div>
    </section>
  );
}

interface StatBarProps {
  label: string;
  sublabel?: string;
  value: number;
  target: number;
  targetRange: [number, number];
  format: 'percent' | 'number';
}

function StatBar({ label, sublabel, value, target, targetRange, format }: StatBarProps) {
  const displayValue = format === 'percent' ? (value * 100).toFixed(1) + '%' : value.toFixed(2);
  const displayTarget = format === 'percent' ? (target * 100).toFixed(0) + '%' : target.toFixed(2);
  
  const [min, max] = targetRange;
  const inRange = value >= min && value <= max;
  const deviation = value - target;
  
  let barColor = '#34C759'; // Green - in range
  if (!inRange) {
    barColor = Math.abs(deviation) > (max - min) ? '#FF3B30' : '#FF9500'; // Red or orange
  }
  
  // Calculate bar fill percentage (capped at 100%)
  const fillPercent = Math.min(100, (value / (max * 1.5)) * 100);
  
  return (
    <div className="p-3 offsuit-module">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-medium text-white">{label}</div>
          {sublabel && <div className="text-xs text-offsuit-grey">{sublabel}</div>}
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-white tabular-nums">{displayValue}</div>
          <div className="text-xs text-offsuit-grey">GTO: {displayTarget}</div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="relative h-2 bg-surface-raised rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
          style={{ width: `${fillPercent}%`, backgroundColor: barColor }}
        />
        {/* Target indicator */}
        <div
          className="absolute inset-y-0 w-1 bg-white/50"
          style={{ left: `${Math.min(100, (target / (max * 1.5)) * 100)}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  valueClass = 'text-white',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="p-3 offsuit-module">
      <div className="text-[10px] text-offsuit-grey uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-semibold tabular-nums tracking-tight mt-1 ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}
