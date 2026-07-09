import type {
  Card,
  GameAction,
  GameConfig,
  GameState,
  HandSummary,
  Player,
  ShowdownResult,
  ActionType,
  Street,
  GamePhase,
} from '../types/poker';
import { createDeck, shuffleDeck, dealCards } from './deck';
import { evaluateHand } from './hand-evaluator';
import {
  getPositionForSeat,
  getActionOrder,
  getPostflopActionOrder,
  nextActivePlayer,
  countActivePlayers,
} from './positions';
import { getTotalPot, calculatePots } from './pot';
import { validateAction, isBettingRoundComplete } from './action-validator';
import { getAIDecision } from '../ai/decision-engine';
import { createAIProfiles, updateProfileAfterHand, type AIPlayerProfile } from '../ai/profiles';

const DEFAULT_CONFIG: GameConfig = {
  smallBlind: 1,
  bigBlind: 2,
  startingStackBB: 100,
  playerCount: 6,
};

const AI_NAMES = ['Alex', 'Blake', 'Casey', 'Drew', 'Ellis'];

export function createInitialPlayers(config: GameConfig): Player[] {
  const stack = config.startingStackBB * config.bigBlind;
  const players: Player[] = [
    {
      id: 0,
      name: 'You',
      position: 'BTN',
      stack,
      holeCards: [],
      isHero: true,
      isAI: false,
      folded: false,
      allIn: false,
      betThisStreet: 0,
      totalBetThisHand: 0,
    },
  ];

  for (let i = 0; i < config.playerCount - 1; i++) {
    players.push({
      id: i + 1,
      name: AI_NAMES[i] ?? `AI ${i + 1}`,
      position: 'UTG',
      stack,
      holeCards: [],
      isHero: false,
      isAI: true,
      folded: false,
      allIn: false,
      betThisStreet: 0,
      totalBetThisHand: 0,
    });
  }

  return players;
}

export function createGameState(config: Partial<GameConfig> = {}): GameState {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  return {
    handNumber: 0,
    phase: 'waiting',
    street: 'preflop',
    players: createInitialPlayers(fullConfig),
    board: [],
    pots: [{ amount: 0, eligiblePlayerIds: [] }],
    actions: [],
    dealerIndex: 0,
    currentPlayerIndex: 0,
    currentBet: 0,
    minRaise: fullConfig.bigBlind,
    lastAggressorIndex: null,
    config: fullConfig,
  };
}

export class GameEngine {
  private state: GameState;
  private deck: Card[] = [];
  private aiProfiles: AIPlayerProfile[] = [];
  private handStartStacks: Map<number, number> = new Map();

  constructor(config?: Partial<GameConfig>) {
    this.state = createGameState(config);
    this.initAIProfiles();
  }

  private initAIProfiles(): void {
    const aiPlayers = this.state.players
      .filter((p) => p.isAI)
      .map((p) => ({ id: p.id, name: p.name }));
    this.aiProfiles = createAIProfiles(aiPlayers);
  }

  getAIProfiles(): AIPlayerProfile[] {
    return this.aiProfiles;
  }

  getState(): GameState {
    return this.state;
  }

  startNewHand(): GameState {
    const { config, players: oldPlayers, dealerIndex } = this.state;
    const newDealer = (dealerIndex + 1) % config.playerCount;

    const players = oldPlayers.map((p, i) => ({
      ...p,
      position: getPositionForSeat(i, newDealer, config.playerCount),
      holeCards: [] as Card[],
      folded: false,
      allIn: false,
      betThisStreet: 0,
      totalBetThisHand: 0,
    }));

    this.deck = shuffleDeck(createDeck());

    // Deal hole cards
    for (const player of players) {
      const { dealt, remaining } = dealCards(this.deck, 2);
      player.holeCards = dealt;
      this.deck = remaining;
    }

    this.state = {
      ...this.state,
      handNumber: this.state.handNumber + 1,
      phase: 'preflop',
      street: 'preflop',
      players,
      board: [],
      pots: [{ amount: 0, eligiblePlayerIds: players.map((p) => p.id) }],
      actions: [],
      dealerIndex: newDealer,
      currentBet: config.bigBlind,
      minRaise: config.bigBlind,
      lastAggressorIndex: null,
    };

    this.postBlinds();
    this.setFirstActor();

    this.handStartStacks.clear();
    for (const p of this.state.players) {
      this.handStartStacks.set(p.id, p.stack + p.totalBetThisHand);
    }

    return this.state;
  }

  private postBlinds(): void {
    const { players, config, dealerIndex } = this.state;
    const sbIndex = (dealerIndex + 4) % config.playerCount;
    const bbIndex = (dealerIndex + 5) % config.playerCount;

    this.applyBet(players[sbIndex], config.smallBlind);
    this.applyBet(players[bbIndex], config.bigBlind);
  }

  private applyBet(player: Player, amount: number): void {
    const actual = Math.min(amount, player.stack);
    player.stack -= actual;
    player.betThisStreet += actual;
    player.totalBetThisHand += actual;
    if (player.stack === 0) player.allIn = true;
    this.updatePots();
  }

  private updatePots(): void {
    const totalBets = this.state.players.reduce((sum, p) => sum + p.totalBetThisHand, 0);
    this.state.pots = calculatePots(this.state.players);
    if (this.state.pots.length === 1) {
      this.state.pots[0].amount = totalBets;
    }
  }

  private setFirstActor(): void {
    const order = getActionOrder(this.state.dealerIndex, this.state.config.playerCount);
    for (const idx of order) {
      const player = this.state.players[idx];
      if (!player.folded && !player.allIn) {
        this.state.currentPlayerIndex = idx;
        return;
      }
    }
  }

  applyAction(playerId: number, action: ActionType, amount = 0): { success: boolean; error?: string } {
    const player = this.state.players[playerId];
    if (!player || player.folded || player.allIn) {
      return { success: false, error: 'Player cannot act' };
    }
    if (playerId !== this.state.currentPlayerIndex) {
      return { success: false, error: 'Not your turn' };
    }

    const validation = validateAction(this.state, player, action, amount);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const prevBet = player.betThisStreet;
    let actionAmount = 0;

    switch (action) {
      case 'fold':
        player.folded = true;
        break;

      case 'check':
        break;

      case 'call': {
        const toCall = this.state.currentBet - player.betThisStreet;
        actionAmount = Math.min(toCall, player.stack);
        this.applyBet(player, actionAmount);
        break;
      }

      case 'bet':
      case 'raise': {
        const targetTotal = amount;
        const toAdd = targetTotal - player.betThisStreet;
        actionAmount = toAdd;
        this.applyBet(player, toAdd);
        const raiseSize = targetTotal - this.state.currentBet;
        if (raiseSize > 0) {
          this.state.minRaise = Math.max(this.state.minRaise, raiseSize);
        }
        this.state.currentBet = targetTotal;
        this.state.lastAggressorIndex = playerId;
        break;
      }

      case 'all-in': {
        actionAmount = player.stack;
        const newTotal = player.betThisStreet + actionAmount;
        this.applyBet(player, actionAmount);
        if (newTotal > this.state.currentBet) {
          const raiseSize = newTotal - this.state.currentBet;
          this.state.minRaise = Math.max(this.state.minRaise, raiseSize);
          this.state.currentBet = newTotal;
          this.state.lastAggressorIndex = playerId;
        }
        break;
      }
    }

    const gameAction: GameAction = {
      playerId,
      action,
      amount: actionAmount,
      street: this.state.street,
      timestamp: Date.now(),
    };
    this.state.actions.push(gameAction);

    if (countActivePlayers(this.state.players) === 1) {
      this.awardPotToWinner();
      return { success: true };
    }

    if (this.isRoundComplete(playerId, prevBet)) {
      this.advanceStreet();
    } else {
      this.advanceToNextPlayer();
    }

    return { success: true };
  }

  private isRoundComplete(actingPlayerId: number, prevBet: number): boolean {
    const player = this.state.players[actingPlayerId];
    const wasAggression = player.betThisStreet > prevBet || this.state.actions.at(-1)?.action === 'raise';

    const activePlayers = this.state.players.filter((p) => !p.folded && !p.allIn);
    if (activePlayers.length === 0) return true;

    const allMatched = activePlayers.every((p) => p.betThisStreet === this.state.currentBet);

    if (!allMatched) return false;

    // If no aggression this street and everyone checked, round is done
    if (this.state.currentBet === 0 && this.state.lastAggressorIndex === null) {
      const actedThisStreet = this.state.actions.filter((a) => a.street === this.state.street);
      return actedThisStreet.length >= activePlayers.length;
    }

    // After a raise, action must return to last aggressor
    if (this.state.lastAggressorIndex !== null) {
      const aggressor = this.state.players[this.state.lastAggressorIndex];
      if (aggressor.folded || aggressor.allIn) return true;
      if (actingPlayerId === this.state.lastAggressorIndex) return true;
      if (!wasAggression && allMatched) {
        const nextIdx = nextActivePlayer(this.state.players, actingPlayerId);
        return nextIdx === this.state.lastAggressorIndex || nextIdx === null;
      }
    }

    return isBettingRoundComplete(this.state);
  }

  private advanceToNextPlayer(): void {
    const next = nextActivePlayer(this.state.players, this.state.currentPlayerIndex);
    if (next !== null) {
      this.state.currentPlayerIndex = next;
    }
  }

  private advanceStreet(): void {
    // Reset street bets
    for (const player of this.state.players) {
      player.betThisStreet = 0;
    }
    this.state.currentBet = 0;
    this.state.minRaise = this.state.config.bigBlind;
    this.state.lastAggressorIndex = null;

    const streetOrder: Street[] = ['preflop', 'flop', 'turn', 'river'];
    const currentIdx = streetOrder.indexOf(this.state.street);

    if (currentIdx === streetOrder.length - 1) {
      this.runShowdown();
      return;
    }

    const nextStreet = streetOrder[currentIdx + 1];
    this.state.street = nextStreet;
    this.state.phase = nextStreet as GamePhase;

    const cardsToDeal = nextStreet === 'flop' ? 3 : 1;
    const { dealt, remaining } = dealCards(this.deck, cardsToDeal);
    this.deck = remaining;
    this.state.board = [...this.state.board, ...dealt];

    const activePlayers = this.state.players.filter((p) => !p.folded && !p.allIn);
    if (activePlayers.length <= 1) {
      this.runShowdown();
      return;
    }

    const order = getPostflopActionOrder(this.state.dealerIndex, this.state.config.playerCount);
    for (const idx of order) {
      const player = this.state.players[idx];
      if (!player.folded && !player.allIn) {
        this.state.currentPlayerIndex = idx;
        return;
      }
    }
  }

  private runShowdown(): void {
    this.state.phase = 'showdown';
    const activePlayers = this.state.players.filter((p) => !p.folded);

    if (activePlayers.length === 1) {
      this.awardPotToWinner();
      return;
    }

    const results: { playerId: number; hand: ReturnType<typeof evaluateHand> }[] = [];
    for (const player of activePlayers) {
      results.push({
        playerId: player.id,
        hand: evaluateHand(player.holeCards, this.state.board),
      });
    }

    results.sort((a, b) => b.hand.rank - a.hand.rank);
    const bestRank = results[0].hand.rank;
    const winners = results.filter((r) => r.hand.rank === bestRank);

    const totalPot = getTotalPot(this.state.pots) ||
      this.state.players.reduce((sum, p) => sum + p.totalBetThisHand, 0);
    const share = Math.floor(totalPot / winners.length);

    for (const winner of winners) {
      const player = this.state.players[winner.playerId];
      player.stack += share;
    }

    this.state.phase = 'hand-complete';
  }

  private awardPotToWinner(): void {
    const winner = this.state.players.find((p) => !p.folded);
    if (!winner) return;

    const totalPot = this.state.players.reduce((sum, p) => sum + p.totalBetThisHand, 0);
    winner.stack += totalPot;
    this.state.phase = 'hand-complete';
  }

  getHandSummary(): HandSummary {
    const totalPot = this.state.players.reduce((sum, p) => sum + p.totalBetThisHand, 0);
    const activePlayers = this.state.players.filter((p) => !p.folded);

    if (activePlayers.length === 1) {
      const winner = activePlayers[0];
      return {
        winners: [{
          playerId: winner.id,
          handName: 'Winner',
          handRank: 0,
          cards: winner.holeCards,
          wonAmount: totalPot,
        }],
        board: this.state.board,
        handNumber: this.state.handNumber,
        totalPot,
        actions: [...this.state.actions],
      };
    }

    const results: ShowdownResult[] = [];
    for (const player of activePlayers) {
      const hand = this.state.board.length >= 3
        ? evaluateHand(player.holeCards, this.state.board)
        : null;

      results.push({
        playerId: player.id,
        handName: hand?.name ?? 'Winner',
        handRank: hand?.rank ?? 0,
        cards: player.holeCards,
        wonAmount: 0,
      });
    }

    results.sort((a, b) => b.handRank - a.handRank);
    const bestRank = results[0].handRank;
    const share = Math.floor(totalPot / results.filter((r) => r.handRank === bestRank).length);

    for (const result of results) {
      if (result.handRank === bestRank) {
        result.wonAmount = share;
      }
    }

    return {
      winners: results,
      board: this.state.board,
      handNumber: this.state.handNumber,
      totalPot,
      actions: [...this.state.actions],
    };
  }

  /** GTO-based AI with variance, stack awareness, and tilt */
  getAIDecision(playerId: number): { action: ActionType; amount?: number } {
    const player = this.state.players[playerId];
    const profile = this.aiProfiles.find((p) => p.playerId === playerId);
    if (!profile) {
      const toCall = this.state.currentBet - player.betThisStreet;
      if (toCall === 0) return { action: 'check' };
      if (toCall <= player.stack && Math.random() > 0.3) return { action: 'call' };
      return { action: 'fold' };
    }
    return getAIDecision(this.state, player, profile);
  }

  finalizeHand(): void {
    for (const profile of this.aiProfiles) {
      const player = this.state.players.find((p) => p.id === profile.playerId);
      if (!player) continue;
      const start = this.handStartStacks.get(player.id) ?? player.stack;
      const change = player.stack - start;
      const idx = this.aiProfiles.findIndex((p) => p.playerId === profile.playerId);
      this.aiProfiles[idx] = updateProfileAfterHand(profile, change);
    }
  }

  processAITurn(): void {
    const player = this.state.players[this.state.currentPlayerIndex];
    if (!player?.isAI || player.folded || player.allIn) return;

    const decision = this.getAIDecision(player.id);
    this.applyAction(player.id, decision.action, decision.amount);
  }
}
