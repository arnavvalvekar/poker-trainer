import { create } from 'zustand';
import { GameEngine } from '../engine/game-engine';
import { loadGTORanges } from '../ai/range-lookup';
import { analyzeHandDecisions, type DecisionFeedback } from '../feedback/feedback-engine';
import { opponentTracker } from '../feedback/opponent-tracker';
import { persistHand, loadHandHistory, type StoredHand } from '../storage/hand-history';
import { loadSettings, saveSettings, type AppSettings } from '../storage/settings';
import { describeAction } from '../utils/action-describe';
import { delay, randomDelay, TIMING } from '../utils/timing';
import type { ActionType, GameState, HandHistoryEntry, HandSummary, SessionStats } from '../types/poker';

export type AppView = 'play' | 'stats' | 'review';

interface GameStore {
  engine: GameEngine;
  state: GameState;
  lastSummary: HandSummary | null;
  handHistory: HandHistoryEntry[];
  storedHands: StoredHand[];
  lastFeedback: DecisionFeedback[];
  heroStartStack: number;
  showHistory: boolean;
  message: string;
  view: AppView;
  settings: AppSettings;
  isAnalyzing: boolean;
  isAnimating: boolean;
  actionBanner: string | null;
  visibleBoardCount: number;
  reviewHandId: string | null;
  gtoLoaded: boolean;

  init: () => Promise<void>;
  startHand: () => Promise<void>;
  playerAction: (action: ActionType, amount?: number) => Promise<void>;
  processAI: () => Promise<void>;
  toggleHistory: () => void;
  selectHistoryHand: (handNumber: number) => void;
  setView: (view: AppView) => void;
  setReviewHand: (handId: string | null) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  getStats: () => SessionStats;
}

const engine = new GameEngine();
let processingLock = false;

function buildHistoryEntry(
  state: GameState,
  summary: HandSummary,
  heroStartStack: number,
): HandHistoryEntry {
  const hero = state.players.find((p) => p.isHero)!;
  const stackChange = hero.stack - heroStartStack;
  const topWinner = [...summary.winners].sort((a, b) => b.handRank - a.handRank)[0];
  const winnerPlayer = state.players.find((p) => p.id === topWinner?.playerId);

  let result: HandHistoryEntry['result'] = 'loss';
  if (stackChange > 0) result = 'win';
  else if (stackChange === 0) result = 'split';

  return {
    handNumber: summary.handNumber,
    timestamp: Date.now(),
    heroCards: [...hero.holeCards],
    board: [...summary.board],
    result,
    stackChange,
    winnerName: winnerPlayer?.name ?? 'Unknown',
    winningHand: topWinner?.handName ?? '',
    totalPot: summary.totalPot,
    actions: summary.actions,
    heroPosition: hero.position,
  };
}

async function revealBoard(
  set: (partial: Partial<GameStore>) => void,
  get: () => GameStore,
  targetLength: number,
): Promise<void> {
  const start = get().visibleBoardCount;
  const stagger = targetLength - start === 3 ? TIMING.cardFlopStagger : TIMING.cardDeal;

  for (let i = start; i < targetLength; i++) {
    await delay(stagger);
    set({ visibleBoardCount: i + 1 });
  }
}

async function finishHand(set: (partial: Partial<GameStore>) => void, get: () => GameStore): Promise<void> {
  engine.finalizeHand();
  const summary = engine.getHandSummary();
  const { state, heroStartStack } = get();
  const entry = buildHistoryEntry(state, summary, heroStartStack);

  opponentTracker.processHand(summary.actions, state.players);

  set({ isAnimating: true, actionBanner: null, message: 'Reviewing your plays...', isAnalyzing: true });
  await delay(500);

  let feedback: DecisionFeedback[] = [];
  try {
    feedback = await analyzeHandDecisions(state);
  } catch {
    feedback = [];
  }

  let stored: StoredHand | null = null;
  try {
    stored = await persistHand(entry, feedback);
  } catch {
    // IndexedDB unavailable
  }

  const storedHands = stored
    ? [stored, ...get().storedHands]
    : get().storedHands;

  set({
    state: engine.getState(),
    lastSummary: summary,
    lastFeedback: feedback,
    handHistory: [entry, ...get().handHistory].slice(0, 50),
    storedHands,
    isAnalyzing: false,
    isAnimating: false,
    message: entry.result === 'win'
      ? `You won ${entry.stackChange > 0 ? `$${entry.stackChange}` : 'the pot'}!`
      : entry.result === 'loss'
        ? `You lost $${Math.abs(entry.stackChange)}`
        : 'Split pot — hand complete',
  });
}

function computeStats(storedHands: StoredHand[]): SessionStats {
  const positionalStats: SessionStats['positionalStats'] = {
    UTG: { hands: 0, profit: 0 },
    HJ: { hands: 0, profit: 0 },
    CO: { hands: 0, profit: 0 },
    BTN: { hands: 0, profit: 0 },
    SB: { hands: 0, profit: 0 },
    BB: { hands: 0, profit: 0 },
  };

  let wins = 0;
  let losses = 0;
  let splits = 0;
  let totalProfit = 0;
  let accuracySum = 0;
  let accuracyCount = 0;

  for (const hand of storedHands) {
    if (hand.result === 'win') wins++;
    else if (hand.result === 'loss') losses++;
    else splits++;
    totalProfit += hand.stackChange;

    if (hand.heroPosition) {
      positionalStats[hand.heroPosition].hands++;
      positionalStats[hand.heroPosition].profit += hand.stackChange;
    }

    for (const fb of hand.feedback) {
      accuracySum += fb.gto.alignment;
      accuracyCount++;
    }
  }

  const handsPlayed = storedHands.length;
  return {
    handsPlayed,
    wins,
    losses,
    splits,
    totalProfit,
    winRate: handsPlayed > 0 ? wins / handsPlayed : 0,
    avgDecisionAccuracy: accuracyCount > 0 ? accuracySum / accuracyCount : 0,
    positionalStats,
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  engine,
  state: engine.getState(),
  lastSummary: null,
  handHistory: [],
  storedHands: [],
  lastFeedback: [],
  heroStartStack: 0,
  showHistory: false,
  message: 'Press "Deal Hand" to start training.',
  view: 'play',
  settings: loadSettings(),
  isAnalyzing: false,
  isAnimating: false,
  actionBanner: null,
  visibleBoardCount: 0,
  reviewHandId: null,
  gtoLoaded: false,

  init: async () => {
    try {
      await loadGTORanges();
      const storedHands = await loadHandHistory();
      set({
        storedHands,
        handHistory: storedHands.map((h) => h),
        gtoLoaded: true,
      });
    } catch {
      set({ gtoLoaded: true });
    }
  },

  startHand: async () => {
    if (processingLock) return;
    processingLock = true;

    set({
      isAnimating: true,
      visibleBoardCount: 0,
      actionBanner: 'Dealing cards...',
      lastSummary: null,
      lastFeedback: [],
    });

    await delay(TIMING.handStart);

    const newState = engine.startNewHand();
    const hero = newState.players.find((p) => p.isHero)!;

    set({
      state: newState,
      heroStartStack: hero.stack + hero.totalBetThisHand,
      actionBanner: null,
      message: `Hand #${newState.handNumber}`,
    });

    await delay(TIMING.cardDeal * 2);
    processingLock = false;
    await get().processAI();
  },

  playerAction: async (action, amount = 0) => {
    if (processingLock || get().isAnimating) return;
    processingLock = true;

    const hero = get().state.players.find((p) => p.isHero);
    if (!hero) {
      processingLock = false;
      return;
    }

    const prevBoardLen = get().state.board.length;
    const prevStreet = get().state.street;

    const result = engine.applyAction(hero.id, action, amount);
    if (!result.success) {
      set({ message: result.error ?? 'Invalid action' });
      processingLock = false;
      return;
    }

    const state = engine.getState();
    const banner = describeAction('You', action, amount);

    set({
      state,
      actionBanner: banner,
      isAnimating: true,
      message: banner,
    });

    await delay(TIMING.heroAction);
    set({ actionBanner: null });

    if (state.board.length > prevBoardLen) {
      await revealBoard(set, get, state.board.length);
      await delay(TIMING.streetPause);
    } else if (state.street !== prevStreet) {
      await delay(TIMING.streetPause);
    }

    if (state.phase === 'hand-complete') {
      processingLock = false;
      await finishHand(set, get);
      return;
    }

    processingLock = false;
    await get().processAI();
  },

  processAI: async () => {
    if (processingLock) return;
    processingLock = true;
    set({ isAnimating: true });

    let prevBoardLen = get().state.board.length;
    let prevStreet = get().state.street;
    let safety = 100;

    while (safety-- > 0) {
      let state = engine.getState();

      if (state.phase === 'hand-complete' || state.phase === 'showdown') {
        processingLock = false;
        await finishHand(set, get);
        return;
      }

      const current = state.players[state.currentPlayerIndex];
      if (!current?.isAI) {
        set({ isAnimating: false });
        processingLock = false;
        return;
      }

      await randomDelay(TIMING.aiThink, TIMING.aiThinkVariance);

      const decision = engine.getAIDecision(current.id);
      set({
        actionBanner: describeAction(current.name, decision.action, decision.amount ?? 0),
      });

      await delay(280);

      engine.processAITurn();
      state = engine.getState();

      const lastAction = state.actions[state.actions.length - 1];
      if (lastAction) {
        set({
          state,
          actionBanner: describeAction(current.name, lastAction.action, lastAction.amount),
          message: describeAction(current.name, lastAction.action, lastAction.amount),
        });
      } else {
        set({ state });
      }

      await delay(400);
      set({ actionBanner: null });

      if (state.board.length > prevBoardLen) {
        const streetNames: Record<string, string> = {
          flop: 'The flop',
          turn: 'The turn',
          river: 'The river',
        };
        if (state.street !== prevStreet) {
          set({ actionBanner: streetNames[state.street] ?? 'New cards' });
          await delay(500);
          set({ actionBanner: null });
        }
        await revealBoard(set, get, state.board.length);
        prevBoardLen = state.board.length;
        prevStreet = state.street;
        await delay(TIMING.streetPause);
      }

      if (state.phase === 'hand-complete') {
        processingLock = false;
        await finishHand(set, get);
        return;
      }
    }

    set({ isAnimating: false });
    processingLock = false;
  },

  toggleHistory: () => set({ showHistory: !get().showHistory }),

  selectHistoryHand: (handNumber) => {
    const stored = get().storedHands.find((h) => h.handNumber === handNumber);
    const entry = stored ?? get().handHistory.find((h) => h.handNumber === handNumber);
    if (!entry) return;

    set({
      message: `Reviewing hand #${handNumber}`,
      visibleBoardCount: entry.board.length,
      lastSummary: {
        handNumber: entry.handNumber,
        board: entry.board,
        totalPot: entry.totalPot,
        actions: entry.actions,
        winners: [{
          playerId: 0,
          handName: entry.winningHand,
          handRank: 0,
          cards: entry.heroCards,
          wonAmount: entry.totalPot,
        }],
      },
      lastFeedback: stored?.feedback ?? [],
      reviewHandId: stored?.handId ?? null,
    });
  },

  setView: (view) => set({ view }),

  setReviewHand: (handId) => {
    const stored = get().storedHands.find((h) => h.handId === handId);
    if (stored) {
      get().selectHistoryHand(stored.handNumber);
    }
    set({ reviewHandId: handId, view: handId ? 'review' : get().view });
  },

  updateSettings: (partial) => {
    const settings = saveSettings(partial);
    set({ settings });
  },

  getStats: () => computeStats(get().storedHands),
}));
