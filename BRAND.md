# Kalgoh — Brand & Design Guidelines

The single source of truth for how Kalgoh looks and feels. Every color, surface,
and pattern below maps to a token in `src/index.css` or a concrete component in
`src/`. If you are adding or reviewing UI and the answer isn't here, the answer
is wrong — fix the doc first, then ship the code.

---

## 1. Philosophy

> **Editorial, not clinical. Quiet, not cramped. Ink on paper, not dark-mode-recolored.**

Kalgoh is a trading journal. Traders look at it after losses and after wins —
it needs to feel calm, not loud. The palette leans warm in light mode and deep
neutral in dark mode. A single accent (burnt amber) carries profit; a cool
neutral grey carries loss. **Red is never used.**

Design priorities, in order:

1. **Legibility above all.** If a number is hard to read, nothing else matters.
2. **Semantic color is a language, not decoration.** Profit = amber. Loss =
   grey. Accent = blue. Nothing else gets a color.
3. **Two distinct modes, not one inverted.** Light mode is warm off-white paper
   with pure-white cards. Dark mode is near-black body with slightly elevated
   dark cards. They share the same *structure* but not the same *feeling*.
4. **Space is free. Use it.** Padding is cheap. Cramped is expensive.
5. **Motion conveys cause and effect.** Never decorative.

---

## 2. Themes

Both themes are defined as CSS variables in `src/index.css` under a `@theme`
block (light) and a `[data-theme="dark"]` override. The resolved theme is set
on `<html data-theme>` by an inline script in `index.html` *before first
paint*, so there is no flash. Tailwind v4 maps `bg-card`, `text-profit`,
`bg-profit/10` etc. to the live CSS variable — changing the token flips the
entire app.

| | Light | Dark |
|---|---|---|
| **Mood** | Warm editorial off-white | Deep neutral near-black |
| **Body** | `#f5f3ee` (warm cream) | `#0a0a0a` |
| **Cards** | `#ffffff` (pure white, maximum pop) | `#161616` (slightly elevated) |
| **Text** | `#0a0a0a` (near-black) | `#f0f0ec` |
| **Accent** | `#1e5fd9` (confident blue) | `#60a5fa` |
| **Profit** | `#a35614` (deep burnt amber) | `#e8a04a` (lifted amber) |
| **Loss** | `#52525b` (cool neutral grey) | `#9ca3af` (light grey) |

---

## 3. Color Tokens

All tokens live on `:root` / `[data-theme="dark"]` in `src/index.css`. Use the
Tailwind utility (e.g. `bg-card`, `text-profit`, `bg-profit/10`) — **never
hardcode hex values in components**.

### 3.1 Surfaces

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--color-bg` | `#f5f3ee` | `#0a0a0a` | Page body |
| `--color-bg-alt` | `#ebe8e0` | `#141414` | Recessed body surface (e.g. inline fills on body) |
| `--color-bg-elevated` | `#fbf9f4` | `#1a1a1a` | Raised body surface |
| `--color-card` | `#ffffff` | `#161616` | Primary card surface — where real content lives |
| `--color-card-light` | `#f6f3ea` | `#1e1e1e` | Inline hover / neutral cell fill inside a card |
| `--color-card-lighter` | `#ece8dc` | `#242424` | Deepest inset tone — toggle groups, nav buttons |
| `--color-card-surface` | `#fdfcf8` | `#101010` | Elevated sub-surface (rare) |

### 3.2 Text

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--color-text-primary` | `#0a0a0a` | `#f0f0ec` | Page headings |
| `--color-text-secondary` | `#2a2a26` | `#a0a099` | Body copy on the body |
| `--color-text-muted` | `#5a564c` | `#6a6a64` | Muted page text (6.9:1 on body) |
| `--color-text-light` | `#0a0a0a` | `#f0f0ec` | Text on **card surfaces** — inverted per theme |
| `--color-text-card` | `#1a1a16` | `#e8e8e4` | Card body text |
| `--color-text-card-muted` | `#5a564c` | `#9a9a94` | Card body muted (6.9:1 on white) |

**Rule of thumb:** If you're inside a `bg-card`, use `text-text-light` /
`text-text-card` / `text-text-card-muted`. If you're on the body, use
`text-text-primary` / `text-text-secondary` / `text-text-muted`.

### 3.3 Semantic

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--color-accent-blue` | `#1e5fd9` | `#60a5fa` | Hyperlinks, note icon, neutral information accents |
| `--color-profit` | `#a35614` | `#e8a04a` | **Profit** (foreground) — positive P&L, win indicators |
| `--color-profit-bg` | `rgba(163,86,20,0.14)` | `rgba(232,160,74,0.16)` | Profit fills (cell backgrounds, pills) |
| `--color-loss` | `#52525b` | `#9ca3af` | **Loss** (foreground) — negative P&L |
| `--color-loss-bg` | `rgba(82,82,91,0.12)` | `rgba(156,163,175,0.18)` | Loss fills |

**Never** use `--color-profit-bg` / `--color-loss-bg` in a component via raw
color-mix — always reference the token so both themes get a tint that was
tuned for their own surface.

### 3.4 Borders & Rings

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--color-border` | `#d0caba` | `#2a2a2a` | Visible body border (form fields, inline separators) |
| `--color-border-card` | `#e2ddcb` | `#2e2e2e` | Hairline on white cards (subtle) |
| `--color-border-subtle` | `rgba(20,15,0,0.08)` | `rgba(255,255,255,0.06)` | Faint dividers |
| `--color-ring-subtle` | `rgba(20,15,0,0.10)` | `rgba(255,255,255,0.06)` | **Theme-aware inset stroke** — use `.ring-hairline` |
| `--color-focus` | `rgba(30,95,217,0.55)` | `rgba(255,255,255,0.40)` | **Global focus outline** — applied automatically via `:focus-visible` |

**Never** use `ring-white/*` or `ring-black/*` in a component. They are
tuned for one theme and invisible on the other. Use `.ring-hairline`
instead, which resolves via `--color-ring-subtle`.

---

## 4. Typography

### 4.1 Font family

**Satoshi** (Fontshare). Loaded in `index.html` with weights 400/500/600/700.
Fallback stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`.

Satoshi is chosen for its slightly warmer neutral tone — it pairs cleanly with
the warm editorial palette without feeling clinical like Inter. **Do not swap
fonts for a feature without a design discussion.**

### 4.2 Scale

No type scale is formally defined — we use Tailwind sizes directly. The
canonical hierarchy used across pages:

| Role | Class | Example |
|---|---|---|
| Page title | `.text-page-title` (clamp 30→48px, weight 700) | "Overview", "Calendar" |
| Section title | `.text-section-title` (16→18px, weight 600) | "Win rate", "Today" |
| Hero number | `text-3xl lg:text-5xl font-bold tabular-nums tracking-tight` | Month P&L on TodayCard |
| Card label | `text-[10px] lg:text-[11px] uppercase tracking-[0.1em] font-semibold text-text-card-muted` | Stat labels |
| Body | `text-sm` / `text-base` | Card copy |
| Micro | `text-xs` (12px) or `text-[11px]` | Trade counts, subtitles |

### 4.3 Rules

- **Numbers always get `tabular-nums`.** Prices, percentages, counts, dates.
  Prevents layout shift when values change.
- **Hero numbers use `tracking-tight` + `leading-none`.** Tight tracking
  reinforces density; `leading-none` keeps them from disturbing surrounding
  layout.
- **Uppercase labels get tracking-[0.1em]** at minimum, `[0.12em]` for the
  weekday header. Uppercase without extra tracking looks cramped.
- **Line length on body copy: 60–75 chars.** Don't let paragraphs stretch
  across the full card width on desktop.

---

## 5. Spacing & Radii

### 5.1 Spacing scale

Use Tailwind's default (4px grid). Canonical values inside the app:

| Context | Desktop | Mobile |
|---|---|---|
| Page padding | `lg:px-8` (32px) | `px-4` (16px) |
| Card padding | `p-6` / `p-7` | `p-4` / `p-5` |
| Card-to-card stack | `space-y-4` / `space-y-6` | `space-y-3` |
| Calendar cell gap | `gap-1.5` (6px) | `gap-1` (4px) |
| Inline icon gap | `gap-2` (8px) | `gap-1.5` (6px) |

### 5.2 Radii

| Role | Class | Use |
|---|---|---|
| Hero card | `rounded-3xl` (24px) | Top-level cards on overview/analytics, modals |
| Standard card | `rounded-2xl` (16px) | Stat cards, list items, toggle containers |
| Inline chip / nav button | `rounded-xl` (12px) | Nav buttons, pills, cells |
| Small chip | `rounded-lg` (8px) | Inline badges, compact toggles |
| Full pill | `rounded-full` | Avoided except for legacy meta pills — prefer `rounded-xl` |

**Rule:** Never mix radii within a single cluster. If a card is `rounded-3xl`,
its buttons should be `rounded-xl`, not `rounded-lg`. One step down, not two.

---

## 6. Surfaces

### 6.1 `.card-premium`

The headline card treatment. Defined in `src/index.css`. Adds a radial
highlight, inset hairline, and multi-layer drop shadow. Use it for any card
that's the main content of a view.

```jsx
<div className="card-premium bg-card rounded-3xl p-6">
```

Variants add an ambient glow:

- `card-premium-profit` — warm amber glow (used on TodayCard when profitable)
- `card-premium-loss` — cool grey glow (used when day is negative)
- `card-premium-blue` — blue glow (used on the broker dialog)

### 6.2 `.ring-hairline`

A theme-aware 1px inset stroke. Use this instead of `ring-1 ring-white/10` or
similar hardcoded patterns. It resolves to `inset 0 0 0 1px var(--color-ring-subtle)`.

```jsx
<button className="bg-card-lighter ring-hairline rounded-xl">
```

### 6.3 Shadows

Prefer `.card-premium` for any shadow needs. For ad-hoc shadows, use
Tailwind's scale (`shadow-md`, `shadow-lg`, `shadow-xl`). **Never use
`shadow-black/50` or similar hardcoded opacity** — the values were tuned for
one theme and look wrong on the other.

---

## 7. Semantic Patterns

### 7.1 Profit / loss

The only semantically colored elements in the app. Every profit gets
`text-profit` (foreground) and optionally `bg-[var(--color-profit-bg)]` (fill).
Every loss gets `text-loss` / `bg-[var(--color-loss-bg)]`. Zero is neutral
(`text-text-card-muted`).

```jsx
<span className={profit >= 0 ? 'text-profit' : 'text-loss'}>
  {formatMoney(profit)}
</span>
```

### 7.2 Focus

**Do nothing.** The global `:focus-visible` rule in `src/index.css` draws a
2px outline in `var(--color-focus)` on every button, link, input, role=button,
role=radio, role=tab, and `[tabindex="0"]`. Do not add ad-hoc focus rings to
components. Do not remove focus rings.

If a specific component needs a custom focus state (rare), layer it *on top*
of the global outline, don't replace it.

### 7.3 Hover

Two patterns are allowed:

1. **Background shift**: `hover:bg-card-light` on neutral surfaces,
   `hover:bg-profit/15` on amber surfaces. Use with
   `transition-colors duration-150-200`.
2. **Lift**: `hover:-translate-y-0.5 hover:shadow-md` on cards or tappable
   grid cells. Use with `transition-all duration-150`.

Never combine both on the same element — it's too much motion.

### 7.4 Disabled

Reduced opacity + cursor change:

```jsx
className="disabled:opacity-30 disabled:hover:bg-card-lighter"
```

Disabled text should remain > 3:1 contrast with its background so it's still
legible (just not interactive).

---

## 8. Component Patterns

### 8.1 Icon button (nav, toggle, action)

```
w-10 h-10 lg:w-11 lg:h-11
rounded-xl
bg-card-lighter
ring-hairline
text-text-card-muted hover:text-text-light hover:bg-card-light
transition-colors duration-200
```

44px desktop / 40px mobile satisfies the touch-target minimum (Apple HIG 44pt
/ Material 48dp). Icon inside is `w-4 h-4 lg:w-5 lg:h-5`.

### 8.2 Pill KPI (compact data badge)

Same footprint as an icon button so they align in a row. Used for the month
total pill in the calendar header.

```
h-11 w-[120px]
rounded-xl
px-4 flex items-center justify-center
ring-hairline
tabular-nums font-bold text-base leading-none
text-profit / text-loss
backgroundColor: var(--color-profit-bg) / var(--color-loss-bg)
```

Fixed width (`w-[120px]`) so the pill doesn't resize when the value changes
length between `$` and `%` modes.

### 8.3 Grid data cell (calendar day, heatmap tile)

```
aspect-square rounded-xl
ring-hairline
relative (so date can be absolutely pinned)
backgroundColor: var(--color-profit-bg) / var(--color-loss-bg) / var(--color-card-light)
hover: -translate-y-0.5 shadow-md
```

Layout inside:

- Date pinned top-left via `absolute top-2 left-2 lg:top-2.5 lg:left-3`
- Value centered via `absolute inset-0 flex items-center justify-center`
- Value font: `text-lg lg:text-[26px] font-bold tabular-nums tracking-tight leading-none`
- Trade count sub-label: `text-[11px] text-text-card-muted`

### 8.4 Stat card (summary)

```
bg-card-light ring-hairline rounded-xl lg:rounded-2xl
p-3 lg:p-4 min-h-[68px] lg:min-h-[88px]
```

Label row on top (tiny uppercase), value on bottom (`text-base lg:text-xl
font-bold tabular-nums`).

### 8.5 Card premium block

Wrap major page content:

```jsx
<div className="card-premium bg-card rounded-2xl lg:rounded-3xl p-4 lg:p-6">
```

---

## 9. Accessibility

### 9.1 Contrast floor

Every foreground/background pair must meet **WCAG AA (4.5:1 for normal text,
3:1 for large text)**. All current tokens have been audited:

| Pair (Light) | Ratio |
|---|---|
| `text-primary` on `bg` | 18:1 |
| `text-light` on `card` | 20:1 |
| `text-muted` on `bg` | 6.9:1 |
| `text-card-muted` on `card` | 6.9:1 |
| `text-profit` on `card` | 7.2:1 |
| `text-loss` on `card` | 7.0:1 |
| `accent-blue` on `card` | 6.2:1 |

| Pair (Dark) | Ratio |
|---|---|
| `text-primary` on `bg` | 17:1 |
| `text-light` on `card` | 14:1 |
| `text-card-muted` on `card` | 5.2:1 |
| `text-profit` on `card` | 7.4:1 |
| `text-loss` on `card` | 6.1:1 |

### 9.2 Other requirements

- **Every interactive element is keyboard-reachable** and gets the global
  focus outline for free.
- **Every interactive element is ≥44×44px** (touch target).
- **Every decorative icon uses `aria-hidden="true"`.**
- **Every icon-only button gets an `aria-label`.**
- **`role="radiogroup"` + `role="radio"` + `aria-checked`** on segmented
  toggles (e.g. `$/%`).
- **`prefers-reduced-motion`** is respected globally — see the
  `@media (prefers-reduced-motion: reduce)` block in `src/index.css`.
- **Skip-to-content link** is present at the top of every page.

---

## 10. Motion

All motion is defined in `src/index.css` under the animations section. Rules:

- **Micro-interactions (state changes, hovers):** 150–200ms, ease-out
- **Medium (tab changes, modals entering):** 180–300ms
- **No animation ever runs longer than 400ms** except the decorative floating
  logo, which is 3s and marked optional
- **Exit ≤ 70% of enter duration** — feels responsive
- **Transforms and opacity only.** Never animate `width`, `height`, `top`,
  `left`
- **Use spring/ease-out for entering, ease-in for exiting**
- **Any continuously-running animation disables in `prefers-reduced-motion`**

Canonical keyframes available:

| Keyframe | Use |
|---|---|
| `fadeIn` (`.tab-enter`) | Tab/view transitions |
| `slideIn` (`.animate-slideIn`) | Mobile drawer |
| `backdropFadeIn` + `dialogScaleIn` | Modal entry |
| `popoverScaleIn` | Dropdowns, date picker, combobox |
| `skeletonPulse` | Loading skeletons |
| `float` | Decorative only, always optional |

---

## 11. Anti-patterns — do not ship

1. **`ring-white/*` or `ring-black/*` on any component.** Invisible in one
   theme. Use `.ring-hairline`.
2. **`shadow-black/20` / `shadow-black/50` on cards.** Too harsh in light
   mode. Use `.card-premium` or Tailwind's semantic scale.
3. **Hardcoded hex colors in components.** Always reference a token.
4. **Red for loss.** Never. Loss is grey.
5. **Green for profit.** Never. Profit is amber.
6. **Pie charts for >5 categories.** Use a bar chart.
7. **Emoji as icons.** Use Lucide / Heroicons SVGs.
8. **Text smaller than 12px on body copy.** Micro labels are OK; body isn't.
9. **Numbers without `tabular-nums`.** They'll jitter.
10. **Focus rings that replace the global outline.** Layer, don't replace.
11. **Color alone to convey meaning.** Always pair profit/loss color with a
    `+`/`-` sign, an icon, or a label.
12. **Continuously-running animations without a `prefers-reduced-motion`
    opt-out.** See the global media query — any new `@keyframes` must be
    added to the opt-out list.
13. **Dialogs without an Escape key handler and a close button.**
14. **Non-semantic clickable elements.** If it clicks, it's a `<button>` or an
    `<a>`. Never a `<div onClick>`.

---

## 12. How to evolve this document

- **Add a token** → add the variable to both `:root` and `[data-theme="dark"]`
  in `src/index.css`, then add a row in the relevant table above.
- **Add a component pattern** → drop the minimal class string into §8 and
  reference the file it lives in.
- **Change a token** → run a grep for its old value, update callers if
  they were using it as a raw hex, then update the contrast table in §9.
- **Retire a pattern** → move it to §11 with a short note on why.

If a change would break §11, the change is wrong. If §11 and the code
disagree, the code is wrong.
