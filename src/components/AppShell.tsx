import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { useGameStore } from '../store/game-store';
import { PokerTable } from './PokerTable';
import { HomeScreen } from './HomeScreen';

const StatsDashboard = lazy(() =>
  import('./StatsDashboard').then((m) => ({ default: m.StatsDashboard })),
);
const HandReview = lazy(() =>
  import('./HandReview').then((m) => ({ default: m.HandReview })),
);

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="3.5" y="4" width="5" height="12" rx="1.25" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11.5" y="4" width="5" height="12" rx="1.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function StatsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M4 15V9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 15V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 15V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ReviewIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="4" y="3.5" width="12" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 7.5h6M7 10.5h6M7 13.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9 1.75v1.5M9 14.75v1.5M1.75 9h1.5M14.75 9h1.5M3.4 3.4l1.06 1.06M13.54 13.54l1.06 1.06M14.6 3.4l-1.06 1.06M4.46 13.54l-1.06 1.06"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M14.5 10.2A5.75 5.75 0 1 1 7.8 3.5 4.5 4.5 0 0 0 14.5 10.2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const NAV_ITEMS: {
  id: 'play' | 'stats' | 'review';
  label: string;
  icon: ReactNode;
}[] = [
  { id: 'play', label: 'Play', icon: <PlayIcon /> },
  { id: 'stats', label: 'Stats', icon: <StatsIcon /> },
  { id: 'review', label: 'Review', icon: <ReviewIcon /> },
];

function ViewLoader() {
  return (
    <div className="flex-1 flex items-center justify-center text-offsuit-grey text-sm bg-black">
      Loading...
    </div>
  );
}

export function AppShell() {
  const { view, setView, init, settings, updateSettings } = useGameStore();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="flex flex-col min-h-dvh bg-black">
      {view === 'home' && <HomeScreen />}
      {view === 'play' && <PokerTable />}
      {view === 'stats' && (
        <div className="flex flex-col flex-1 min-h-0 bg-black text-white">
          <header className="px-5 py-4">
            <div className="offsuit-module px-4 py-3">
              <h1 className="text-[17px] font-semibold tracking-tight">Training stats</h1>
            </div>
          </header>
          <Suspense fallback={<ViewLoader />}>
            <StatsDashboard />
          </Suspense>
        </div>
      )}
      {view === 'review' && (
        <div className="flex flex-col flex-1 min-h-0 bg-black text-white">
          <header className="px-5 py-4">
            <div className="offsuit-module px-4 py-3">
              <h1 className="text-[17px] font-semibold tracking-tight">Hand review</h1>
            </div>
          </header>
          <Suspense fallback={<ViewLoader />}>
            <HandReview />
          </Suspense>
        </div>
      )}

      <nav className="flex items-stretch border-t border-white/5 bg-surface safe-area-bottom">
        {NAV_ITEMS.map((item) => {
          const active = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-[11px] touch-manipulation transition-colors ${
                active ? 'text-white' : 'text-offsuit-grey active:text-white'
              }`}
            >
              <span className={active ? 'text-white' : 'text-offsuit-grey'}>{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => updateSettings({
            theme: settings.theme === 'dark' ? 'light' : 'dark',
          })}
          className="px-3.5 py-2.5 text-offsuit-grey active:text-white touch-manipulation"
          aria-label="Toggle theme"
        >
          {settings.theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </nav>
    </div>
  );
}
