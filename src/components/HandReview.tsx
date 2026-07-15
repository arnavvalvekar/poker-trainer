import { useState } from 'react';
import { useGameStore } from '../store/game-store';
import { PlayingCard } from './PlayingCard';
import { PlayerAvatar } from './PlayerAvatar';
import { ActionLog } from './ActionLog';
import { FeedbackPanel } from './FeedbackPanel';
import { resultColor, resultLabel } from '../utils/format';

export function HandReview() {
  const { storedHands, reviewHandId, setReviewHand, setView } = useGameStore();
  const [search, setSearch] = useState('');

  const filtered = search
    ? storedHands.filter(
        (h) =>
          String(h.handNumber).includes(search) ||
          h.heroCards.join(' ').toLowerCase().includes(search.toLowerCase()) ||
          h.result.includes(search.toLowerCase()),
      )
    : storedHands;

  const selected = reviewHandId
    ? storedHands.find((h) => h.handId === reviewHandId)
    : filtered[0] ?? null;

  if (storedHands.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="offsuit-module px-6 py-5 text-offsuit-grey text-sm text-center max-w-xs">
          No saved hands yet. Play hands to build your review library.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-5 py-3">
        <input
          type="search"
          placeholder="Search hands..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 bg-surface-raised rounded-module text-sm text-white placeholder-offsuit-muted outline-none focus:ring-1 focus:ring-white/20"
        />
      </div>

      <div className="flex flex-1 min-h-0 px-3 pb-3 gap-2">
        <div className="w-[7.5rem] shrink-0 overflow-y-auto scrollbar-thin space-y-1.5">
          {filtered.map((h) => (
            <button
              key={h.handId}
              onClick={() => setReviewHand(h.handId)}
              className={`w-full px-3 py-2.5 text-left text-[13px] rounded-module transition-colors ${
                selected?.handId === h.handId
                  ? 'bg-surface ring-1 ring-white/20'
                  : 'bg-surface hover:bg-surface-raised'
              }`}
            >
              <div className="font-medium text-white">#{h.handNumber}</div>
              <div className={`tabular-nums text-xs mt-0.5 ${resultColor(h.stackChange)}`}>
                {resultLabel(h.stackChange)}
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="flex-1 overflow-y-auto space-y-3">
            <div className="offsuit-module p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold text-[17px] tracking-tight text-white">
                  Hand #{selected.handNumber}
                </h2>
                <button
                  onClick={() => { setReviewHand(null); setView('play'); }}
                  className="text-[13px] text-offsuit-grey active:text-white"
                >
                  Back to table
                </button>
              </div>

              <div className="flex gap-1.5 flex-wrap">
                {selected.heroCards.map((c, i) => (
                  <PlayingCard key={i} card={c} size="md" />
                ))}
                {selected.board.length > 0 && (
                  <>
                    <span className="text-offsuit-muted self-center text-sm px-0.5">|</span>
                    {selected.board.map((c, i) => (
                      <PlayingCard key={i} card={c} size="md" />
                    ))}
                  </>
                )}
              </div>

              <div className="flex items-start gap-3">
                <PlayerAvatar name={selected.winnerName} size="list" />
                <div className="text-[13px] text-offsuit-grey space-y-1 min-w-0">
                  <div>Position: <span className="text-white">{selected.heroPosition ?? '—'}</span></div>
                  <div>
                    Result:{' '}
                    <span className={resultColor(selected.stackChange)}>
                      {resultLabel(selected.stackChange)}
                    </span>
                  </div>
                  <div className="truncate">
                    Winner: <span className="text-white">{selected.winnerName}</span> ({selected.winningHand})
                  </div>
                  <div>Pot: <span className="text-white">${selected.totalPot}</span></div>
                </div>
              </div>
            </div>

            <div className="p-4 offsuit-module">
              <h3 className="offsuit-section-title mb-2">Action log</h3>
              <ActionLog
                actions={selected.actions}
                players={[{ id: 0, name: 'You' } as never]}
                maxItems={50}
              />
            </div>

            {selected.feedback.length > 0 && (
              <FeedbackPanel feedback={selected.feedback} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
