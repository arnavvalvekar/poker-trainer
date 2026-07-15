# Post-hand feedback overhaul (no ML)

Make post-hand recommendations trustworthy and useful by fixing decision context, charts, EV alternatives, scoring, and copy. No machine learning.

## Why

Today three independent analyzers (EV, GTO range, position) are concatenated. Folds are over-praised (`foldEV = 0`, out-of-range fold → alignment `0.8` → “Great”), scenarios are often wrong (e.g. SB mapped like a 3-bet), and position copy can contradict GTO (“too weak” + “strong enough for your seat”). Example: folding KJo from SB can score Great incorrectly.

## Goals

- Score the **actual spot**, not a loosely guessed chart key
- Rate folds when call/raise would have been better (mistakes of omission)
- One coherent verdict + explanation + tip (no contradictory paragraphs)
- Prefer actionable alternative actions over badge color alone
- Stay offline-first; expand static ranges / pot math only

## Non-goals

- ML / neural nets / solver distillation (see `ML_FEEDBACK_PLAN.md`)
- Changing the game engine or AI act timing beyond what feedback needs
- Full postflop GTO solving

## Source of truth (code)

| Area | Files |
|------|--------|
| Orchestration | `src/feedback/feedback-engine.ts` |
| Readable copy / rating | `src/feedback/feedback-copy.ts` |
| GTO charts | `src/feedback/gto-lookup.ts`, `public/gto-ranges/6max-preflop.json` |
| Position heuristics | `src/feedback/position-analysis.ts` |
| EV worker | `src/feedback/ev-simulator.worker.ts`, `src/feedback/ev-client.ts` |
| Kickoff | `src/store/game-store.ts` → `finishHand` → `analyzeHandDecisions` |
| UI | `src/components/FeedbackPanel.tsx` |

---

## Implementation order

### 1. Decision-time context reconstruction

Before analyzing hero action N, rebuild state **at that decision**:

- Street, board length, pot, current bet, to-call
- Who opened / raised / limp path this street
- Stack depths, hero position, number of opponents still in

Return a structured `DecisionContext` (scenario key, sizes in BB, facing: limp | open | 3bet | etc.).

Do not pass end-of-hand state into GTO/EV for early folds.

### 2. Accurate preflop scenario keys + richer charts

Expand beyond `*_open` / `*_vs_3bet`:

- Open, vs open (by size buckets if possible), complete vs limp, 3-bet, vs 3-bet
- Especially SB / BB defensives (where KJ feedback fails today)

Charts should include **per-hand frequencies** for fold / call / raise where available—not only a binary “in list?”.

Update `getGTOAlignment` to use reconstructed context, not `facingBet ? vs_3bet : open`.

### 3. Honest EV alternatives

- Drive `callAmount` / `betAmount` / pot from decision context
- Always compare fold vs call/check vs raise/bet for that spot
- **Do not treat fold EV = 0 as success.** Surfacing EV left on the table is the lesson

Rating should use ΔEV vs best alternative (e.g. fold punished when raise is +0.5bb and fold is 0).

### 4. Single verdict narrative

`toReadableFeedback` should:

1. Pick one rating from the primary score (mistake / okay / good / great)
2. Emit **one** explanation (why this action vs the better one)
3. Emit **one** tip (what to do next time in this class of spots)

Remove concatenating independent EV + GTO + position lines when they disagree. Position strength may inform copy only if it aligns with the primary verdict.

### 5. Pattern tips from history (optional in same pass)

Using `storedHands`, surface short leak lines when N ≥ threshold, e.g. “You’ve folded KJo+ from SB in 4 of 5 similar spots.” Prefer this over opponent-tracker fluff when sample is thin.

### 6. Tests

- Unit: scenario key for SB fold vs limp / vs open vs open size
- Unit: KJo SB does **not** auto-rate Great when charts say raise/complete
- Unit: fold with clearly better raise → mistake or okay, not Great
- Unit: readable copy never contains contradictory weakness/strength claims in one card

---

## Checklist

- [ ] `DecisionContext` + reconstruct state per hero action
- [ ] Fix / expand preflop scenario keys and `6max-preflop.json`
- [ ] EV uses real sizes; score vs best alternative
- [ ] Rebalance fold scoring; end “out-of-range fold = 0.8 Great”
- [ ] Single-verdict copy in `feedback-copy.ts` + FeedbackPanel polish if needed
- [ ] History pattern tips (when sample allows)
- [ ] Tests covering KJ / fold-bias regressions

## Out of scope

- Training neural nets or buying solver cloud APIs
- Full flop/turn/river solved strategies
- New product surfaces beyond feedback quality
