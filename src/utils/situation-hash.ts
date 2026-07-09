import type { Position, Street } from '../types/poker';

export function situationHash(params: {
  position: Position;
  street: Street;
  stackDepth: number;
  handNotation: string;
  boardTexture?: string;
}): string {
  const depth = Math.round(params.stackDepth);
  const texture = params.boardTexture ? `_${params.boardTexture}` : '';
  return `${params.position}_${params.street}_${depth}BB_${params.handNotation}${texture}`;
}

export function getBoardTexture(board: string[]): string {
  if (board.length < 3) return 'dry';
  const ranks = board.map((c) => c[0]);
  const unique = new Set(ranks);
  if (unique.size < ranks.length) return 'paired';
  const values = ranks.map((r) => {
    const map: Record<string, number> = { A: 14, K: 13, Q: 12, J: 11, T: 10 };
    return map[r] ?? parseInt(r, 10);
  }).sort((a, b) => a - b);
  if (values[values.length - 1] - values[0] <= 4) return 'connected';
  return 'dry';
}

export function stackDepthBB(stack: number, bigBlind: number): number {
  return Math.round(stack / bigBlind);
}
