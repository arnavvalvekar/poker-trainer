import { useState, type ReactNode } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts';
import { useGameStore } from '../store/game-store';
import { resultColor, resultLabel } from '../utils/format';
import { HeroStatsPanel } from './HeroStatsPanel';
import { GTOComparison } from './GTOComparison';
import { PositionalBreakdown } from './PositionalBreakdown';
import { TrendCharts } from './TrendCharts';
import { AdvancedStatsPanel } from './AdvancedStatsPanel';
import { GamificationPanel } from './GamificationPanel';
import { AIInsightsPanel } from './AIInsightsPanel';
import type { SessionStats } from '../types/poker';
import type { StoredHand } from '../storage/hand-history';

const COLORS = ['#34C759', '#FF3B30', '#8E8E93'];

type StatsTab = 'overview' | 'hero' | 'leaks' | 'position' | 'trends' | 'advanced' | 'insights' | 'achievements';

export function StatsDashboard() {
  const { getStats, storedHands, setReviewHand } = useGameStore();
  const [activeTab, setActiveTab] = useState<StatsTab>('overview');
  const stats = getStats();

  return (
    <div className="flex-1 flex flex-col">
      {/* Tab Navigation */}
      <div className="border-b border-white/10 px-5 overflow-x-auto">
        <div className="flex gap-1 -mb-px min-w-max">
          <TabButton
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </TabButton>
          <TabButton
            active={activeTab === 'hero'}
            onClick={() => setActiveTab('hero')}
          >
            My Stats
          </TabButton>
          <TabButton
            active={activeTab === 'leaks'}
            onClick={() => setActiveTab('leaks')}
          >
            Leaks
          </TabButton>
          <TabButton
            active={activeTab === 'position'}
            onClick={() => setActiveTab('position')}
          >
            Position
          </TabButton>
          <TabButton
            active={activeTab === 'trends'}
            onClick={() => setActiveTab('trends')}
          >
            Trends
          </TabButton>
          <TabButton
            active={activeTab === 'advanced'}
            onClick={() => setActiveTab('advanced')}
          >
            Advanced
          </TabButton>
          <TabButton
            active={activeTab === 'insights'}
            onClick={() => setActiveTab('insights')}
          >
            AI Insights
          </TabButton>
          <TabButton
            active={activeTab === 'achievements'}
            onClick={() => setActiveTab('achievements')}
          >
            Achievements
          </TabButton>
        </div>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab stats={stats} storedHands={storedHands} setReviewHand={setReviewHand} />}
      {activeTab === 'hero' && <HeroStatsPanel />}
      {activeTab === 'leaks' && <GTOComparison />}
      {activeTab === 'position' && <PositionalBreakdown />}
      {activeTab === 'trends' && <TrendCharts />}
      {activeTab === 'advanced' && <AdvancedStatsPanel />}
      {activeTab === 'insights' && <AIInsightsPanel />}
      {activeTab === 'achievements' && <GamificationPanel />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
        active
          ? 'text-white border-white'
          : 'text-offsuit-grey border-transparent hover:text-white/70'
      }`}
    >
      {children}
    </button>
  );
}

function OverviewTab({
  stats,
  storedHands,
  setReviewHand,
}: {
  stats: SessionStats;
  storedHands: StoredHand[];
  setReviewHand: (handId: string | null) => void;
}) {
  const positionData = Object.entries(stats.positionalStats)
    .filter(([, v]) => v.hands > 0)
    .map(([pos, v]) => ({
      position: pos,
      profit: v.profit,
      hands: v.hands,
    }));

  const profitOverTime = [...storedHands]
    .reverse()
    .reduce<{ hand: number; profit: number }[]>((acc, h, i) => {
      const prev = acc[i - 1]?.profit ?? 0;
      acc.push({ hand: h.handNumber, profit: prev + h.stackChange });
      return acc;
    }, []);

  if (stats.handsPlayed === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-offsuit-grey text-sm text-center">
        Play some hands to see your training stats here.
      </div>
    );
  }
  
  const resultData = [
    { name: 'Wins', value: stats.wins },
    { name: 'Losses', value: stats.losses },
    { name: 'Splits', value: stats.splits },
  ].filter((d) => d.value > 0);

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Hands" value={String(stats.handsPlayed)} />
        <StatCard
          label="Win rate"
          value={`${Math.round(stats.winRate * 100)}%`}
        />
        <StatCard
          label="Profit"
          value={resultLabel(stats.totalProfit)}
          valueClass={resultColor(stats.totalProfit)}
        />
        <StatCard
          label="GTO accuracy"
          value={`${Math.round(stats.avgDecisionAccuracy * 100)}%`}
        />
      </div>

      {resultData.length > 0 && (
        <ChartCard title="Results">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={resultData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={60}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {resultData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {profitOverTime.length > 1 && (
        <ChartCard title="Cumulative profit">
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={profitOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#38383A" />
              <XAxis dataKey="hand" tick={{ fontSize: 10, fill: '#8E8E93' }} />
              <YAxis tick={{ fontSize: 10, fill: '#8E8E93' }} />
              <Tooltip
                contentStyle={{ background: '#1C1C1E', border: '1px solid #38383A', borderRadius: 12 }}
              />
              <Line type="monotone" dataKey="profit" stroke="#FFFFFF" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {positionData.length > 0 && (
        <ChartCard title="Profit by position">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={positionData}>
              <XAxis dataKey="position" tick={{ fontSize: 10, fill: '#8E8E93' }} />
              <YAxis tick={{ fontSize: 10, fill: '#8E8E93' }} />
              <Tooltip
                contentStyle={{ background: '#1C1C1E', border: '1px solid #38383A', borderRadius: 12 }}
              />
              <Bar dataKey="profit" fill="#FFFFFF" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <div>
        <h3 className="text-sm font-semibold text-offsuit-grey mb-2">Recent hands</h3>
        <div className="space-y-1">
          {storedHands.slice(0, 10).map((h: any) => (
            <button
              key={h.handId}
              onClick={() => setReviewHand(h.handId)}
              className="w-full flex items-center justify-between px-4 py-3 offsuit-module hover:bg-surface-raised text-sm transition-colors"
            >
              <span>#{h.handNumber} {h.heroPosition}</span>
              <span className={`tabular-nums ${resultColor(h.stackChange)}`}>{resultLabel(h.stackChange)}</span>
            </button>
          ))}
        </div>
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
    <div className="p-4 offsuit-module">
      <div className="text-[10px] text-offsuit-grey">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums tracking-tight mt-1 ${valueClass}`}>{value}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="p-4 offsuit-module">
      <h3 className="text-sm font-semibold text-offsuit-grey mb-2">{title}</h3>
      {children}
    </div>
  );
}
