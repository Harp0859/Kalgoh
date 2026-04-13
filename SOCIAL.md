# Kalgoh — Social & Content Brand Kit

How Kalgoh looks on Instagram, X/Twitter, LinkedIn, YouTube covers, and every
other marketing surface *outside* the app. This is the companion to
`BRAND.md` — that doc defines the product UI; this one defines the marketing
feed.

**The rule:** if it could be mistaken for "another trading dashboard", it's
wrong. Kalgoh looks like a quiet financial magazine — warm ink, amber accents,
never a red candle, never a green one.

---

## 1. Voice

Kalgoh's content voice is **calm, confident, and never hype**.

| Do | Don't |
|---|---|
| "Your best month starts with reading last month honestly." | "🚀🚀 BLOW UP YOUR ACCOUNT BRO 🔥" |
| "A journal doesn't make you profitable. It makes you honest." | "SECRETS THE PROS DON'T WANT YOU TO KNOW" |
| "+$206 across 8 trading days. Discipline is boring, and that's the point." | "DAY TRADER MAKES $206!!!" |
| "Loss days teach more than win days, if you write them down." | "HOW I TURNED $100 INTO $10K" |

Rules:

- **No exclamation marks** in body copy. One is allowed in a headline, max.
- **No emojis in body copy.** One accent emoji is allowed in a caption, max.
  Preferred: none.
- **Numbers are the hero.** Lead with the number, frame the feeling around it.
- **Never shame losses.** Losses are normal, they're data, they're the point
  of the journal.
- **Never promise returns.** Kalgoh is a journal, not a signal service.
- **Never compare to other traders.** Kalgoh is about your edge vs your past
  self.
- **Lowercase is fine.** Sentence case. Title case for CTAs only.

---

## 2. Color Palette

Use **only** these colors. Any other hex you're tempted to pick is wrong.

### 2.1 Primary palette

| Role | Hex | RGB | When |
|---|---|---|---|
| **Ink** (headlines on cream) | `#0a0a0a` | 10, 10, 10 | Headlines and body copy on cream backgrounds |
| **Cream** (primary background) | `# l` | 245, 243, 238 | Default post background — warm off-white |
| **Paper** (card surface on cream) | `#ffffff` | 255, 255, 255 | Cards and pulled-out content blocks |
| **Coal** (dark background) | `#0a0a0a` | 10, 10, 10 | Dark-mode posts — matches the app dark theme |
| **Slab** (card on coal) | `#161616` | 22, 22, 22 | Cards on dark-mode posts |
| **Bone** (text on coal) | `#f0f0ec` | 240, 240, 236 | Headlines and body on coal |

### 2.2 Accent palette (use sparingly)

| Role | Hex (light) | Hex (dark) | When |
|---|---|---|---|
| **Amber** (profit, brand accent) | `#a35614` | `#e8a04a` | Profit numbers, CTAs, one accent word in a headline |
| **Slate** (loss, neutral contrast) | `#52525b` | `#9ca3af` | Loss numbers, secondary text, hairlines |
| **Ink Blue** (rare accent) | `#1e5fd9` | `#60a5fa` | Link-style CTAs only — never decorative |

### 2.3 Color usage ratios

Every post should follow roughly:

- **70%** cream or coal background
- **20%** paper or slab cards
- **8%** ink / bone body text
- **2%** amber accent

**The 2% amber rule is the entire brand.** If you look at a post and the
amber reads as "the color", you've used too much. If you don't notice it, but
you'd miss it if it were grey, you've used exactly the right amount.

### 2.4 Anti-palette — never use

- Red of any kind. Not for loss, not for CTA, not for warnings.
- Green of any kind. Not for profit, not for check marks.
- Pure saturated anything (neon, magenta, pure yellow, pure cyan).
- Gradients that span more than one accent.
- Drop shadows that are pure black at >20% opacity.

---

## 3. Logo

Two versions live in `public/`:

- `kalgoh-logo.png` — turtle + candles on **dark** backgrounds (default
  existing asset)
- `kalgoh_white.png` — turtle + candles on **light** backgrounds

The app already swaps between them automatically based on theme. For social,
pick the version whose **background** you are posting on:

| Background | Logo file |
|---|---|
| Cream (`#f5f3ee`), Paper (`#ffffff`) | `kalgoh_white.png` |
| Coal (`#0a0a0a`), Slab (`#161616`) | `kalgoh-logo.png` |

### 3.1 Clearspace

Reserve a clearspace equal to the **height of the turtle's shell** around the
logo on all four sides. Nothing — text, icons, grid cells — enters this zone.

### 3.2 Wordmark

"Kalgoh" is set in **Satoshi Bold**, tracking `-0.02em`, leading-none. Next
to the logo it sits at the same optical height as the shell. Never set it in
all caps, italic, or with a drop shadow.

### 3.3 Logo don'ts

- Don't recolor the turtle.
- Don't place the logo over an image without a solid color patch behind it.
- Don't crop the candles out — they're part of the mark.
- Don't rotate or skew the logo.
- Don't scale below 40px height. Under 40px, use the wordmark alone.

---

## 4. Typography

### 4.1 Family

**Satoshi** from Fontshare. Weights 400 / 500 / 600 / 700. Falls back to
`Inter` → system sans if Satoshi isn't available (e.g. in a template tool that
doesn't support Fontshare).

### 4.2 Scale for social posts

Unlike the app, social uses a larger, more dramatic scale because posts are
viewed at arm's length on a phone.

| Role | Size (1080×1080 post) | Weight | Tracking |
|---|---|---|---|
| Hero number | `140–220px` | 700 | `-0.02em` |
| Headline | `56–84px` | 700 | `-0.02em` |
| Subtitle / deck | `28–36px` | 500 | `-0.01em` |
| Body | `22–28px` | 400 | `0` |
| Micro label (uppercase) | `14–18px` | 600 | `0.12em` |
| Caption / watermark | `16–20px` | 500 | `0.04em` |

### 4.3 Typographic rules

- **Hero numbers use tabular-nums** (OpenType feature `tnum`). Every font
  weight variant must have the feature on.
- **Headlines are always left-aligned** unless the post is a single
  centerpiece (a hero number on a minimal background).
- **One type size jump per screen.** Don't use 4 different sizes in one post;
  use 2, max 3.
- **Never underline for emphasis.** Use weight change or an amber highlight.
- **Never use italics** in body copy.
- **Never use all-caps for headlines** over 4 words. Uppercase is reserved for
  labels with `tracking-[0.12em]`.

---

## 5. Format & Sizes

| Surface | Size (px) | Safe area |
|---|---|---|
| **IG feed square** | 1080 × 1080 | 80px margin all sides |
| **IG feed portrait** | 1080 × 1350 | 80px horizontal / 100px vertical |
| **IG story / reel cover** | 1080 × 1920 | 100px horizontal / 250px top / 300px bottom (to clear UI chrome) |
| **X / Twitter** | 1600 × 900 | 80px margin |
| **LinkedIn** | 1200 × 628 | 80px margin |
| **YouTube thumbnail** | 1280 × 720 | 60px margin |
| **OG / social preview** | 1200 × 630 | 60px margin |

The safe area is **inviolable**. No text, no logo, no stat block enters it.
Decorative background grid/texture is the only exception.

---

## 6. Post Templates

Six canonical templates. Every post should be one of these. If you find
yourself inventing a new one, first try to express the idea in one of these
six. If it still doesn't fit, add it to this doc before shipping.

### 6.1 Hero Number (win/loss recap)

**Purpose:** share a single headline number from a day / week / month.

**Layout:**
- Background: cream or coal
- Logo + wordmark: top-left, small
- Giant hero number: center, amber if positive / slate if negative, with
  `+` or `-` sign. Always `tabular-nums`
- Deck below hero: one short sentence (max 8 words)
- Micro label above hero (optional): `LAST WEEK`, `MARCH 2026`, etc. in
  uppercase tracking-[0.12em]
- Watermark bottom-right: `kalgoh.com` in caption style

**Example copy:**
> LAST 30 DAYS
>
> **+$2,146**
>
> 8 wins, 6 losses, one honest journal.

**Rules:** The hero number is the only colored element. Everything else is
ink or slate. Nothing competes with the number.

### 6.2 Calendar Screenshot (the big one)

**Purpose:** share the in-app calendar export. This is Kalgoh's signature
content format — users literally screenshot it from the app.

**Layout:**
- Use the PNG directly exported from the Calendar view via the download
  button. It already includes the logo, month nav, month total pill, and the
  calendar grid — all branded.
- Place on a cream or coal background with **60px padding** all around the
  exported PNG
- Add a **caption strip** below the export: one sentence of context, 28–36px

**Rules:**
- Do **not** edit or recolor the exported PNG.
- Do **not** add annotations on top of the calendar cells.
- Do **not** crop out the header or footer — the brand lockup is load-bearing.

### 6.3 Quote / Principle Card

**Purpose:** share a single short idea. Max 14 words.

**Layout:**
- Background: cream
- Text: ink, 56–84px, left-aligned, hung on the left safe-area margin
- Accent: one word per quote can be in amber
- Logo + wordmark: bottom-left, small
- No other elements

**Example:**
> A journal doesn't make you profitable.
> It makes you **honest**.

### 6.4 Before / After Split

**Purpose:** contrast two states — a messy spreadsheet vs the Kalgoh calendar,
or a trader without vs with a journal.

**Layout:**
- Square or portrait, split in half horizontally
- Left half: cream, small slate label `BEFORE`, grayscale / muted
  illustration or screenshot
- Right half: cream, small amber label `AFTER`, the real Kalgoh UI (calendar
  or overview)
- Divider: 2px slate hairline

**Rules:**
- The "before" is muted, never colored. Don't make it look ugly on purpose.
- The "after" is always real product UI, never a mockup.

### 6.5 Tip / Education Post

**Purpose:** share a single actionable trading-journal habit.

**Layout:**
- Background: cream
- Small micro label top-left: `TIP 01`, `TIP 02`, etc. (uppercase, amber)
- Headline (56–72px): the tip in one sentence
- Body (24–28px): 2–3 sentences max of context
- Footer: logo + `@kalgoh`

**Rules:**
- One tip per post. Never a "5 tips" carousel in one slide.
- Carousels are allowed but each slide is one tip.
- No numbered lists inside a single slide.

### 6.6 Grid / Stat Wall

**Purpose:** share multiple stats at once — win rate, best day, worst day,
etc. Used for monthly recaps.

**Layout:**
- Background: cream or coal
- 2×2 or 2×3 grid of stat cards matching the app's `StatCard` treatment:
  - Card surface: paper on cream, slab on coal
  - `ring-hairline` inset stroke
  - Small uppercase label top-left
  - Big tabular number below (amber if positive, slate if not)
- Header: the month or period name, 56–72px, above the grid
- Logo + wordmark: bottom-left

**Rules:**
- Stat values follow the same `+$X.XX` / `-$X.XX` convention as the app.
- All numbers use tabular-nums.
- Grid gap: `40–56px` on a 1080 canvas.

---

## 7. Imagery

### 7.1 Allowed

- **Real app screenshots.** Calendar, overview, analytics, today card.
  Export via the in-app download button or an honest screenshot.
- **Product renders.** Phone mockup showing Kalgoh if you must.
- **Subtle textures.** The same noise texture used in `body::after` in
  `src/index.css` (2.5% opacity on light, 1.5% on dark). No other textures.

### 7.2 Not allowed

- Stock photos of traders, keyboards, Bloomberg terminals, candles, skylines,
  sports cars, or anyone in a suit.
- AI-generated hero imagery. Ever.
- Gradients as the main background.
- Photos of money.
- Candle chart screenshots from TradingView / brokers.

---

## 8. Captions & Hashtags

### 8.1 Caption structure

Three parts, in this order:

1. **Hook (1 line).** The headline of the post, written as a sentence that
   stands alone.
2. **Context (1–3 sentences).** What the post shows and why it matters.
3. **CTA (1 line).** One clear next action — "try it free", "link in bio",
   "read the breakdown". Only one CTA per post.

Max caption length: **220 words.** Most should be under 80.

### 8.2 Hashtag policy

- **Max 5 hashtags** per post.
- **Never stuff.** No 30-tag walls.
- Core tag set: `#kalgoh #tradingjournal #daytrading #mt5 #disciplineedge`
- Rotate in at most 2 broader tags: `#forex #futures #prop #tradingtools`
- Never use: `#fyp`, `#foryou`, `#viral`, `#rich`, `#lambo`.

---

## 9. Dark vs Light — when to use which

Both themes are valid for social. Rough rules:

| Use cream/paper (light) when… | Use coal/slab (dark) when… |
|---|---|
| Sharing a calm educational tip | Sharing a win/loss hero number |
| Quoting a principle | Sharing a calendar screenshot from dark mode |
| Contrasting against the algorithmic-feed norm (most trading content is dark) | Matching the in-app screenshot theme |
| Morning / day-time posts | Evening / late-session posts |
| LinkedIn, blog covers | Instagram feed, X |

A balanced grid alternates roughly 60/40 light/dark. Three light posts in a
row is fine. Three dark posts in a row is also fine. Six of the same is
monotone — break it up.

---

## 10. Grid Aesthetic (Instagram feed)

View the feed as a unit. Every new post should look at home next to the
previous six tiles.

Rules:

1. **No two hero-number posts in a row.** Break them up with a quote, a
   calendar screenshot, or a tip.
2. **Amber appears in every 3rd tile at most.** Too much amber across the
   feed ruins the "2% rule".
3. **Avoid flat color walls.** If four tiles in a row are all pure cream with
   no imagery, add a calendar screenshot or texture.
4. **Hero number, calendar, quote, tip** is a good 4-tile rotation.

---

## 11. Pre-publish checklist

Before any post ships, verify:

- [ ] Colors are only from the palette in §2. No other hex sneaking in.
- [ ] Amber usage ≤ 2% of the canvas area (eyeball it).
- [ ] No red or green anywhere.
- [ ] Logo is on the correct light/dark variant for the background.
- [ ] Safe area respected — nothing inside the margins.
- [ ] Hero numbers use tabular-nums.
- [ ] Headline ≤ 14 words.
- [ ] One CTA, one accent emoji max in the caption.
- [ ] No shame in loss posts; no hype in win posts.
- [ ] Hashtags ≤ 5, all from the approved set.
- [ ] If the post is a calendar screenshot, the in-app export is unmodified.
- [ ] Post alt-text is written (for accessibility — describe the hero number,
  the period, and the emotion).

---

## 12. Assets index

Where to find the raw files:

| Asset | Path |
|---|---|
| Logo — dark backgrounds | `public/kalgoh-logo.png` |
| Logo — light backgrounds | `public/kalgoh_white.png` |
| Favicon | `public/favicon.svg` |
| App color tokens (source of truth) | `src/index.css` (`:root` / `[data-theme="dark"]`) |
| Calendar export code | `src/features/calendar/CalendarGrid.jsx` (`downloadImage` function) |

When creating templates in Figma / Canva / Illustrator, use the hex values
from §2 verbatim — do not let the tool's color picker "auto-adjust" or
"optimize" them.

---

## 13. How to evolve this document

- **Adding a new template** → only if an idea genuinely cannot be expressed
  in one of the six in §6. Add it to §6 with the same structure (Purpose,
  Layout, Rules).
- **Adding a hashtag** → only if it's been used successfully on at least
  three posts and has a documented reason. Add to §8.2.
- **Changing a color** → update `BRAND.md` first (product UI is the source
  of truth), then mirror the change here.
- **Relaxing a rule** → requires a written reason in the commit message. If
  the reason is "it looks cooler", the answer is no.

**The whole point of this document is consistency. A rule you break once
becomes a pattern you're stuck with.**
