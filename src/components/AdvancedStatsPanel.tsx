import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useGameStore } from '../store/game-store';
import { calculateAdvancedStats } from '../stats/advanced-stats';
import type { AdvancedStats } from '../stats/advanced-stats';

export function AdvancedStatsPanel() {
  const { storedHands, settings } = useGameStore();
  const [stats, setStats] = useState<AdvancedStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const calculate = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const calculated = calculateAdvancedStats(storedHands, settings.bigBlind);
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
  
  if (!stats || storedHands.length < 20) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <p className="text-offsuit-grey text-sm">
          Play at least 20 hands to see advanced statistics.
        </p>
      </div>
    );
  }
  
  // Prepare red line/blue line data
  const redBlueData = storedHands.slice().reverse().reduce<Array<{
    hand: number;
    redLine: number;
    blueLine: number;
  }>>((acc, hand, i) => {
    const heroActions = hand.actions.filter(a => a.playerId === 0);
    const wentToShowdown = heroActions.some(a => a.street === 'river') && 
                          !heroActions.some(a => a.action === 'fold');
    
    const prevRed = acc[i - 1]?.redLine ?? 0;
    const prevBlue = acc[i - 1]?.blueLine ?? 0;
    
    acc.push({
      hand: hand.handNumber,
      redLine: wentToShowdown ? prevRed : prevRed + hand.stackChange,
      blueLine: wentToShowdown ? prevBlue + hand.stackChange : prevBlue,
    });
    
    return acc;
  }, []);
  
  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-6">
      {/* EV Adjusted Results */}
      <section>
        <h3 className="text-sm font-semibold text-offsuit-grey mb-3">
          EV-Adjusted Performance
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Actual Profit"
            value={stats.evAdjusted.actualProfit >= 0 
              ? `+$${stats.evAdjusted.actualProfit.toFixed(0)}`
              : `-$${Math.abs(stats.evAdjusted.actualProfit).toFixed(0)}`
            }
            valueClass={stats.evAdjusted.actualProfit >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}
          />
          <StatCard
            label="Expected Profit"
            value={stats.evAdjusted.expectedProfit >= 0 
              ? `+$${stats.evAdjusted.expectedProfit.toFixed(0)}`
              : `-$${Math.abs(stats.evAdjusted.expectedProfit).toFixed(0)}`
            }
            valueClass={stats.evAdjusted.expectedProfit >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}
          />
          <StatCard
            label="Luck Factor"
            value={stats.evAdjusted.luck >= 0 
              ? `+$${stats.evAdjusted.luck.toFixed(0)}`
              : `-$${Math.abs(stats.evAdjusted.luck).toFixed(0)}`
            }
            valueClass={stats.evAdjusted.luck >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}
            subtitle={stats.evAdjusted.luck > 10 ? 'Running hot' : stats.evAdjusted.luck < -10 ? 'Running cold' : 'Neutral'}
          />
          <StatCard
            label="Skill Component"
            value={stats.evAdjusted.skillComponent >= 0 
              ? `+$${stats.evAdjusted.skillComponent.toFixed(0)}`
              : `-$${Math.abs(stats.evAdjusted.skillComponent).toFixed(0)}`
            }
            valueClass={stats.evAdjusted.skillComponent >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}
            subtitle="EV from decisions"
          />
        </div>
        
        <div className="mt-3 p-3 bg-surface-raised rounded-lg">
          <p className="text-xs text-offsuit-grey leading-relaxed">
            <span className="text-white font-medium">EV-Adjusted:</span>{' '}
            Your expected profit based on decision quality is{' '}
            <span className="text-white">${stats.evAdjusted.expectedProfit.toFixed(0)}</span>.
            {stats.evAdjusted.luck > 20 && ' You\'ve been running hot - don\'t let it affect your play!'}
            {stats.evAdjusted.luck < -20 && ' You\'ve been running cold - stay disciplined, the cards will turn.'}
          </p>
        </div>
      </section>
      
      {/* Red Line / Blue Line */}
      <section>
        <h3 className="text-sm font-semibold text-offsuit-grey mb-3">
          Red Line / Blue Line Analysis
        </h3>
        <div className="p-4 offsuit-module">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <div className="text-xs text-offsuit-grey mb-1">Red Line (Non-Showdown)</div>
              <div className={`text-lg font-semibold tabular-nums ${
                stats.showdown.redLine >= 0 ? 'text-[#FF3B30]' : 'text-[#FF3B30]/50'
              }`}>
                {stats.showdown.redLine >= 0 ? '+' : ''}{stats.showdown.redLine.toFixed(0)}
              </div>
            </div>
            <div>
              <div className="text-xs text-offsuit-grey mb-1">Blue Line (Showdown)</div>
              <div className={`text-lg font-semibold tabular-nums ${
                stats.showdown.blueLine >= 0 ? 'text-[#34C759]' : 'text-[#34C759]/50'
              }`}>
                {stats.showdown.blueLine >= 0 ? '+' : ''}{stats.showdown.blueLine.toFixed(0)}
              </div>
            </div>
          </div>
          
          {redBlueData.length > 1 && (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={redBlueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#38383A" />
                <XAxis 
                  dataKey="hand" 
                  tick={{ fontSize: 10, fill: '#8E8E93' }}
                  label={{ value: 'Hand #', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#8E8E93' }}
                />
                <YAxis tick={{ fontSize: 10, fill: '#8E8E93' }} />
                <Tooltip
                  contentStyle={{ 
                    background: '#1C1C1E', 
                    border: '1px solid #38383A', 
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="redLine" 
                  stroke="#FF3B30" 
                  strokeWidth={2}
                  name="Red Line"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="blueLine" 
                  stroke="#34C759" 
                  strokeWidth={2}
                  name="Blue Line"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
          
          <p className="text-xs text-offsuit-grey mt-3 leading-relaxed">
            <span className="text-white font-medium">Red Line</span> = profit from folds (bluffs, steals).{' '}
            <span className="text-white font-medium">Blue Line</span> = profit at showdown.{' '}
            {stats.showdown.redLine < 0 && 'Negative red line means you\'re not winning enough pots without showdown.'}
            {stats.showdown.blueLine < 0 && ' Negative blue line means you\'re losing when you go to showdown.'}
          </p>
        </div>
      </section>
      
      {/* Variance */}
      <section>
        <h3 className="text-sm font-semibold text-offsuit-grey mb-3">
          Variance & Swings
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Biggest Win"
            value={`+$${stats.variance.biggestWin.toFixed(0)}`}
            valueClass="text-[#34C759]"
          />
          <StatCard
            label="Biggest Loss"
            value={`-$${Math.abs(stats.variance.biggestLoss).toFixed(0)}`}
            valueClass="text-[#FF3B30]"
          />
          <StatCard
            label="Std Deviation"
            value={`$${stats.variance.standardDeviation.toFixed(0)}`}
            subtitle="Per hand variance"
          />
          <StatCard
            label="Current Streak"
            value={`${stats.variance.currentStreak.count}x ${stats.variance.currentStreak.type}`}
            valueClass={stats.variance.currentStreak.type === 'win' ? 'text-[#34C759]' : 'text-[#FF3B30]'}
          />
        </div>
      </section>
      
      {/* Hand Reading */}
      <section>
        <h3 className="text-sm font-semibold text-offsuit-grey mb-3">
          Hand Reading Accuracy
        </h3>
        <div className="p-4 offsuit-module">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-white">Accuracy Score</div>
            <div className="text-2xl font-bold text-white">
              {(stats.handReading.accuracy * 100).toFixed(0)}%
            </div>
          </div>
          
          <div className="h-3 bg-surface-raised rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-[#34C759] to-[#FF9500] rounded-full"
              style={{ width: `${stats.handReading.accuracy * 100}%` }}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2 bg-surface-raised rounded">
              <div className="text-offsuit-grey">Correct Folds</div>
              <div className="text-white font-semibold">{stats.handReading.correctFolds}</div>
            </div>
            <div className="p-2 bg-surface-raised rounded">
              <div className="text-offsuit-grey">Incorrect Folds</div>
              <div className="text-white font-semibold">{stats.handReading.incorrectFolds}</div>
            </div>
            <div className="p-2 bg-surface-raised rounded">
              <div className="text-offsuit-grey">Correct Calls</div>
              <div className="text-white font-semibold">{stats.handReading.correctCalls}</div>
            </div>
            <div className="p-2 bg-surface-raised rounded">
              <div className="text-offsuit-grey">Incorrect Calls</div>
              <div className="text-white font-semibold">{stats.handReading.incorrectCalls}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  valueClass = 'text-white',
  subtitle,
}: {
  label: string;
  value: string;
  valueClass?: string;
  subtitle?: string;
}) {
  return (
    <div className="p-3 offsuit-module">
      <div className="text-[10px] text-offsuit-grey uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-semibold tabular-nums tracking-tight mt-1 ${valueClass}`}>
        {value}
      </div>
      {subtitle && (
        <div className="text-[10px] text-offsuit-grey mt-0.5">{subtitle}</div>
      )}
    </div>
  );
}
