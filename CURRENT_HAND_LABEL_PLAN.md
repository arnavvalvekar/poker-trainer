# Current hand label (while playing)

Show what the hero is holding / has made as a small label **above their hole cards** during a live hand. Design + implementation plan only in this file until built.

## Why

Hole cards alone are easy to misread under pressure (especially offsuit vs suited). A calm caption above the fan — Offsuit-style, on a surface chip — reduces cognitive load and matches the trainer goal (“what do I have right now?”).

Covered by todo: *add current hand while playing*.

## Goals

- Always-visible label above hero hole cards when cards are shown
- Preflop: starting-hand notation (`KJo`, `AKs`, `99`)
- Flop+: made-hand name from the evaluator when the board has ≥3 cards (e.g. `Pair of Kings`, `Flush`)
- Offsuit contrast: secondary text lives on a surface pill/chip, not grey floating on pure black
- Read-only display — no game-logic / GTO / EV changes

## Non-goals

- Showing opponent made hands mid-hand
- Draw names (OESD, flush draw) in MVP — optional follow-up
- Equity % or GTO advice in this label
- Changing card sizes or seat layout beyond space for the caption

## Source of truth

| Concern | Location |
|---------|----------|
| Placement | [`src/components/HeroZone.tsx`](src/components/HeroZone.tsx) — above the hole-card fan |
| Preflop notation | [`src/utils/hand-notation.ts`](src/utils/hand-notation.ts) → `cardsToHandNotation` |
| Made hand name | [`src/engine/hand-evaluator.ts`](src/engine/hand-evaluator.ts) → `evaluateHand(...).name` |
| Board / street | Game store state (`state.board`, `state.street`) passed into `HeroZone` / `PokerTable` |
| Visual language | Surface chip / `offsuit-chip`-style pill; 12–13px medium |

---

## Look

```
        ┌──────────┐
        │   KJo    │   ← surface pill, centered over fan
        └──────────┘
         ┌──┐┌──┐
         │K♦││J♥│     hero hole cards (existing md fan)
         └──┘└──┘
```

Postflop example:

```
        ┌─────────────────┐
        │ Pair of Kings   │
        └─────────────────┘
         ┌──┐┌──┐
         │K♦││J♥│
         └──┘└──┘
```

- Sit **directly above** the overlapping hole cards (left side of the hero zone), not above the avatar stack module
- Single line, truncate if needed; no second line of meta in MVP
- Dim / hide when hero has folded (optional: keep notation faintly — prefer hide for clarity)

---

## Behavior

| Street / state | Label |
|----------------|--------|
| Waiting / no hole cards | Hidden |
| Preflop (0–2 board cards) | `cardsToHandNotation(holeCards)` |
| Flop / turn / river (board ≥ 3) | `evaluateHand(holeCards, board).name` |
| Hero folded | Hidden (or muted “Folded” — prefer hide label, seat already shows folded) |
| Showdown | Can keep made-hand name; winner copy stays in result banner |

Update when board length or hole cards change (normal React derive — no extra store field required).

---

## Implementation notes (when building)

1. Pass `board: Card[]` (and optionally `folded`) into `HeroZone` from `PokerTable`.
2. Small helper e.g. `getHeroHandLabel(holeCards, board): string | null` in `utils/` or next to HeroZone.
3. Render label in a surface pill above the card row (`flex-col items-center` wrapping cards + label).
4. Reuse evaluator — do not duplicate ranking logic.

### Checklist

- [ ] Helper: notation preflop, `evaluateHand` name postflop
- [ ] `HeroZone` layout: label above card fan on surface chip
- [ ] Wire `board` from table; hide when no cards / folded
- [ ] Mobile: no overflow into pot / avatars; truncate long names
- [ ] Quick manual check: pair, two pair, flush names read clearly

## Follow-ups (optional)

- Draw / texture hints (“Flush draw”, “OESD”) with conservative wording
- Toggle in settings: show/hide hand label
- Same pill style over board for “board texture” (separate feature)

## Out of scope

- Teaching whether the hand is strong for the spot (that’s feedback)
- Animating label changes with heavy motion
