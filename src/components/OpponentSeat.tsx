import type { Player } from '../types/poker';
import { PlayingCard } from './PlayingCard';
import { formatMoney } from '../utils/format';

interface OpponentSeatProps {
  player: Player;
  isActive: boolean;
  isDealer: boolean;
  revealAtShowdown: boolean;
}

function Avatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full bg-surface-raised border border-white/10 flex items-center justify-center text-sm font-semibold text-white shrink-0">
      {initial}
    </div>
  );
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
      className={`flex flex-col items-center w-[68px] shrink-0 transition-opacity duration-300 ${
        player.folded ? 'opacity-35' : ''
      }`}
    >
      {showHoleCards && (
        <div className="flex mb-1 scale-[0.85] origin-bottom">
          {player.holeCards.map((card, i) => (
            <PlayingCard
              key={`${card}-${i}`}
              card={card}
              size="sm"
              style={i === 1 ? { marginLeft: -10 } : undefined}
            />
          ))}
        </div>
      )}

      <div
        className={`relative flex flex-col items-center gap-1 w-full px-1.5 py-2 rounded-module transition-all ${
          isActive ? 'bg-surface ring-1 ring-white/35' : 'bg-surface/60'
        }`}
      >
        {isDealer && (
          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-black text-[8px] font-bold flex items-center justify-center z-10">
            D
          </div>
        )}

        <Avatar name={player.name} />

        <div className="text-[11px] font-medium truncate max-w-full leading-tight">{player.name}</div>
        <div className="text-xs font-semibold tabular-nums tracking-tight">{formatMoney(player.stack)}</div>

        {player.betThisStreet > 0 && (
          <div className="text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded-full bg-surface-raised text-white">
            {formatMoney(player.betThisStreet)}
          </div>
        )}

        {player.folded && (
          <div className="text-[9px] text-offsuit-muted">Folded</div>
        )}
        {player.allIn && !player.folded && (
          <div className="text-[9px] text-offsuit-grey">All in</div>
        )}
      </div>
    </div>
  );
}
