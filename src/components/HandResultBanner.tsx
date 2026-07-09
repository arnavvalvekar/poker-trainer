import type { HandSummary } from '../types/poker';
import { PlayingCard } from './PlayingCard';
import { formatMoney } from '../utils/format';

interface HandResultBannerProps {
  summary: HandSummary;
  playerNames: Map<number, string>;
}

export function HandResultBanner({ summary, playerNames }: HandResultBannerProps) {
  const topWinners = [...summary.winners]
    .filter((w) => w.wonAmount > 0)
    .sort((a, b) => b.handRank - a.handRank);

  const displayWinners = topWinners.length > 0
    ? topWinners
    : [summary.winners.sort((a, b) => b.handRank - a.handRank)[0]].filter(Boolean);

  return (
    <div className="mx-4 mb-2 p-4 offsuit-module animate-slide-up">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm">Hand #{summary.handNumber}</span>
        <span className="text-white text-sm font-semibold tabular-nums">
          Pot {formatMoney(summary.totalPot)}
        </span>
      </div>

      {summary.board.length > 0 && (
        <div className="flex gap-1 justify-center mb-2">
          {summary.board.map((card, i) => (
            <PlayingCard key={`${card}-${i}`} card={card} size="sm" />
          ))}
        </div>
      )}

      {displayWinners.map((w) => (
        <div key={w.playerId} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">
              {playerNames.get(w.playerId) ?? 'Player'}
            </span>
            <span className="text-offsuit-grey">{w.handName}</span>
          </div>
          {w.wonAmount > 0 && (
            <span className="text-white font-semibold tabular-nums">+{formatMoney(w.wonAmount)}</span>
          )}
        </div>
      ))}
    </div>
  );
}
