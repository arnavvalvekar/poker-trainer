# Future ML for feedback (later)

Plans for machine-learning–assisted coaching **after** the no-ML feedback overhaul in [`FEEDBACK_IMPROVEMENT_PLAN.md`](FEEDBACK_IMPROVEMENT_PLAN.md). Do not start here first.

## Position vs classical improvements

Poker already has a practical ground truth: **solvers (CFR / GTO)**. ML helps when action trees explode (postflop) and you need a compact policy or value head labeled by solvers—not when preflop charts and decision context are wrong.

Training only on the user’s own hands will not beat solver-grounded strategy at small samples and will reinforce noise.

Gate: ship trustworthy decision context + charts + alternate-action EV first. Then revisit this doc.

---

## Goals (future)

- Higher-quality **postflop** recommendations than static `default_cbet` / `default_call` stubs
- Compact offline model (or cached vectors) that runs in browser / Web Worker
- Labels and evaluations still tied to solver-quality strategy, not “vibes”

## Non-goals (for now)

- Replacing GTO charts with an unlabelled neural net
- Online training on a live user’s last 200 hands as the sole teacher
- Cloud inference required during play (offline-first stays primary)

---

## Recommended path

### Phase A — Solver labels, not free form ML

1. Generate or license postflop (and denser preflop) strategy tables for the app’s fixed format (6-max, fixed BB, common stack depths).
2. Distill into:
   - Action probabilities by abstracted info set, or
   - A small network trained to imitate those labels
3. Evaluate in eval harness against held-out solver spots (not against “user liked the tip”).

### Phase B — Optional on-device distillate

| Option | Pros | Cons |
|--------|------|------|
| Tabular abstractions + quantization | Deterministic, inspectable | Memory / coverage limits |
| Mobile-friendly NN (WASM / ONNX) | Better postflop coverage | Bundle size, QA cost |
| Optional cloud solver for review only | Highest accuracy offline-play preserved | Needs network, privacy story |

Prefer WASM/ONNX or precomputed buckets over shipping TensorFlow.js unless size is proven acceptable.

### Phase C — Personalized layer (thin)

Once baseline policy is solid:

- Calibrate advice to **user leak clusters** (from IndexedDB stats), e.g. “you under-defend SB”
- Do **not** retrain the core strategy net on that user’s hands
- Optional ranking/reranking of tip templates using local hand outcomes (bandit / logistic), with strong priors toward the baseline policy

---

## Accuracy expectations

| Approach | Preflop | Postflop | Notes |
|----------|---------|----------|--------|
| Fixed charts + context (no ML) | Strong if charts are good | Weak | Do this first |
| Solver tables / distillate | Strong | Strong | Best accuracy path |
| NN trained only on user history | Poor | Poor | Skip |
| Hybrid: solver policy + leak personalization | Strong | Strong | Best product fit |

ML increases accuracy **mainly** when it approximates better strategies under more boards and bet sizes. It does not fix mis-keyed scenarios or fold-biased scoring by itself.

---

## Dependencies before start

- [ ] Feedback overhaul checklist in `FEEDBACK_IMPROVEMENT_PLAN.md` largely done
- [ ] Stable `DecisionContext` schema (features for any future model)
- [ ] Clear sizing model (open sizes, SPR buckets)
- [ ] Offline size budget (target max model + tables)
- [ ] Eval set of spots with known preferred actions

## Open questions

- Source of solver data (in-house CFR, licensed packs, third-party API for generation only)
- Abstraction scheme (card / board / bet buckets)
- Whether review-tab can use heavier compute than in-session tips

## Out of scope until gated

- Implementing models in the play loop
- Changing EV Monte Carlo to a learned value function without solver validation
