import type { Card, Street } from '../types/poker';
import { PlayingCard } from './PlayingCard';
import { formatMoney, streetLabel } from '../utils/format';

interface PotDisplayProps {
  amount: number;
  street: Street;
}

export function PotDisplay({ amount, street }: PotDisplayProps) {
  return (
    <div className="px-5 py-2.5 rounded-full bg-surface shadow-card transition-all duration-500 flex flex-col items-center gap-0.5">
      <div
        key={amount}
        className="text-white font-semibold text-[26px] leading-none tabular-nums tracking-tight animate-pot-pop"
      >
        {formatMoney(amount)}
      </div>
      <div
        key={street}
        className="text-xs font-medium text-offsuit-grey animate-fade-in"
      >
        {streetLabel(street)}
      </div>
    </div>
  );
}

interface BoardCardsProps {
  board: Card[];
  visibleCount: number;
}

export function BoardCards({ board, visibleCount }: BoardCardsProps) {
  const visible = board.slice(0, visibleCount);

  return (
    <div className="flex gap-1.5 items-center justify-center min-h-[76px]">
      {visible.length > 0 ? (
        visible.map((card, i) => (
          <PlayingCard
            key={`${card}-board-${i}`}
            card={card}
            size="md"
            animate
            className="animate-card-flip-in"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))
      ) : (
        <div className="flex gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-[54px] h-[76px] rounded-card border border-white/8 bg-surface"
            />
          ))}
        </div>
      )}
    </div>
  );
}
