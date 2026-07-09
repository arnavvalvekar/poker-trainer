export interface GTOScenario {
  hands: string[];
  frequencies?: Record<string, number>;
  actions?: Record<string, { fold?: number; call?: number; raise?: number }>;
}

export interface GTORanges {
  preflop: Record<string, GTOScenario>;
  postflop: Record<string, GTOScenario>;
}

export interface AIPlayerProfile {
  playerId: number;
  name: string;
  tightness: number;
  aggression: number;
  tiltFactor: number;
  recentResults: number[];
}

export function createAIProfiles(playerIds: { id: number; name: string }[]): AIPlayerProfile[] {
  return playerIds.map((p, i) => ({
    playerId: p.id,
    name: p.name,
    tightness: 0.9 + (i % 3) * 0.1,
    aggression: 0.8 + (i % 2) * 0.2,
    tiltFactor: 0,
    recentResults: [],
  }));
}

export function updateProfileAfterHand(
  profile: AIPlayerProfile,
  stackChange: number,
): AIPlayerProfile {
  const results = [stackChange, ...profile.recentResults].slice(0, 10);
  const recentLoss = results.filter((r) => r < -20).length;
  const tiltFactor = recentLoss >= 2 ? 0.15 : recentLoss >= 1 ? 0.08 : 0;

  return { ...profile, recentResults: results, tiltFactor };
}
