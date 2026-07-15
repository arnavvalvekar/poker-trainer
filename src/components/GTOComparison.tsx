import { useEffect, useState } from 'react';
import { useGameStore } from '../store/game-store';
import { calculateHeroStats } from '../stats/hero-stats';
import { calculatePositionalStats } from '../stats/positional-stats';
import { detectLeaks, calculateGTOAlignment } from '../stats/gto-comparison';
import { statsCache } from '../utils/stats-cache';
import type { Leak } from '../stats/types';

export function GTOComparison() {
  const { storedHands, settings } = useGameStore();
  const [leaks, setLeaks] = useState<Leak[]>([]);
  const [gtoAlignment, setGtoAlignment] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const analyze = async () => {
      setLoading(true);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const cached = statsCache.get(storedHands);
      const stats = cached || calculateHeroStats(storedHands, settings.bigBlind);
      
      if (!cached) {
        statsCache.set(storedHands, stats);
      }
      
      const positionalStats = calculatePositionalStats(storedHands, settings.bigBlind);
      const detectedLeaks = detectLeaks(stats, positionalStats);
      const alignment = calculateGTOAlignment(stats);
      
      setLeaks(detectedLeaks);
      setGtoAlignment(alignment);
      setLoading(false);
    };
    
    analyze();
  }, [storedHands, settings.bigBlind]);
  
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span className="text-sm text-offsuit-grey">Analyzing your play...</span>
        </div>
      </div>
    );
  }
  
  if (storedHands.length < 20) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="space-y-2">
          <p className="text-offsuit-grey text-sm">
            Play at least 20 hands to get GTO analysis and leak detection.
          </p>
        </div>
      </div>
    );
  }
  
  const topLeaks = leaks.slice(0, 3);
  const alignmentPercent = (gtoAlignment * 100).toFixed(0);
  
  let alignmentColor = '#34C759';
  let alignmentLabel = 'Excellent';
  if (gtoAlignment < 0.7) {
    alignmentColor = '#FF3B30';
    alignmentLabel = 'Needs Work';
  } else if (gtoAlignment < 0.85) {
    alignmentColor = '#FF9500';
    alignmentLabel = 'Good';
  }
  
  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-6">
      {/* GTO Alignment Score */}
      <div className="p-5 offsuit-module">
        <h3 className="text-sm font-semibold text-offsuit-grey mb-3">GTO Alignment Score</h3>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold" style={{ color: alignmentColor }}>
              {alignmentPercent}%
            </div>
            <div className="text-sm text-offsuit-grey mt-1">{alignmentLabel}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-offsuit-grey">
              {gtoAlignment >= 0.85 ? 'Your play closely matches GTO strategy' :
               gtoAlignment >= 0.70 ? 'Room for improvement in some areas' :
               'Focus on the leaks below to improve'}
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-4 h-3 bg-surface-raised rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${gtoAlignment * 100}%`, backgroundColor: alignmentColor }}
          />
        </div>
      </div>
      
      {/* Top Leaks */}
      <section>
        <h3 className="text-sm font-semibold text-offsuit-grey mb-3">
          {topLeaks.length > 0 ? 'Top Leaks to Fix' : 'No Major Leaks Detected'}
        </h3>
        {topLeaks.length === 0 ? (
          <div className="p-4 offsuit-module text-center">
            <p className="text-sm text-[#34C759] mb-1">🎉 Great job!</p>
            <p className="text-xs text-offsuit-grey">
              Your play is well-aligned with GTO. Keep it up!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {topLeaks.map((leak, index) => (
              <LeakCard key={leak.id} leak={leak} rank={index + 1} />
            ))}
          </div>
        )}
      </section>
      
      {/* Other leaks */}
      {leaks.length > 3 && (
        <section>
          <h3 className="text-sm font-semibold text-offsuit-grey mb-3">
            Other Areas to Improve ({leaks.length - 3})
          </h3>
          <div className="space-y-2">
            {leaks.slice(3).map(leak => (
              <div key={leak.id} className="p-3 offsuit-module">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">{leak.title}</span>
                  <span className="text-xs text-[#FF3B30] font-mono">
                    -{leak.estimatedCost.toFixed(1)} BB/100
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      
      {/* Total potential improvement */}
      {leaks.length > 0 && (
        <div className="p-4 offsuit-module bg-[#34C759]/10 border border-[#34C759]/30">
          <p className="text-sm text-white mb-1">
            💡 Potential Impact
          </p>
          <p className="text-xs text-offsuit-grey">
            Fixing these leaks could improve your winrate by approximately{' '}
            <span className="text-[#34C759] font-semibold">
              +{leaks.reduce((sum, l) => sum + l.estimatedCost, 0).toFixed(1)} BB/100 hands
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

function LeakCard({ leak, rank }: { leak: Leak; rank: number }) {
  const severityColors = {
    critical: { bg: '#FF3B30', border: '#FF3B30', text: '#FF3B30' },
    moderate: { bg: '#FF9500', border: '#FF9500', text: '#FF9500' },
    minor: { bg: '#8E8E93', border: '#8E8E93', text: '#8E8E93' },
  };
  
  const colors = severityColors[leak.severity];
  
  return (
    <div 
      className="p-4 rounded-module border"
      style={{ 
        backgroundColor: colors.bg + '10',
        borderColor: colors.border + '30',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span 
            className="text-xs font-bold px-2 py-0.5 rounded"
            style={{ backgroundColor: colors.bg, color: '#000' }}
          >
            #{rank}
          </span>
          <h4 className="text-sm font-semibold text-white">{leak.title}</h4>
        </div>
        <span className="text-xs font-mono" style={{ color: colors.text }}>
          -{leak.estimatedCost.toFixed(1)} BB/100
        </span>
      </div>
      
      {/* Description */}
      <p className="text-sm text-offsuit-grey mb-3 leading-relaxed">
        {leak.description}
      </p>
      
      {/* Comparison */}
      <div className="flex items-center gap-4 mb-3 text-xs">
        <div>
          <span className="text-offsuit-grey">Your stat: </span>
          <span className="text-white font-semibold tabular-nums">
            {(leak.yourStat * 100).toFixed(1)}%
          </span>
        </div>
        <div>
          <span className="text-offsuit-grey">GTO: </span>
          <span className="text-white font-semibold tabular-nums">
            {(leak.gtoStat * 100).toFixed(1)}%
          </span>
        </div>
        <div>
          <span className="text-offsuit-grey">Diff: </span>
          <span className="font-semibold tabular-nums" style={{ color: colors.text }}>
            {leak.deviation > 0 ? '+' : ''}{(leak.deviation * 100).toFixed(1)}%
          </span>
        </div>
      </div>
      
      {/* Fix */}
      <div className="pt-3 border-t border-white/5">
        <p className="text-xs text-white/90 leading-relaxed">
          <span className="font-medium text-white">How to fix: </span>
          {leak.fix}
        </p>
      </div>
    </div>
  );
}
