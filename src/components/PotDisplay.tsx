import type { Card, Street } from '../types/poker';
import { PlayingCard } from './PlayingCard';
import { formatMoney, streetLabel } from '../utils/format';

interface PotDisplayProps {
  amount: number;
  street: Street;
}

export function PotDisplay({ amount, street }: PotDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="px-4 py-1.5 rounded-full bg-surface/80 backdrop-blur-sm shadow-card transition-all duration-500">
        <div
          key={amount}
          className="text-white font-semibold text-sm tabular-nums tracking-tight animate-pot-pop"
        >
          {formatMoney(amount)}
        </div>
      </div>
      <div
        key={street}
        className="text-[10px] text-offsuit-grey font-medium animate-fade-in"
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
    <div className="flex gap-1.5 items-center justify-center min-h-[56px]">
      {visible.length > 0 ? (
        visible.map((card, i) => (
          <PlayingCard
            key={`${card}-board-${i}`}
            card={card}
            size="sm"
            animate
            className="animate-card-flip-in"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))
      ) : (
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-10 h-14 rounded-card border border-white/5 bg-surface/40"
            />
          ))}
        </div>
      )}
    </div>
  );
}
