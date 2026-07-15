# Home page (Offsuit-inspired)

Design and implementation plan for an in-app home / lobby screen. Pure UI product surface — no engine, GTO, or feedback-logic changes required for MVP.

## Why

Play currently opens straight to the table. Offsuit’s lobby pattern (hero metric → one pastel feature card → short list) gives a clear entry, brand presence, and calm path into Stats / Review without a packed dashboard.

## Goals

- First screen that feels like Offsuit: black canvas, breathable layout, one soft color moment
- One primary path into training (Practice table → Play)
- One hero metric + one feature card + one list section
- Bottom nav unchanged (Play / Stats / Review + theme)

## Non-goals

- Marketing landing with pastel full-bleed behind the whole app
- Multiple room cards, mode grids, or chart clutter on home
- Social lobbies, buy-in selection UI, or real-money flows
- Implementing feedback/ML work (see other plans)

## Source of truth

- Creative direction: [`design-system.json`](design-system.json) (`components.homeScreen`, `color.accent.gradientPastel`, density/home spacing)
- Shell / navigation: [`src/components/AppShell.tsx`](src/components/AppShell.tsx)
- Existing tokens: `offsuit-module`, surfaces, nav icons already in the app

---

## Look & structure

### Feeling

Casual, warm, premium. Soft color on monochrome. Scale does hierarchy before color. Big type for the one number; pastel card is the only saturated accent.

### First viewport (mobile)

```
┌─────────────────────────────┐
│ offsuit trainer        ⚙    │  quiet chrome
│                             │
│ Your stack                  │  caption (on surface / tight label)
│ $200                        │  hero metric (~28–34px white)
│                             │
│ ┌─────────────────────────┐ │
│ │ 🏠 Practice table       │ │  pastel feature card
│ │ 6 players · 100bb       │ │  dark text on gradient
│ └─────────────────────────┘ │
│                             │
│ Continue                    │  section caption in module
│ ┌─────────────────────────┐ │
│ │ ◐ Stats        54%  ›   │ │  charcoal rows
│ │ ◐ Review   12 hands ›   │ │
│ └─────────────────────────┘ │
│                             │
│ [ Play ] [ Stats ] [ Review ]│  existing bottom nav
└─────────────────────────────┘
```

### Anatomy

| Block | Spec |
|-------|------|
| Chrome | Lowercase wordmark left; settings line icon right. No heavy header bar. |
| Hero metric | Left-aligned. One large white number. Caption e.g. “Your stack” or “Hands trained” — never grey body text floating on pure black without a surface. |
| Feature card | Full-width, ~24px radius, lavender → soft yellow → pale pink (`feature-gradient`). Dark `#1C1C1E` title + one meta line. Small house/table line icon. Tap → Play / deal entry. |
| List section | Section title on a surface module; rows as `#1C1C1E` squircles (~52px), optional soft avatar monogram, label + secondary value, optional chevron. |
| Nav | Keep current AppShell tab bar. |

### Trainer mapping (vs Offsuit social lobby)

| Offsuit | This app |
|---------|----------|
| Chip balance | Simulated stack **or** hands trained / session accuracy (pick **one** hero metric for MVP) |
| Named room card (“Dave’s Garage”) | **Practice table** → `setView('play')` (and optionally `startHand` later) |
| Rank list | Stats / Review / optional “Focus” leak row when data exists |

### Motion

- Soft fade / slide-up on the feature card (~300ms) on enter
- Press scale on feature card and list rows
- Soft number ease-in once; no glow loops

### Explicitly avoid

- Pastel marketing gradient as the full-screen app backdrop
- Multiple feature cards or mode grids
- Charts, recent-hand feeds, promo badges in the first viewport
- Colored success/danger CTAs for primary entry (tap pastel card; optional white full-width **Deal** pill under card only if needed)
- Flat emoji mascots (use gradient avatars / line icons)

### Copy tone

Short and friendly. Feature title carries the label; meta is factual. No coaching lectures on home.

---

## Implementation notes (when building)

1. Add `view: 'home'` (or make home the default when opening the app) in the store / AppShell.
2. New `HomeScreen.tsx` (or similar) composed in AppShell when `view === 'home'`.
3. Wire feature card → Play; list rows → Stats / Review.
4. Hero metric reads from existing `getStats` / hero stack settings — no new persistence for MVP.
5. Reuse `bg-feature-gradient`, `rounded-module` / `2xl`, and Offsuit caption utilities from the UI overhaul.

### Checklist

- [ ] Agree MVP hero metric (stack vs hands trained vs accuracy)
- [ ] Add `home` view + HomeScreen layout per anatomy above
- [ ] Feature card → Play; Stats / Review rows wired
- [ ] Contrast: secondary text only on surfaces
- [ ] Light enter / press motion
- [ ] Empty states when no hands yet (calm caption in module, not bare grey)

## Out of scope

- Full marketing site / App Store hero
- Room browser with multiple tables
- Settings sheet beyond a quiet icon (can deep-link later)
