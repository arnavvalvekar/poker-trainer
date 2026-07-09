import { useState } from 'react';
import { useGameStore } from '../store/game-store';
import { PlayingCard } from './PlayingCard';
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
      <div className="flex-1 flex items-center justify-center p-8 text-offsuit-grey text-sm text-center">
        No saved hands yet. Play hands to build your review library.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-5 py-3 border-b border-white/5">
        <input
          type="search"
          placeholder="Search hands..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 bg-surface border border-white/5 rounded-module text-sm text-white placeholder-offsuit-muted"
        />
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-28 shrink-0 overflow-y-auto border-r border-white/5 scrollbar-thin">
          {filtered.map((h) => (
            <button
              key={h.handId}
              onClick={() => setReviewHand(h.handId)}
              className={`w-full px-3 py-2.5 text-left text-xs border-b border-white/5 ${
                selected?.handId === h.handId ? 'bg-surface' : 'hover:bg-surface/50'
              }`}
            >
              <div className="font-medium">#{h.handNumber}</div>
              <div className={`tabular-nums ${resultColor(h.stackChange)}`}>{resultLabel(h.stackChange)}</div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[17px] tracking-tight">Hand #{selected.handNumber}</h2>
              <button
                onClick={() => { setReviewHand(null); setView('play'); }}
                className="text-xs text-offsuit-grey active:text-white"
              >
                Back to table
              </button>
            </div>

            <div className="flex gap-1">
              {selected.heroCards.map((c, i) => (
                <PlayingCard key={i} card={c} size="sm" />
              ))}
              {selected.board.length > 0 && (
                <>
                  <span className="text-offsuit-muted self-center">|</span>
                  {selected.board.map((c, i) => (
                    <PlayingCard key={i} card={c} size="sm" />
                  ))}
                </>
              )}
            </div>

            <div className="text-sm text-offsuit-grey space-y-1">
              <div>Position: {selected.heroPosition ?? '—'}</div>
              <div>Result: <span className={resultColor(selected.stackChange)}>{resultLabel(selected.stackChange)}</span></div>
              <div>Winner: {selected.winnerName} ({selected.winningHand})</div>
              <div>Pot: ${selected.totalPot}</div>
            </div>

            <div className="p-4 offsuit-module">
              <h3 className="text-xs font-semibold text-offsuit-grey mb-2">Action log</h3>
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
