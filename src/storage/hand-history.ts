import type { HandHistoryEntry } from '../types/poker';
import type { DecisionFeedback } from '../feedback/feedback-engine';
import {
  archiveOldHands,
  getAllHands,
  saveHand,
  searchHands,
  type StoredHand,
} from './db';

export function createHandId(): string {
  return crypto.randomUUID();
}

export async function persistHand(
  entry: HandHistoryEntry,
  feedback: DecisionFeedback[],
): Promise<StoredHand> {
  const stored: StoredHand = {
    ...entry,
    handId: createHandId(),
    feedback,
  };

  await saveHand(stored);
  await archiveOldHands();
  return stored;
}

export async function loadHandHistory(): Promise<StoredHand[]> {
  return getAllHands();
}

export async function findHands(query: string): Promise<StoredHand[]> {
  return searchHands(query);
}

export type { StoredHand };
