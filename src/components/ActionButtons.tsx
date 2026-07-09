import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/game-store';
import { getValidActions } from '../engine/action-validator';
import { getTotalPot } from '../engine/pot';
import { BetSlider } from './BetSlider';

function computeDefaultBet(
  canBet: boolean,
  bigBlind: number,
  minAmount: number,
  maxAmount: number,
  currentBet: number,
  minRaise: number,
): number {
  const defaultBet = canBet
    ? Math.min(bigBlind * 3, maxAmount)
    : Math.min(currentBet + minRaise, maxAmount);
  return Math.max(minAmount, defaultBet);
}

function ChevronUpIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      aria-hidden
    >
      <path
        d="M4.5 11.25L9 6.75L13.5 11.25"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ActionButtons() {
  const { state, playerAction } = useGameStore();
  const hero = state.players.find((p) => p.isHero);
  const valid = hero ? getValidActions(state, hero) : null;

  const pot = getTotalPot(state.pots) ||
    state.players.reduce((sum, p) => sum + p.totalBetThisHand, 0);
  const toCall = hero ? state.currentBet - hero.betThisStreet : 0;
  const minAmount = valid ? (valid.canBet ? valid.minBet : valid.minRaise) : 0;
  const maxAmount = valid?.maxBet ?? 0;
  const step = state.config.bigBlind;

  const spotKey = `${state.street}-${state.currentBet}-${state.currentPlayerIndex}`;

  const [betAmount, setBetAmount] = useState(() =>
    computeDefaultBet(
      valid?.canBet ?? false,
      state.config.bigBlind,
      minAmount,
      maxAmount,
      state.currentBet,
      state.minRaise,
    ),
  );

  const [betPanelOpen, setBetPanelOpen] = useState(false);

  const prevSpotRef = useRef(spotKey);
  const canBet = valid?.canBet ?? false;

  useEffect(() => {
    if (prevSpotRef.current === spotKey) return;
    prevSpotRef.current = spotKey;
    setBetPanelOpen(false);
    setBetAmount(
      computeDefaultBet(
        canBet,
        state.config.bigBlind,
        minAmount,
        maxAmount,
        state.currentBet,
        state.minRaise,
      ),
    );
  }, [spotKey, canBet, minAmount, maxAmount, state.config.bigBlind, state.currentBet, state.minRaise]);

  if (!hero || !valid) return null;

  const presets = [
    { label: 'Min', value: minAmount },
    { label: '½ pot', value: Math.max(minAmount, Math.floor(pot * 0.5 + toCall)) },
    { label: 'Pot', value: Math.max(minAmount, pot + toCall) },
    { label: '2×', value: Math.max(minAmount, state.config.bigBlind * 6) },
  ].filter((p) => p.value <= maxAmount && p.value >= minAmount);

  const uniquePresets = presets.filter(
    (p, i, arr) => arr.findIndex((x) => x.value === p.value) === i,
  );

  const clampedBet = Math.min(maxAmount, Math.max(minAmount, betAmount));
  const canWager = valid.canBet || valid.canRaise;
  const wagerLabel = valid.canBet ? 'Bet' : 'Raise';

  return (
    <div className="space-y-3 animate-slide-up">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {valid.canFold && (
          <button
            type="button"
            onClick={() => playerAction('fold')}
            className="offsuit-pill-ghost"
          >
            Fold
          </button>
        )}
        {valid.canCheck && (
          <button
            type="button"
            onClick={() => playerAction('check')}
            className="offsuit-pill"
          >
            Check
          </button>
        )}
        {valid.canCall && (
          <button
            type="button"
            onClick={() => playerAction('call')}
            className="offsuit-pill"
          >
            Call {valid.callAmount}
          </button>
        )}
        {canWager && (
          <>
            <button
              type="button"
              onClick={() => playerAction(valid.canBet ? 'bet' : 'raise', clampedBet)}
              className="offsuit-pill"
            >
              {wagerLabel} {clampedBet}
            </button>
            <button
              type="button"
              onClick={() => setBetPanelOpen((open) => !open)}
              className={`offsuit-circle ${betPanelOpen ? 'ring-2 ring-white/25' : ''}`}
              aria-label="Adjust bet size"
              aria-expanded={betPanelOpen}
            >
              <ChevronUpIcon open={betPanelOpen} />
            </button>
          </>
        )}
      </div>

      {canWager && betPanelOpen && (
        <div className="offsuit-module p-4 space-y-3 animate-expand-down">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {uniquePresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setBetAmount(preset.value)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap touch-manipulation transition-all ${
                  clampedBet === preset.value
                    ? 'bg-white text-black'
                    : 'bg-surface-raised text-offsuit-grey active:bg-surface-overlay'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <BetSlider
            min={minAmount}
            max={maxAmount}
            value={clampedBet}
            step={step}
            onChange={setBetAmount}
            label={valid.canBet ? 'Bet size' : 'Raise to'}
          />

          <button
            type="button"
            onClick={() => playerAction('all-in')}
            className="w-full offsuit-pill !bg-surface-raised"
          >
            All in
          </button>
        </div>
      )}
    </div>
  );
}
