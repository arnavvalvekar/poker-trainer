export const TIMING = {
  aiThink: 700,
  aiThinkVariance: 250,
  heroAction: 350,
  streetPause: 900,
  cardDeal: 380,
  cardFlopStagger: 220,
  actionBanner: 1200,
  handStart: 600,
} as const;

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomDelay(base: number, variance: number): Promise<void> {
  return delay(base + Math.random() * variance);
}
