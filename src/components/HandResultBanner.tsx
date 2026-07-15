import type { HandSummary } from '../types/poker';
import { PlayingCard } from './PlayingCard';
import { PlayerAvatar } from './PlayerAvatar';
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
    <div className="mb-3 p-4 offsuit-module animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-[15px] text-white">Hand #{summary.handNumber}</span>
        <span className="text-white text-[15px] font-semibold tabular-nums">
          Pot {formatMoney(summary.totalPot)}
        </span>
      </div>

      {summary.board.length > 0 && (
        <div className="flex gap-1.5 justify-center mb-3">
          {summary.board.map((card, i) => (
            <PlayingCard key={`${card}-${i}`} card={card} size="md" />
          ))}
        </div>
      )}

      <div className="space-y-2.5">
        {displayWinners.map((w) => {
          const name = playerNames.get(w.playerId) ?? 'Player';
          return (
            <div key={w.playerId} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <PlayerAvatar name={name} playerKey={w.playerId} size="list" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">{name}</div>
                  <div className="text-xs text-offsuit-grey">{w.handName}</div>
                </div>
              </div>
              {w.wonAmount > 0 && (
                <span className="text-sm font-semibold tabular-nums text-white shrink-0">
                  +{formatMoney(w.wonAmount)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
