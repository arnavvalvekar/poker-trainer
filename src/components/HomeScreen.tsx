import { useGameStore } from '../store/game-store';

function HouseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M3 10l7-7 7 7M5 9v7a1 1 0 001 1h2a1 1 0 001-1v-3a1 1 0 011-1h1a1 1 0 011 1v3a1 1 0 001 1h2a1 1 0 001-1V9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M7 6l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatsIconSmall() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M4 15V9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 15V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 15V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ReviewIconSmall() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="4" y="3.5" width="12" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 7.5h6M7 10.5h6M7 13.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 2v1.5M10 16.5V18M18 10h-1.5M5.5 10H4M15.5 4.5l-1.06 1.06M5.56 14.44l-1.06 1.06M15.5 15.5l-1.06-1.06M5.56 5.56L4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HomeScreen() {
  const { setView, getStats, storedHands } = useGameStore();
  const stats = getStats();

  return (
    <div className="flex flex-col min-h-dvh bg-black text-white safe-area">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4">
        <h1 className="text-[17px] font-semibold tracking-tight lowercase">
          offsuit <span className="text-offsuit-grey font-medium">trainer</span>
        </h1>
        <button
          onClick={() => {/* Settings can be wired later */}}
          className="p-2 -mr-2 text-offsuit-grey active:text-white touch-manipulation"
          aria-label="Settings"
        >
          <SettingsIcon />
        </button>
      </header>

      <div className="flex-1 px-5 pb-6 overflow-y-auto">
        {/* Hero Metric */}
        <div className="pt-2 pb-6">
          <div className="offsuit-module px-4 py-3 inline-block">
            <div className="text-[13px] text-offsuit-grey font-medium mb-1">Hands trained</div>
            <div className="text-[34px] font-semibold tabular-nums tracking-tight text-white">
              {stats.handsPlayed}
            </div>
          </div>
        </div>

        {/* Feature Card */}
        <button
          onClick={() => setView('play')}
          className="w-full bg-feature-gradient rounded-[24px] p-5 shadow-module active:scale-[0.98] transition-transform touch-manipulation"
        >
          <div className="flex items-start gap-3">
            <div className="text-[#1C1C1E] mt-0.5">
              <HouseIcon />
            </div>
            <div className="flex-1 text-left">
              <div className="text-[17px] font-semibold text-[#1C1C1E] mb-0.5">
                Practice table
              </div>
              <div className="text-[13px] text-[#636366]">
                6 players · 100bb
              </div>
            </div>
          </div>
        </button>

        {/* Continue Section */}
        <div className="mt-8">
          <div className="offsuit-module px-4 py-3 mb-3">
            <div className="text-[13px] font-semibold text-offsuit-grey">Continue</div>
          </div>

          <div className="bg-[#1C1C1E] rounded-[20px] overflow-hidden">
            <button
              onClick={() => setView('stats')}
              className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-surface-raised touch-manipulation transition-colors"
            >
              <div className="text-offsuit-grey">
                <StatsIconSmall />
              </div>
              <div className="flex-1 text-left">
                <div className="text-[15px] font-medium text-white">Stats</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-[15px] font-semibold text-white tabular-nums">
                  {stats.winRate.toFixed(0)}%
                </div>
                <div className="text-offsuit-grey">
                  <ChevronIcon />
                </div>
              </div>
            </button>

            <div className="h-px bg-white/5" />

            <button
              onClick={() => setView('review')}
              className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-surface-raised touch-manipulation transition-colors"
            >
              <div className="text-offsuit-grey">
                <ReviewIconSmall />
              </div>
              <div className="flex-1 text-left">
                <div className="text-[15px] font-medium text-white">Review</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-[15px] font-semibold text-white tabular-nums">
                  {storedHands.length} {storedHands.length === 1 ? 'hand' : 'hands'}
                </div>
                <div className="text-offsuit-grey">
                  <ChevronIcon />
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
