import type { Player, Card } from '../types/poker';
import { PlayingCard } from './PlayingCard';
import { PlayerAvatar } from './PlayerAvatar';
import { formatMoney } from '../utils/format';
import { getHeroHandLabel } from '../utils/hero-hand-label';

interface HeroZoneProps {
  player: Player;
  isActive: boolean;
  isDealer: boolean;
  showCards: boolean;
  board: Card[];
}

export function HeroZone({ player, isActive, isDealer, showCards, board }: HeroZoneProps) {
  const showHoleCards = showCards && player.holeCards.length > 0;
  const handLabel = showHoleCards ? getHeroHandLabel(player.holeCards, board, player.folded) : null;

  return (
    <div className="flex items-end justify-between gap-3 px-1">
      <div className="flex flex-col items-center gap-1.5 min-h-[76px]">
        {handLabel && (
          <div className="offsuit-chip text-[12.5px] font-medium px-3 py-1 whitespace-nowrap">
            {handLabel}
          </div>
        )}
        {showHoleCards ? (
          <div className="flex items-end animate-card-deal">
            {player.holeCards.map((card, i) => (
              <PlayingCard
                key={`${card}-${i}`}
                card={card}
                size="md"
                animate
                delay={i * 120}
                style={i === 1 ? { marginLeft: -14, marginBottom: 2 } : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="w-20" aria-hidden />
        )}
      </div>

      <div
        className={`relative flex items-center gap-3 px-3.5 py-3 rounded-module min-w-[132px] transition-all ${
          isActive ? 'bg-surface ring-2 ring-white/30' : 'bg-surface'
        }`}
      >
        {isDealer && (
          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-black text-[10px] font-bold flex items-center justify-center z-10 shadow-card">
            D
          </div>
        )}

        <PlayerAvatar
          name={player.name}
          playerKey={player.id}
          size="hero"
          active={isActive}
        />

        <div className="min-w-0">
          <div className="text-xs text-offsuit-grey leading-tight">You · {player.position}</div>
          <div className="text-lg font-semibold tabular-nums tracking-tight text-white">
            {formatMoney(player.stack)}
          </div>
          {player.betThisStreet > 0 && (
            <div className="text-xs font-semibold tabular-nums text-offsuit-grey mt-0.5">
              Bet {formatMoney(player.betThisStreet)}
            </div>
          )}
          {player.allIn && (
            <div className="text-xs text-offsuit-grey mt-0.5">All in</div>
          )}
        </div>
      </div>
    </div>
  );
}
