import { lazy, Suspense, useEffect } from 'react';
import { useGameStore } from '../store/game-store';
import { PokerTable } from './PokerTable';

const StatsDashboard = lazy(() =>
  import('./StatsDashboard').then((m) => ({ default: m.StatsDashboard })),
);
const HandReview = lazy(() =>
  import('./HandReview').then((m) => ({ default: m.HandReview })),
);

const NAV_ITEMS = [
  { id: 'play' as const, label: 'Play', icon: '♠' },
  { id: 'stats' as const, label: 'Stats', icon: '📊' },
  { id: 'review' as const, label: 'Review', icon: '📋' },
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
      {view === 'play' && <PokerTable />}
      {view === 'stats' && (
        <div className="flex flex-col flex-1 min-h-0 bg-black text-white">
          <header className="px-5 py-4 border-b border-white/5">
            <h1 className="text-[17px] font-semibold tracking-tight">Training stats</h1>
          </header>
          <Suspense fallback={<ViewLoader />}>
            <StatsDashboard />
          </Suspense>
        </div>
      )}
      {view === 'review' && (
        <div className="flex flex-col flex-1 min-h-0 bg-black text-white">
          <header className="px-5 py-4 border-b border-white/5">
            <h1 className="text-[17px] font-semibold tracking-tight">Hand review</h1>
          </header>
          <Suspense fallback={<ViewLoader />}>
            <HandReview />
          </Suspense>
        </div>
      )}

      <nav className="flex border-t border-white/5 bg-black/95 backdrop-blur-sm safe-area-bottom">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-xs touch-manipulation transition-colors ${
              view === item.id
                ? 'text-white'
                : 'text-offsuit-muted active:text-offsuit-grey'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
        <button
          onClick={() => updateSettings({
            theme: settings.theme === 'dark' ? 'light' : 'dark',
          })}
          className="px-3 py-3 text-offsuit-muted active:text-offsuit-grey touch-manipulation"
          aria-label="Toggle theme"
        >
          {settings.theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </nav>
    </div>
  );
}
