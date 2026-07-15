import { useEffect, useState } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import { useGameStore } from '../store/game-store';
import { calculateHeroStats } from '../stats/hero-stats';
import { calculateSkillRating } from '../stats/gamification';
import { calculateAIInsights } from '../stats/ai-insights';
import { statsCache } from '../utils/stats-cache';
import type { AIInsights } from '../stats/ai-insights';

export function AIInsightsPanel() {
  const { storedHands, settings } = useGameStore();
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const calculate = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const cached = statsCache.get(storedHands);
      const stats = cached || calculateHeroStats(storedHands, settings.bigBlind);
      
      if (!cached) {
        statsCache.set(storedHands, stats);
      }
      
      const aiInsights = calculateAIInsights(storedHands, stats, settings.bigBlind);
      setInsights(aiInsights);
      setLoading(false);
    };
    
    calculate();
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
  
  if (!insights || storedHands.length < 30) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <p className="text-offsuit-grey text-sm">
          Play at least 30 hands for AI-powered insights and pattern detection.
        </p>
      </div>
    );
  }
  
  const cached = statsCache.get(storedHands);
  const stats = cached || calculateHeroStats(storedHands, settings.bigBlind);
  const skillRating = calculateSkillRating(stats, storedHands);
  
  // Prepare radar chart data
  const radarData = [
    { skill: 'Preflop', value: (skillRating.preflop / 2000) * 100, fullMark: 100 },
    { skill: 'Postflop', value: (skillRating.postflop / 2000) * 100, fullMark: 100 },
    { skill: 'Aggression', value: (skillRating.aggression / 2000) * 100, fullMark: 100 },
    { skill: 'Position', value: (skillRating.position / 2000) * 100, fullMark: 100 },
    { skill: 'GTO', value: (skillRating.gtoAlignment / 2000) * 100, fullMark: 100 },
    { skill: 'Mental', value: insights.mentalGameScore, fullMark: 100 },
  ];
  
  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-6">
      {/* Tilt Detection */}
      {insights.tilt.severity !== 'none' && (
        <section>
          <div className={`p-4 rounded-module border ${
            insights.tilt.severity === 'severe' ? 'bg-[#FF3B30]/10 border-[#FF3B30]' :
            insights.tilt.severity === 'moderate' ? 'bg-[#FF9500]/10 border-[#FF9500]' :
            'bg-[#FFD700]/10 border-[#FFD700]'
          }`}>
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">
                {insights.tilt.severity === 'severe' ? '🛑' :
                 insights.tilt.severity === 'moderate' ? '⚠️' : '💡'}
              </span>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white mb-1">
                  {insights.tilt.severity === 'severe' ? 'Severe Tilt Detected' :
                   insights.tilt.severity === 'moderate' ? 'Moderate Tilt Warning' :
                   'Mild Tilt Detected'}
                </h3>
                <p className="text-sm text-white/90 mb-2">
                  {insights.tilt.recommendation}
                </p>
                <div className="space-y-1">
                  {insights.tilt.indicators.map((indicator, i) => (
                    <div key={i} className="text-xs text-white/70">
                      • {indicator}
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-xs text-white/70">
                {(insights.tilt.confidence * 100).toFixed(0)}% confidence
              </div>
            </div>
          </div>
        </section>
      )}
      
      {/* Skill Radar */}
      <section>
        <h3 className="text-sm font-semibold text-offsuit-grey mb-3">
          Skill Radar
        </h3>
        <div className="p-4 offsuit-module">
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#38383A" />
              <PolarAngleAxis 
                dataKey="skill" 
                tick={{ fill: '#8E8E93', fontSize: 12 }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]}
                tick={{ fill: '#8E8E93', fontSize: 10 }}
              />
              <Radar
                name="Your Skills"
                dataKey="value"
                stroke="#34C759"
                fill="#34C759"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{ 
                  background: '#1C1C1E', 
                  border: '1px solid #38383A', 
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(value: any) => [value.toFixed(0) + '/100', 'Score']}
              />
            </RadarChart>
          </ResponsiveContainer>
          
          <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
            <div className="p-2 bg-surface-raised rounded">
              <div className="text-offsuit-grey">Consistency</div>
              <div className="text-white font-semibold">
                {(insights.playingStyleConsistency * 100).toFixed(0)}%
              </div>
            </div>
            <div className="p-2 bg-surface-raised rounded">
              <div className="text-offsuit-grey">Mental Game</div>
              <div className="text-white font-semibold">
                {insights.mentalGameScore}/100
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Personalized Recommendations */}
      <section>
        <h3 className="text-sm font-semibold text-offsuit-grey mb-3">
          Personalized Recommendations
        </h3>
        <div className="space-y-3">
          {insights.recommendations.slice(0, 5).map(rec => (
            <RecommendationCard key={rec.id} recommendation={rec} />
          ))}
        </div>
        
        {insights.recommendations.length === 0 && (
          <div className="p-4 offsuit-module text-center">
            <p className="text-sm text-offsuit-grey">
              No critical recommendations. Keep playing solid poker! 👍
            </p>
          </div>
        )}
      </section>
      
      {/* Detected Patterns */}
      {insights.patterns.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-offsuit-grey mb-3">
            Detected Patterns ({insights.patterns.length})
          </h3>
          <div className="space-y-2">
            {insights.patterns.map(pattern => (
              <PatternCard key={pattern.id} pattern={pattern} />
            ))}
          </div>
        </section>
      )}
      
      {/* Mental Game Score */}
      <section>
        <h3 className="text-sm font-semibold text-offsuit-grey mb-3">
          Mental Game Analysis
        </h3>
        <div className="p-4 offsuit-module">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm text-offsuit-grey">Mental Game Score</div>
              <div className="text-3xl font-bold text-white mt-1">
                {insights.mentalGameScore}
                <span className="text-lg text-offsuit-grey">/100</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-white">
                {insights.mentalGameScore >= 80 ? 'Excellent' :
                 insights.mentalGameScore >= 60 ? 'Good' :
                 insights.mentalGameScore >= 40 ? 'Fair' : 'Needs Work'}
              </div>
              <div className="text-xs text-offsuit-grey mt-1">
                Style Consistency: {(insights.playingStyleConsistency * 100).toFixed(0)}%
              </div>
            </div>
          </div>
          
          <div className="h-3 bg-surface-raised rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${insights.mentalGameScore}%`,
                backgroundColor: insights.mentalGameScore >= 70 ? '#34C759' :
                                insights.mentalGameScore >= 50 ? '#FF9500' : '#FF3B30',
              }}
            />
          </div>
          
          <div className="mt-4 p-3 bg-surface-raised rounded-lg">
            <p className="text-xs text-offsuit-grey leading-relaxed">
              <span className="text-white font-medium">Mental Game</span> measures your emotional control, 
              consistency, and discipline. High scores indicate you play your best poker regardless of recent results.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

interface RecommendationCardProps {
  recommendation: AIInsights['recommendations'][0];
}

function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const priorityColors = {
    critical: { bg: '#FF3B30', text: 'CRITICAL' },
    high: { bg: '#FF9500', text: 'HIGH' },
    medium: { bg: '#5856D6', text: 'MEDIUM' },
    low: { bg: '#8E8E93', text: 'LOW' },
  };
  
  const colors = priorityColors[recommendation.priority];
  
  return (
    <div className="p-4 offsuit-module">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-semibold text-white">{recommendation.title}</h4>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded"
          style={{ backgroundColor: colors.bg, color: '#000' }}
        >
          {colors.text}
        </span>
      </div>
      
      <p className="text-sm text-offsuit-grey mb-3 leading-relaxed">
        {recommendation.insight}
      </p>
      
      <div className="pt-3 border-t border-white/5">
        <p className="text-xs text-white/90 leading-relaxed mb-2">
          <span className="font-medium text-white">Action: </span>
          {recommendation.actionable}
        </p>
        
        {recommendation.evidence.length > 0 && (
          <div className="mt-2 space-y-1">
            {recommendation.evidence.map((evidence, i) => (
              <div key={i} className="text-xs text-offsuit-grey">
                • {evidence}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface PatternCardProps {
  pattern: AIInsights['patterns'][0];
}

function PatternCard({ pattern }: PatternCardProps) {
  const impactColors = {
    positive: { bg: '#34C759', icon: '✓' },
    negative: { bg: '#FF3B30', icon: '⚠' },
    neutral: { bg: '#8E8E93', icon: '○' },
  };
  
  const colors = impactColors[pattern.impact];
  
  return (
    <div className="p-3 offsuit-module">
      <div className="flex items-start gap-3">
        <span 
          className="text-xs font-bold px-2 py-1 rounded"
          style={{ backgroundColor: colors.bg + '30', color: colors.bg }}
        >
          {colors.icon}
        </span>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-medium text-white">{pattern.title}</h4>
            <span className="text-xs text-offsuit-grey capitalize">
              {pattern.severity} severity
            </span>
          </div>
          
          <p className="text-xs text-offsuit-grey mb-2 leading-relaxed">
            {pattern.description}
          </p>
          
          <p className="text-xs text-white/80 leading-relaxed">
            <span className="font-medium">Fix: </span>
            {pattern.recommendation}
          </p>
        </div>
      </div>
    </div>
  );
}
