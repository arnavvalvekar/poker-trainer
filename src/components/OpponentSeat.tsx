import type { Player } from '../types/poker';
import { PlayingCard } from './PlayingCard';
import { PlayerAvatar } from './PlayerAvatar';
import { formatMoney } from '../utils/format';

interface OpponentSeatProps {
  player: Player;
  isActive: boolean;
  isDealer: boolean;
  revealAtShowdown: boolean;
}

export function OpponentSeat({
  player,
  isActive,
  isDealer,
  revealAtShowdown,
}: OpponentSeatProps) {
  const showHoleCards =
    revealAtShowdown && !player.folded && player.holeCards.length > 0;

  return (
    <div
      className={`flex flex-col items-center w-[76px] shrink-0 transition-opacity duration-300 ${
        player.folded ? 'opacity-35' : ''
      }`}
    >
      {showHoleCards && (
        <div className="flex mb-1.5">
          {player.holeCards.map((card, i) => (
            <PlayingCard
              key={`${card}-${i}`}
              card={card}
              size="sm"
              style={i === 1 ? { marginLeft: -12 } : undefined}
            />
          ))}
        </div>
      )}

      <div
        className={`relative flex flex-col items-center gap-1.5 w-full px-2 py-2.5 rounded-module transition-all ${
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
          size="opponent"
          active={isActive}
        />

        <div className="text-xs font-medium truncate max-w-full leading-tight text-white">
          {player.name}
        </div>
        <div className="text-[13px] font-semibold tabular-nums tracking-tight text-white">
          {formatMoney(player.stack)}
        </div>

        {player.betThisStreet > 0 && (
          <div className="text-xs font-semibold tabular-nums px-2.5 py-0.5 rounded-full bg-surface-raised text-white">
            {formatMoney(player.betThisStreet)}
          </div>
        )}

        {player.folded && (
          <div className="text-xs text-offsuit-grey">Folded</div>
        )}
        {player.allIn && !player.folded && (
          <div className="text-xs text-offsuit-grey">All in</div>
        )}
      </div>
    </div>
  );
}
