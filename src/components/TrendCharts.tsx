import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts';
import { useGameStore } from '../store/game-store';
import { generateSnapshots } from '../stats/trends';
import { GTO_BENCHMARKS } from '../stats/gto-comparison';
import type { StatsSnapshot } from '../stats/types';

export function TrendCharts() {
  const { storedHands, settings } = useGameStore();
  const [snapshots, setSnapshots] = useState<StatsSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const calculate = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const generated = generateSnapshots(storedHands, 25, settings.bigBlind);
      setSnapshots(generated);
      setLoading(false);
    };
    
    calculate();
  }, [storedHands, settings.bigBlind]);
  
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span className="text-sm text-offsuit-grey">Analyzing trends...</span>
        </div>
      </div>
    );
  }
  
  if (snapshots.length < 2) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="space-y-2">
          <p className="text-offsuit-grey text-sm">
            Play at least 50 hands to see trend analysis.
          </p>
          <p className="text-white/50 text-xs">
            Trends show how your stats evolve over time.
          </p>
        </div>
      </div>
    );
  }
  
  // Calculate trend direction for each stat
  const firstSnapshot = snapshots[0];
  const lastSnapshot = snapshots[snapshots.length - 1];
  
  const vpipTrend = lastSnapshot.vpip - firstSnapshot.vpip;
  const pfrTrend = lastSnapshot.pfr - firstSnapshot.pfr;
  const gtoTrend = lastSnapshot.gtoAccuracy - firstSnapshot.gtoAccuracy;
  const profitTrend = lastSnapshot.profit > firstSnapshot.profit;
  
  const formatPercent = (value: number) => `${(value * 100).toFixed(0)}%`;
  
  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-6">
      {/* Trend Summary */}
      <div className="p-4 offsuit-module">
        <h3 className="text-sm font-semibold text-offsuit-grey mb-3">
          Trend Summary
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <TrendCard
            label="VPIP"
            change={vpipTrend}
            current={lastSnapshot.vpip}
            format="percent"
            improving={Math.abs(lastSnapshot.vpip - GTO_BENCHMARKS.vpip.optimal) < Math.abs(firstSnapshot.vpip - GTO_BENCHMARKS.vpip.optimal)}
          />
          <TrendCard
            label="PFR"
            change={pfrTrend}
            current={lastSnapshot.pfr}
            format="percent"
            improving={Math.abs(lastSnapshot.pfr - GTO_BENCHMARKS.pfr.optimal) < Math.abs(firstSnapshot.pfr - GTO_BENCHMARKS.pfr.optimal)}
          />
          <TrendCard
            label="GTO Accuracy"
            change={gtoTrend}
            current={lastSnapshot.gtoAccuracy}
            format="percent"
            improving={gtoTrend > 0}
          />
          <TrendCard
            label="Profit"
            change={lastSnapshot.profit - firstSnapshot.profit}
            current={lastSnapshot.profit}
            format="currency"
            improving={profitTrend}
          />
        </div>
      </div>
      
      {/* VPIP Over Time */}
      <ChartCard title="VPIP Over Time">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={snapshots}>
            <CartesianGrid strokeDasharray="3 3" stroke="#38383A" />
            <XAxis 
              dataKey="handNumber" 
              tick={{ fontSize: 10, fill: '#8E8E93' }}
              label={{ value: 'Hand #', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#8E8E93' }}
            />
            <YAxis 
              domain={[0, 0.5]}
              tickFormatter={formatPercent}
              tick={{ fontSize: 10, fill: '#8E8E93' }}
            />
            <Tooltip
              contentStyle={{ 
                background: '#1C1C1E', 
                border: '1px solid #38383A', 
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(value: any) => [(value * 100).toFixed(1) + '%', 'VPIP']}
              labelFormatter={(label) => `Hand #${label}`}
            />
            {/* GTO optimal line */}
            <ReferenceLine 
              y={GTO_BENCHMARKS.vpip.optimal} 
              stroke="#34C759" 
              strokeDasharray="5 5"
              label={{ value: 'GTO', position: 'right', fill: '#34C759', fontSize: 10 }}
            />
            {/* Your VPIP */}
            <Line 
              type="monotone" 
              dataKey="vpip" 
              stroke="#FFFFFF" 
              strokeWidth={2}
              dot={{ fill: '#FFFFFF', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
      
      {/* PFR Over Time */}
      <ChartCard title="PFR Over Time">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={snapshots}>
            <CartesianGrid strokeDasharray="3 3" stroke="#38383A" />
            <XAxis 
              dataKey="handNumber" 
              tick={{ fontSize: 10, fill: '#8E8E93' }}
              label={{ value: 'Hand #', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#8E8E93' }}
            />
            <YAxis 
              domain={[0, 0.4]}
              tickFormatter={formatPercent}
              tick={{ fontSize: 10, fill: '#8E8E93' }}
            />
            <Tooltip
              contentStyle={{ 
                background: '#1C1C1E', 
                border: '1px solid #38383A', 
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(value: any) => [(value * 100).toFixed(1) + '%', 'PFR']}
              labelFormatter={(label) => `Hand #${label}`}
            />
            <ReferenceLine 
              y={GTO_BENCHMARKS.pfr.optimal} 
              stroke="#34C759" 
              strokeDasharray="5 5"
              label={{ value: 'GTO', position: 'right', fill: '#34C759', fontSize: 10 }}
            />
            <Line 
              type="monotone" 
              dataKey="pfr" 
              stroke="#FF9500" 
              strokeWidth={2}
              dot={{ fill: '#FF9500', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
      
      {/* Aggression Factor Over Time */}
      <ChartCard title="Aggression Factor Over Time">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={snapshots}>
            <CartesianGrid strokeDasharray="3 3" stroke="#38383A" />
            <XAxis 
              dataKey="handNumber" 
              tick={{ fontSize: 10, fill: '#8E8E93' }}
              label={{ value: 'Hand #', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#8E8E93' }}
            />
            <YAxis 
              domain={[0, 3]}
              tick={{ fontSize: 10, fill: '#8E8E93' }}
              label={{ value: 'AF', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#8E8E93' }}
            />
            <Tooltip
              contentStyle={{ 
                background: '#1C1C1E', 
                border: '1px solid #38383A', 
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(value: any) => [value.toFixed(2) + 'x', 'Aggression']}
              labelFormatter={(label) => `Hand #${label}`}
            />
            <ReferenceLine 
              y={GTO_BENCHMARKS.aggressionFactor.optimal} 
              stroke="#34C759" 
              strokeDasharray="5 5"
              label={{ value: 'GTO', position: 'right', fill: '#34C759', fontSize: 10 }}
            />
            <Line 
              type="monotone" 
              dataKey="aggressionFactor" 
              stroke="#FF3B30" 
              strokeWidth={2}
              dot={{ fill: '#FF3B30', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
      
      {/* GTO Accuracy Over Time */}
      <ChartCard title="GTO Accuracy Improvement">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={snapshots}>
            <CartesianGrid strokeDasharray="3 3" stroke="#38383A" />
            <XAxis 
              dataKey="handNumber" 
              tick={{ fontSize: 10, fill: '#8E8E93' }}
              label={{ value: 'Hand #', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#8E8E93' }}
            />
            <YAxis 
              domain={[0, 1]}
              tickFormatter={formatPercent}
              tick={{ fontSize: 10, fill: '#8E8E93' }}
            />
            <Tooltip
              contentStyle={{ 
                background: '#1C1C1E', 
                border: '1px solid #38383A', 
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(value: any) => [(value * 100).toFixed(1) + '%', 'GTO Accuracy']}
              labelFormatter={(label) => `Hand #${label}`}
            />
            <Line 
              type="monotone" 
              dataKey="gtoAccuracy" 
              stroke="#34C759" 
              strokeWidth={2}
              dot={{ fill: '#34C759', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
      
      {/* Insight */}
      <div className="p-4 offsuit-module bg-[#34C759]/10 border border-[#34C759]/30">
        <p className="text-xs text-white/90 mb-2">
          📈 <span className="font-semibold">Trend Insights</span>
        </p>
        <ul className="text-xs text-offsuit-grey space-y-1">
          {gtoTrend > 0.05 && (
            <li>• Your GTO accuracy is improving! Keep studying optimal ranges.</li>
          )}
          {Math.abs(vpipTrend) < 0.03 && (
            <li>• Your VPIP is stable - good consistency.</li>
          )}
          {vpipTrend > 0.1 && (
            <li>• Your VPIP is increasing. Make sure you're not playing too loose.</li>
          )}
          {vpipTrend < -0.1 && (
            <li>• You're tightening up. Watch for being too nitty from good positions.</li>
          )}
          {profitTrend && (
            <li>• Your profit trend is positive! Your adjustments are working.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 offsuit-module">
      <h3 className="text-sm font-semibold text-offsuit-grey mb-3">{title}</h3>
      {children}
    </div>
  );
}

interface TrendCardProps {
  label: string;
  change: number;
  current: number;
  format: 'percent' | 'currency';
  improving: boolean;
}

function TrendCard({ label, change, current, format, improving }: TrendCardProps) {
  const displayCurrent = format === 'percent' 
    ? (current * 100).toFixed(1) + '%'
    : current >= 0 ? `+$${current.toFixed(0)}` : `-$${Math.abs(current).toFixed(0)}`;
  
  const displayChange = format === 'percent'
    ? (Math.abs(change) * 100).toFixed(1) + '%'
    : Math.abs(change).toFixed(0);
  
  const direction = change > 0 ? '↑' : change < 0 ? '↓' : '→';
  const changeColor = improving ? 'text-[#34C759]' : 'text-[#FF9500]';
  
  return (
    <div className="p-3 bg-surface-raised rounded-lg">
      <div className="text-[10px] text-offsuit-grey uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className="text-lg font-semibold text-white tabular-nums">
        {displayCurrent}
      </div>
      <div className={`text-xs font-medium tabular-nums flex items-center gap-1 mt-1 ${changeColor}`}>
        <span>{direction}</span>
        <span>{displayChange}</span>
        {improving && <span className="text-[10px]">✓</span>}
      </div>
    </div>
  );
}
