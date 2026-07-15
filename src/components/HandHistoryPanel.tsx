import type { HandHistoryEntry } from '../types/poker';
import { PlayingCard } from './PlayingCard';
import { PlayerAvatar } from './PlayerAvatar';
import { resultColor, resultLabel } from '../utils/format';

interface HandHistoryPanelProps {
  history: HandHistoryEntry[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (handNumber: number) => void;
  selectedHand?: number;
}

export function HandHistoryPanel({
  history,
  isOpen,
  onClose,
  onSelect,
  selectedHand,
}: HandHistoryPanelProps) {
  return (
    <>
      <div
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-black border-l border-white/5 z-50 flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="font-semibold text-[17px] tracking-tight">Hand history</h2>
          <button
            onClick={onClose}
            className="offsuit-circle !w-9 !h-9 text-offsuit-grey"
            aria-label="Close history"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
          {history.length === 0 ? (
            <div className="p-6 offsuit-module text-center text-offsuit-grey text-sm">
              No hands played yet. Deal a hand to start building history.
            </div>
          ) : (
            history.map((entry) => (
              <button
                key={entry.handNumber}
                onClick={() => onSelect(entry.handNumber)}
                className={`w-full text-left px-4 py-3 rounded-module transition-colors ${
                  selectedHand === entry.handNumber
                    ? 'bg-surface ring-1 ring-white/20'
                    : 'bg-surface hover:bg-surface-raised'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-white">Hand #{entry.handNumber}</span>
                  <span className={`text-sm font-semibold tabular-nums ${resultColor(entry.stackChange)}`}>
                    {resultLabel(entry.stackChange)}
                  </span>
                </div>

                <div className="flex gap-1 mb-2.5">
                  {entry.heroCards.map((card, i) => (
                    <PlayingCard key={`${card}-${i}`} card={card} size="sm" />
                  ))}
                  {entry.board.length > 0 && (
                    <>
                      <span className="text-offsuit-muted self-center mx-0.5 text-xs">|</span>
                      {entry.board.map((card, i) => (
                        <PlayingCard key={`b-${card}-${i}`} card={card} size="sm" />
                      ))}
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <PlayerAvatar name={entry.winnerName} size="list" />
                  <div className="min-w-0">
                    <div className="text-[13px] text-offsuit-grey truncate">
                      {entry.winnerName} — {entry.winningHand}
                    </div>
                    <div className="text-xs text-offsuit-grey mt-0.5">
                      {entry.actions.length} actions · Pot ${entry.totalPot}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
