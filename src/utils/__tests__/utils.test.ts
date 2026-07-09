import { describe, it, expect } from 'vitest';
import { expandRange, isHandInRange } from '../../utils/range-expansion';
import { cardsToHandNotation, handStrengthRank } from '../../utils/hand-notation';
import { situationHash } from '../../utils/situation-hash';

describe('range-expansion', () => {
  it('expands pair range AA-TT', () => {
    const range = expandRange('AA-TT');
    expect(range).toContain('AA');
    expect(range).toContain('KK');
    expect(range).toContain('TT');
    expect(range).not.toContain('99');
  });

  it('checks hand in range', () => {
    const range = expandRange('AA,KK,AKs');
    expect(isHandInRange('AKs', range)).toBe(true);
    expect(isHandInRange('72o', range)).toBe(false);
  });
});

describe('hand-notation', () => {
  it('converts suited cards', () => {
    expect(cardsToHandNotation(['As', 'Ks'])).toBe('AKs');
  });

  it('converts offsuit cards', () => {
    expect(cardsToHandNotation(['Ah', 'Kd'])).toBe('AKo');
  });

  it('ranks AA as 1', () => {
    expect(handStrengthRank('AA')).toBe(1);
  });
});

describe('situation-hash', () => {
  it('generates consistent hash', () => {
    const hash = situationHash({
      position: 'BTN',
      street: 'preflop',
      stackDepth: 50,
      handNotation: 'AKo',
    });
    expect(hash).toBe('BTN_preflop_50BB_AKo');
  });
});
