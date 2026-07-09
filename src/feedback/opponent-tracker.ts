import type { ActionType, GameAction, Player } from '../types/poker';

export interface OpponentProfile {
  playerId: number;
  name: string;
  vpip: number;
  pfr: number;
  threebet: number;
  cbet: number;
  aggression: number;
  handsSeen: number;
}

interface ActionRecord {
  playerId: number;
  street: string;
  action: ActionType;
  voluntarilyPut: boolean;
  raised: boolean;
  threeBet: boolean;
  continuationBet: boolean;
}

const MAX_HANDS = 30;

export class OpponentTracker {
  private records: Map<number, ActionRecord[]> = new Map();
  private profiles: Map<number, OpponentProfile> = new Map();

  initPlayer(player: Player): void {
    if (!this.profiles.has(player.id)) {
      this.profiles.set(player.id, {
        playerId: player.id,
        name: player.name,
        vpip: 0,
        pfr: 0,
        threebet: 0,
        cbet: 0,
        aggression: 0,
        handsSeen: 0,
      });
      this.records.set(player.id, []);
    }
  }

  processHand(actions: GameAction[], players: Player[]): void {
    for (const player of players) {
      if (player.isHero) continue;
      this.initPlayer(player);
    }

    const preflopRaises = actions.filter(
      (a) => a.street === 'preflop' && (a.action === 'raise' || a.action === 'bet'),
    );
    const firstRaiser = preflopRaises[0]?.playerId;
    const threeBettors = new Set(
      preflopRaises.slice(1).map((a) => a.playerId),
    );

    for (const player of players) {
      if (player.isHero) continue;

      const playerActions = actions.filter((a) => a.playerId === player.id);
      const preflopActions = playerActions.filter((a) => a.street === 'preflop');
      const voluntarilyPut = preflopActions.some(
        (a) => a.action === 'call' || a.action === 'raise' || a.action === 'bet',
      );
      const raised = preflopActions.some(
        (a) => a.action === 'raise' || a.action === 'bet',
      );
      const threeBet = threeBettors.has(player.id);
      const cbet = actions.some(
        (a) => a.playerId === player.id && a.street === 'flop' &&
          (a.action === 'bet' || a.action === 'raise') && a.playerId === firstRaiser,
      );

      const recs = this.records.get(player.id) ?? [];
      recs.push({
        playerId: player.id,
        street: 'preflop',
        action: preflopActions[preflopActions.length - 1]?.action ?? 'fold',
        voluntarilyPut,
        raised,
        threeBet,
        continuationBet: cbet,
      });

      this.records.set(player.id, recs.slice(-MAX_HANDS * 5));
      this.recomputeProfile(player.id);
    }
  }

  private recomputeProfile(playerId: number): void {
    const recs = this.records.get(playerId) ?? [];
    const profile = this.profiles.get(playerId);
    if (!profile || recs.length === 0) return;

    const hands = Math.max(1, Math.ceil(recs.length / 3));
    const vpipCount = recs.filter((r) => r.voluntarilyPut).length;
    const pfrCount = recs.filter((r) => r.raised).length;
    const threeBetCount = recs.filter((r) => r.threeBet).length;
    const cbetCount = recs.filter((r) => r.continuationBet).length;
    const aggressive = recs.filter(
      (r) => r.action === 'bet' || r.action === 'raise',
    ).length;
    const passive = recs.filter(
      (r) => r.action === 'call' || r.action === 'check',
    ).length;

    profile.vpip = vpipCount / recs.length;
    profile.pfr = pfrCount / recs.length;
    profile.threebet = threeBetCount / Math.max(1, recs.length);
    profile.cbet = cbetCount / Math.max(1, pfrCount);
    profile.aggression = passive > 0 ? aggressive / passive : aggressive;
    profile.handsSeen = hands;
    this.profiles.set(playerId, profile);
  }

  getProfile(playerId: number): OpponentProfile | null {
    return this.profiles.get(playerId) ?? null;
  }

  getPrimaryVillain(players: Player[]): OpponentProfile | null {
    const villains = players.filter((p) => !p.isHero && !p.folded);
    if (villains.length === 0) {
      const ai = players.find((p) => !p.isHero);
      return ai ? this.getProfile(ai.id) : null;
    }
    return this.getProfile(villains[0].id);
  }

  getAllProfiles(): OpponentProfile[] {
    return [...this.profiles.values()];
  }

  getExploitMessage(profile: OpponentProfile): string {
    if (profile.handsSeen < 3) {
      return 'Not enough data on this opponent yet.';
    }
    if (profile.vpip < 0.18) {
      return `Tight opponent (VPIP ${Math.round(profile.vpip * 100)}%). Steal more, fold to their raises.`;
    }
    if (profile.vpip > 0.35) {
      return `Loose opponent (VPIP ${Math.round(profile.vpip * 100)}%). Value bet wider, trap with strong hands.`;
    }
    if (profile.cbet > 0.7) {
      return `High c-bet (${Math.round(profile.cbet * 100)}%). Float and raise flops more often.`;
    }
    if (profile.aggression > 1.5) {
      return `Aggressive (AI ${profile.aggression.toFixed(1)}). Call down lighter, avoid bluffing.`;
    }
    return `Balanced opponent (VPIP ${Math.round(profile.vpip * 100)}%, 3-bet ${Math.round(profile.threebet * 100)}%).`;
  }
}

export const opponentTracker = new OpponentTracker();
