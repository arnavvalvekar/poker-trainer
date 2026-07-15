import { useEffect, useState } from 'react';
import { useGameStore } from '../store/game-store';
import { calculatePositionalStats } from '../stats/positional-stats';
import { GTO_POSITION_VPIP, GTO_POSITION_PFR } from '../stats/gto-comparison';
import type { PositionalStats } from '../stats/types';
import type { Position } from '../types/poker';

const POSITION_ORDER: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

const POSITION_NAMES: Record<Position, string> = {
  UTG: 'UTG (Early)',
  HJ: 'HJ (Early)',
  CO: 'CO (Late)',
  BTN: 'BTN (Button)',
  SB: 'SB (Blinds)',
  BB: 'BB (Blinds)',
};

const POSITION_DESCRIPTIONS: Record<Position, string> = {
  UTG: 'Under the Gun - Tightest range, most players to act after you',
  HJ: 'Hijack - Still early position, play tight',
  CO: 'Cutoff - Late position, can open wider',
  BTN: 'Button - Best position, open widest range',
  SB: 'Small Blind - Tricky position, play carefully',
  BB: 'Big Blind - Already invested, defend wider',
};

export function PositionalBreakdown() {
  const { storedHands, settings } = useGameStore();
  const [stats, setStats] = useState<PositionalStats>({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const calculate = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const calculated = calculatePositionalStats(storedHands, settings.bigBlind);
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
          <span className="text-sm text-offsuit-grey">Calculating...</span>
        </div>
      </div>
    );
  }
  
  if (storedHands.length < 10) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <p className="text-offsuit-grey text-sm">
          Play at least 10 hands to see position-specific stats.
        </p>
      </div>
    );
  }
  
  const totalHands = Object.values(stats).reduce((sum, s) => sum + s.hands, 0);
  
  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4">
      {/* Summary */}
      <div className="p-4 offsuit-module">
        <h3 className="text-sm font-semibold text-offsuit-grey mb-2">Position Overview</h3>
        <p className="text-xs text-white/70 leading-relaxed">
          Your stats broken down by table position. Playing correctly from each position is crucial to winning poker.
        </p>
      </div>
      
      {/* Position cards */}
      {POSITION_ORDER.map(position => {
        const posStats = stats[position];
        
        if (!posStats || posStats.hands === 0) {
          return (
            <div key={position} className="p-4 offsuit-module opacity-50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-white">{POSITION_NAMES[position]}</h4>
                <span className="text-xs text-offsuit-grey">No data</span>
              </div>
              <p className="text-xs text-offsuit-grey">{POSITION_DESCRIPTIONS[position]}</p>
            </div>
          );
        }
        
        const vpipGTO = GTO_POSITION_VPIP[position];
        const pfrGTO = GTO_POSITION_PFR[position];
        
        const vpipInRange = posStats.vpip >= vpipGTO.min && posStats.vpip <= vpipGTO.max;
        const pfrInRange = posStats.pfr >= pfrGTO.min && posStats.pfr <= pfrGTO.max;
        
        const handsPercent = ((posStats.hands / totalHands) * 100).toFixed(0);
        
        return (
          <div key={position} className="p-4 offsuit-module">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-sm font-semibold text-white">{POSITION_NAMES[position]}</h4>
                <p className="text-xs text-offsuit-grey">
                  {posStats.hands} hands ({handsPercent}%)
                </p>
              </div>
              <div className="text-right">
                <div className={`text-lg font-semibold tabular-nums ${
                  posStats.profit >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'
                }`}>
                  {posStats.profit >= 0 ? '+' : ''}{posStats.profit.toFixed(0)}
                </div>
                <div className="text-xs text-offsuit-grey">
                  {posStats.bbPer100 >= 0 ? '+' : ''}{posStats.bbPer100.toFixed(1)} BB/100
                </div>
              </div>
            </div>
            
            <p className="text-xs text-offsuit-grey mb-3">{POSITION_DESCRIPTIONS[position]}</p>
            
            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2">
              <PositionStat
                label="VPIP"
                value={posStats.vpip}
                gto={vpipGTO.optimal}
                inRange={vpipInRange}
              />
              <PositionStat
                label="PFR"
                value={posStats.pfr}
                gto={pfrGTO.optimal}
                inRange={pfrInRange}
              />
              <PositionStat
                label="Win Rate"
                value={posStats.winRate}
                format="percent"
                showGTO={false}
              />
            </div>
          </div>
        );
      })}
      
      {/* Tips */}
      <div className="p-4 offsuit-module bg-[#34C759]/10 border border-[#34C759]/30">
        <p className="text-xs text-white/90 mb-2">
          💡 <span className="font-semibold">Position Tips</span>
        </p>
        <ul className="text-xs text-offsuit-grey space-y-1">
          <li>• Play tighter from early position (UTG/HJ): ~15-20% VPIP</li>
          <li>• Open wider from late position (CO/BTN): ~26-42% VPIP</li>
          <li>• Steal more from the button with weak hands</li>
          <li>• Defend your blinds, but don't over-defend</li>
        </ul>
      </div>
    </div>
  );
}

function PositionStat({
  label,
  value,
  gto,
  inRange,
  format = 'percent',
  showGTO = true,
}: {
  label: string;
  value: number;
  gto?: number;
  inRange?: boolean;
  format?: 'percent' | 'number';
  showGTO?: boolean;
}) {
  const displayValue = format === 'percent' 
    ? (value * 100).toFixed(1) + '%'
    : value.toFixed(2);
  
  const displayGTO = gto !== undefined && format === 'percent'
    ? (gto * 100).toFixed(0) + '%'
    : gto?.toFixed(2);
  
  let color = 'text-white';
  if (showGTO && inRange !== undefined) {
    color = inRange ? 'text-[#34C759]' : 'text-[#FF9500]';
  }
  
  return (
    <div className="p-2 bg-surface-raised rounded-lg">
      <div className="text-[10px] text-offsuit-grey uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className={`text-sm font-semibold tabular-nums ${color}`}>
        {displayValue}
      </div>
      {showGTO && displayGTO && (
        <div className="text-[10px] text-offsuit-grey mt-0.5">
          GTO: {displayGTO}
        </div>
      )}
    </div>
  );
}
