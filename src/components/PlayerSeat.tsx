import type { Player } from '../types/poker';
import type { SeatPosition } from '../utils/seat-layout';
import { PlayingCard } from './PlayingCard';
import { ChipStack } from './ChipStack';
import { formatMoney } from '../utils/format';

interface PlayerSeatProps {
  player: Player;
  position: SeatPosition;
  isActive: boolean;
  isDealer: boolean;
  showCards: boolean;
  revealAtShowdown: boolean;
}

export function PlayerSeat({
  player,
  position,
  isActive,
  isDealer,
  showCards,
  revealAtShowdown,
}: PlayerSeatProps) {
  const showHoleCards = player.isHero
    ? showCards && player.holeCards.length > 0
    : revealAtShowdown && !player.folded && player.holeCards.length > 0;

  return (
    <div
      className="absolute z-10 transition-all duration-500 ease-out"
      style={{
        top: position.top,
        left: position.left,
        transform: position.transform,
      }}
    >
      {player.betThisStreet > 0 && (
        <div
          className="absolute z-20 -translate-x-1/2"
          style={{ top: position.betOffset.top, left: position.betOffset.left }}
        >
          <ChipStack amount={player.betThisStreet} animate />
        </div>
      )}

      <div
        className={`relative flex flex-col items-center transition-all duration-500 ease-out ${
          player.folded ? 'opacity-30 scale-90 -translate-y-1' : ''
        }`}
      >
        {showHoleCards && (
          <div className={`flex gap-0.5 mb-1 ${player.isHero ? 'animate-card-deal' : '-mt-2'}`}>
            {player.holeCards.map((card, i) => (
              <PlayingCard
                key={`${card}-${i}`}
                card={card}
                size="sm"
                animate
                delay={i * 150}
                style={player.isHero && i === 1 ? { marginLeft: -8 } : undefined}
              />
            ))}
          </div>
        )}

        {!player.isHero && !revealAtShowdown && showCards && !player.folded && (
          <div className="flex gap-0.5 mb-1 -mt-2">
            <PlayingCard card="As" faceDown size="sm" animate delay={0} />
            <PlayingCard card="As" faceDown size="sm" animate delay={120} style={{ marginLeft: -8 }} />
          </div>
        )}

        <div
          className={`relative px-3 py-2 rounded-module text-center min-w-[76px] transition-all duration-500 ease-out shadow-card ${
            isActive
              ? 'bg-surface ring-2 ring-white/30 scale-105 animate-seat-active'
              : 'bg-surface/90 backdrop-blur-sm scale-100'
          } ${player.allIn ? 'ring-1 ring-white/20' : ''}`}
        >
          {isDealer && (
            <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white text-black text-[10px] font-bold flex items-center justify-center shadow-card z-10 animate-fade-in">
              D
            </div>
          )}

          <div className="font-medium text-xs truncate max-w-[80px]">{player.name}</div>
          <div className="text-white font-semibold text-sm tabular-nums tracking-tight transition-all duration-300">
            {formatMoney(player.stack)}
          </div>
          <div className="text-offsuit-grey text-[10px]">{player.position}</div>

          {player.allIn && (
            <div className="text-offsuit-grey text-[10px] font-semibold animate-fade-in">All in</div>
          )}
          {player.folded && (
            <div className="text-offsuit-muted text-[10px]">Folded</div>
          )}
        </div>
      </div>
    </div>
  );
}
