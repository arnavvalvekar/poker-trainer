import type { GTORanges } from './profiles';

const FALLBACK_RANGES: GTORanges = {
  preflop: {
    UTG_open: { hands: ['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AQs', 'AKo', 'AQo'] },
    HJ_open: { hands: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', 'AKs', 'AQs', 'AJs', 'KQs', 'AKo', 'AQo'] },
    CO_open: { hands: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', 'AKs', 'AQs', 'AJs', 'ATs', 'KQs', 'KJs', 'QJs', 'AKo', 'AQo', 'AJo'] },
    BTN_open: { hands: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', 'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'KQs', 'KJs', 'KTs', 'QJs', 'QTs', 'JTs', 'AKo', 'AQo', 'AJo', 'KQo'] },
    SB_open: { hands: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', 'AKs', 'AQs', 'AJs', 'KQs', 'AKo', 'AQo'] },
    BB_vs_open: { hands: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', 'AKs', 'AQs', 'AJs', 'KQs', 'AKo', 'AQo'], actions: { default: { fold: 0.4, call: 0.45, raise: 0.15 } } },
    BB_vs_3bet: { hands: ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AQs', 'AKo'] },
    CO_3bet: { hands: ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AQs', 'AKo'] },
    BTN_3bet: { hands: ['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AQs', 'AKo'] },
    SB_3bet: { hands: ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AQs', 'AKo'] },
    BB_3bet: { hands: ['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AQs', 'AKo'] },
    BTN_vs_3bet: { hands: ['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AQs', 'AKo'] },
  },
  postflop: {
    default_cbet: { hands: [], actions: { default: { fold: 0.3, call: 0.35, raise: 0.35 } } },
    default_call: { hands: [], actions: { default: { fold: 0.4, call: 0.45, raise: 0.15 } } },
  },
};

let cachedRanges: GTORanges = FALLBACK_RANGES;
let loadPromise: Promise<GTORanges> | null = null;

export async function loadGTORanges(): Promise<GTORanges> {
  if (loadPromise) return loadPromise;

  loadPromise = fetch('/gto-ranges/6max-preflop.json')
    .then((res) => res.json())
    .then((data: GTORanges) => {
      cachedRanges = data;
      return data;
    })
    .catch(() => cachedRanges);

  return loadPromise;
}

export function getGTORangesSync(): GTORanges {
  return cachedRanges;
}

export function getScenario(key: string): GTORanges['preflop'][string] | null {
  return cachedRanges.preflop[key] ?? cachedRanges.postflop[key] ?? null;
}

export function preloadGTORanges(): void {
  loadGTORanges().catch(() => {});
}
