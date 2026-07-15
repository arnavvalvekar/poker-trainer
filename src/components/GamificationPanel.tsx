import { useEffect, useState } from 'react';
import { useGameStore } from '../store/game-store';
import { calculateHeroStats } from '../stats/hero-stats';
import { calculateSkillRating, checkAchievements } from '../stats/gamification';
import { statsCache } from '../utils/stats-cache';
import type { Achievement, SkillRating } from '../stats/gamification';

const RARITY_COLORS = {
  common: { bg: '#8E8E93', border: '#8E8E93', text: 'Common' },
  rare: { bg: '#5856D6', border: '#5856D6', text: 'Rare' },
  epic: { bg: '#FF9500', border: '#FF9500', text: 'Epic' },
  legendary: { bg: '#FFD700', border: '#FFD700', text: 'Legendary' },
};

export function GamificationPanel() {
  const { storedHands, settings } = useGameStore();
  const [skillRating, setSkillRating] = useState<SkillRating | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  
  useEffect(() => {
    const calculate = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const cached = statsCache.get(storedHands);
      const stats = cached || calculateHeroStats(storedHands, settings.bigBlind);
      
      if (!cached) {
        statsCache.set(storedHands, stats);
      }
      
      const rating = calculateSkillRating(stats, storedHands);
      const achievementList = checkAchievements(stats, storedHands);
      
      setSkillRating(rating);
      setAchievements(achievementList);
      setLoading(false);
    };
    
    calculate();
  }, [storedHands, settings.bigBlind]);
  
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span className="text-sm text-offsuit-grey">Loading...</span>
        </div>
      </div>
    );
  }
  
  if (!skillRating || storedHands.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <p className="text-offsuit-grey text-sm">
          Play some hands to unlock achievements and see your skill rating!
        </p>
      </div>
    );
  }
  
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const filteredAchievements = achievements.filter(a => {
    if (filter === 'unlocked') return a.unlocked;
    if (filter === 'locked') return !a.unlocked;
    return true;
  });
  
  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-6">
      {/* Skill Rating */}
      <section>
        <h3 className="text-sm font-semibold text-offsuit-grey mb-3">
          Skill Rating
        </h3>
        <div className="p-5 offsuit-module">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-3xl font-bold text-white">{skillRating.overall}</div>
              <div className="text-sm text-offsuit-grey mt-1">{skillRating.rank}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-offsuit-grey mb-1">Next: {skillRating.nextRank}</div>
              <div className="text-sm text-white font-semibold">
                {skillRating.progressToNext.toFixed(0)}%
              </div>
            </div>
          </div>
          
          <div className="h-3 bg-surface-raised rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-[#5856D6] to-[#FFD700] rounded-full transition-all duration-500"
              style={{ width: `${skillRating.progressToNext}%` }}
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-xs">
            <SkillBadge label="Preflop" rating={skillRating.preflop} />
            <SkillBadge label="Postflop" rating={skillRating.postflop} />
            <SkillBadge label="Aggression" rating={skillRating.aggression} />
            <SkillBadge label="Position" rating={skillRating.position} />
            <SkillBadge label="GTO" rating={skillRating.gtoAlignment} />
            <div className="p-2 bg-surface-raised rounded">
              <div className="text-offsuit-grey">Overall</div>
              <div className="text-white font-semibold">{skillRating.overall}</div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Achievements Summary */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-offsuit-grey">
            Achievements ({unlockedCount}/{achievements.length})
          </h3>
          <div className="flex gap-1">
            <FilterButton
              active={filter === 'all'}
              onClick={() => setFilter('all')}
            >
              All
            </FilterButton>
            <FilterButton
              active={filter === 'unlocked'}
              onClick={() => setFilter('unlocked')}
            >
              Unlocked
            </FilterButton>
            <FilterButton
              active={filter === 'locked'}
              onClick={() => setFilter('locked')}
            >
              Locked
            </FilterButton>
          </div>
        </div>
        
        <div className="space-y-2">
          {filteredAchievements.map(achievement => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </div>
        
        {filteredAchievements.length === 0 && (
          <div className="p-4 offsuit-module text-center text-offsuit-grey text-sm">
            No achievements in this category yet.
          </div>
        )}
      </section>
    </div>
  );
}

function SkillBadge({ label, rating }: { label: string; rating: number }) {
  let color = '#8E8E93';
  if (rating >= 1600) color = '#FFD700';
  else if (rating >= 1400) color = '#FF9500';
  else if (rating >= 1200) color = '#5856D6';
  
  return (
    <div className="p-2 bg-surface-raised rounded">
      <div className="text-offsuit-grey">{label}</div>
      <div className="font-semibold" style={{ color }}>{rating}</div>
    </div>
  );
}

function FilterButton({
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
      className={`px-3 py-1 text-xs rounded-full transition-colors ${
        active
          ? 'bg-white text-black'
          : 'bg-surface-raised text-offsuit-grey hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const colors = RARITY_COLORS[achievement.rarity];
  const progressPercent = (achievement.progress / achievement.target) * 100;
  
  return (
    <div
      className={`p-4 rounded-module border transition-all ${
        achievement.unlocked 
          ? 'bg-surface border-white/10' 
          : 'bg-surface-raised/50 border-white/5 opacity-60'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="text-3xl">{achievement.icon}</div>
        
        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-semibold text-white">{achievement.name}</h4>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ 
                backgroundColor: colors.bg + '30',
                color: colors.bg,
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: colors.border + '50',
              }}
            >
              {colors.text}
            </span>
          </div>
          
          <p className="text-xs text-offsuit-grey mb-2">{achievement.description}</p>
          
          {!achievement.unlocked && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-offsuit-grey">Progress</span>
                <span className="text-white font-mono">
                  {achievement.progress.toFixed(0)}/{achievement.target}
                </span>
              </div>
              <div className="h-1.5 bg-surface-raised rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ 
                    width: `${progressPercent}%`,
                    backgroundColor: colors.bg,
                  }}
                />
              </div>
            </div>
          )}
          
          {achievement.unlocked && (
            <div className="flex items-center gap-1 text-xs text-[#34C759]">
              <span>✓</span>
              <span>Unlocked!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
