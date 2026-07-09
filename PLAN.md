# Poker Trainer — Development Plan

## Vision

An offline-first mobile web app that trains optimal Texas Hold'em decision-making through GTO-based feedback and human-like AI opponents. Training focus is decision quality, not chip accumulation.

## Success Criteria

- [x] Game runs 100% offline (no API calls during play)
- [x] AI opponents feel human-like despite GTO optimality
- [x] Post-hand feedback teaches a clear lesson
- [x] Works on mobile browsers (iOS/Android)
- [x] Hand history is persistent and searchable
- [x] Bundle size < 10MB
- [x] No loading spinners during gameplay (pre-cached assets)

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 + TypeScript (strict) |
| Build | Vite |
| Styling | TailwindCSS (mobile-first) |
| State | Zustand |
| Hand history | IndexedDB |
| Settings | localStorage |
| Cards | SVG |
| Stats charts | Recharts (lazy-loaded) |
| EV simulation | Web Worker (Monte Carlo) |
| Hand evaluation | Custom ranker |
| Hosting | Vercel / Netlify + PWA manifest |

---

## Development Phases

### Phase 1: Core Game Engine ✓

- [x] Project scaffold, deck, hand evaluation, pot tracking
- [x] 6-max positions, street flow, action validation
- [x] Unit tests

### Phase 2: UI & Game Table ✓

- [x] Oval felt table, SVG cards, chip stacks
- [x] Action buttons with presets, hand history panel
- [x] Animations, action log, mobile layout

### Phase 3: Rule-Based AI ✓

- [x] GTO range JSON (`public/gto-ranges/6max-preflop.json`)
- [x] Range expansion utility (`src/utils/range-expansion.ts`)
- [x] AI decision engine with 8% variance
- [x] Stack-aware tightening/loosening
- [x] Tilt simulation via `AIPlayerProfile`

### Phase 4a: EV Analysis ✓

- [x] Monte Carlo Web Worker (`src/feedback/ev-simulator.worker.ts`)
- [x] Multi-way pot equity (2000 sims per decision)
- [x] EV ranking of fold/call/bet alternatives

### Phase 4b: GTO & Opponent Modeling ✓

- [x] Situation hashing (`src/utils/situation-hash.ts`)
- [x] GTO alignment scorer (`src/feedback/gto-lookup.ts`)
- [x] Position analysis (`src/feedback/position-analysis.ts`)
- [x] Opponent tracker — 30-hand window (`src/feedback/opponent-tracker.ts`)
- [x] 4-layer feedback UI (`src/components/FeedbackPanel.tsx`)

### Phase 5: Hand History & Stats ✓

- [x] IndexedDB CRUD + archival after 1000 hands
- [x] Stats dashboard with Recharts (win rate, profit, position)
- [x] Hand review / replay UI with search

### Phase 6: Polish & Mobile ✓

- [x] Lazy-load GTO JSON + embedded fallback ranges
- [x] PWA manifest + service worker (`public/sw.js`)
- [x] Dark/light theme toggle
- [x] Code-split recharts (~18KB main bundle gzipped)

### Phase 7: Future

- React Native wrapper
- Firebase Firestore sync (online only)
- Postflop GTO tables expansion

---

## Architecture

```
src/
├── ai/           profiles, range-lookup, decision-engine
├── components/   Table, Cards, Feedback, Stats, Review, AppShell
├── engine/       Core poker logic
├── feedback/     EV worker, GTO, position, opponent, feedback-engine
├── storage/      IndexedDB, settings
├── store/        Zustand game store
├── types/        Shared TypeScript types
└── utils/        hand-notation, range-expansion, situation-hash
```

---

## Running

```bash
npm run dev      # Development server
npm test         # Unit tests (14 tests)
npm run build    # Production build
npm run preview  # Preview production build
```
