import type { Player } from '../types/poker';
import { PlayingCard } from './PlayingCard';
import { formatMoney } from '../utils/format';

interface HeroZoneProps {
  player: Player;
  isActive: boolean;
  isDealer: boolean;
  showCards: boolean;
}

export function HeroZone({ player, isActive, isDealer, showCards }: HeroZoneProps) {
  const showHoleCards = showCards && player.holeCards.length > 0;

  return (
    <div className="flex items-end justify-between gap-3 px-1">
      <div className="flex items-end min-h-[56px]">
        {showHoleCards ? (
          <div className="flex items-end animate-card-deal">
            {player.holeCards.map((card, i) => (
              <PlayingCard
                key={`${card}-${i}`}
                card={card}
                size="sm"
                animate
                delay={i * 120}
                style={i === 1 ? { marginLeft: -12, marginBottom: i * 2 } : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="w-16" aria-hidden />
        )}
      </div>

      <div
        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-module min-w-[120px] transition-all ${
          isActive ? 'bg-surface ring-1 ring-white/35' : 'bg-surface/80'
        }`}
      >
        {isDealer && (
          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-black text-[8px] font-bold flex items-center justify-center z-10">
            D
          </div>
        )}

        <div className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-sm font-semibold shrink-0">
          {player.name.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0">
          <div className="text-[11px] text-offsuit-grey leading-tight">You · {player.position}</div>
          <div className="text-base font-semibold tabular-nums tracking-tight">
            {formatMoney(player.stack)}
          </div>
          {player.betThisStreet > 0 && (
            <div className="text-[11px] font-semibold tabular-nums text-offsuit-grey mt-0.5">
              Bet {formatMoney(player.betThisStreet)}
            </div>
          )}
          {player.allIn && (
            <div className="text-[10px] text-offsuit-grey mt-0.5">All in</div>
          )}
        </div>
      </div>
    </div>
  );
}
