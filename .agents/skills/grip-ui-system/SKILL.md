---
name: grip-ui-system
description: UI/UX design rules for Grip. Governs tokens in index.css, color semantics, icon sizing, typography, and anti-patterns.
---

# Grip UI Design System

All UI in Grip must strictly follow these rules to maintain a calm, institutional, non-"vibe-coded" financial platform.

---

## 1. Tokens & Theme Parity (`Frontend/src/index.css`)

- **Single source of truth:** Drive all styling through `Frontend/src/index.css` tokens. Never hardcode arbitrary hexes or opacity hacks.
- **Theme parity:** Every component must support Dark (`#050505`) and Light (`#F2F4F8`) via tokens:
  - Surfaces: `bg-page`, `bg-surface`, `bg-surface-subtle`, `bg-surface-pill`
  - Borders: `border-border-subtle`, `border-border-default`
  - Text: `text-text-primary`, `text-text-secondary`, `text-text-muted`

---

## 2. Color Semantics (Strict Financial Meaning)

Color is reserved **strictly** for financial meaning. Zero neon accents or AI tropes (no cyan, purple, violet, pink, or multi-hue glow gradients).

| Role | Meaning | Utility Tokens |
| :--- | :--- | :--- |
| **Gains / Positive** | Inflows, income, gains, safe capacity, sync success | `.badge-success`, `.text-status-success` |
| **Losses / Negative** | Expenses, liabilities, debt, overdue bills, sync failure | `.badge-danger`, `.text-status-danger` |
| **Pending / Warning** | Due soon, confirmation required, threshold warnings | `.badge-warning`, `.text-status-warning` |
| **Structure / Neutral** | Surfaces, borders, category tags, filters, chips | `.badge-neutral`, `bg-surface-subtle`, `border-border-subtle` |
| **Brand Accent** | Primary CTAs only. High-contrast monochrome (White in dark, Black in light) | `bg-accent-solid`, `text-text-on-accent` |

---

## 3. Forbidden Anti-Patterns

| Never Use | Always Use Instead | Reason |
| :--- | :--- | :--- |
| `bg-white/[0.02]`, `border-white/[0.08]` | `bg-surface-subtle`, `border-border-subtle` | Breaks in Light Mode |
| `bg-emerald-500/10 text-emerald-400` | `.badge-success`, `.text-status-success` | Use central CSS tokens |
| `bg-red-500/10 text-red-400` | `.badge-danger`, `.text-status-danger` | Use central CSS tokens |
| Cyan / Purple / Neon accents | Monochrome (`bg-accent-solid`) | Avoids "AI / crypto vibe-coded" look |
| Random icon sizes (`11`, `13`, `17`) | Standard 4-Tier Scale (`12`, `16`, `20`, `24`) | Visual consistency |
| Micro fonts (`text-[7px]`, `text-[8.5px]`) | `text-[10px]` or `text-xs` | Readability & accessibility |

---

## 4. Icon & Typography Scale

- **Icons:**
  - `12px`: Micro chips, trend arrows, inline status dots.
  - `16px`: Inputs, list items, buttons.
  - `20px`: Header actions, modal close triggers.
  - `24px`: Hero illustrations, security prompts.

- **Typography & Numbers:**
  - `text-[10px] font-semibold uppercase tracking-wider text-text-muted`: Eyebrows / section overlines.
  - `text-xs text-text-muted`: Captions, timestamps.
  - `text-sm text-text-primary`: Body text, standard inputs, list items.
  - `text-base font-semibold`: Card titles, modal headers.
  - `text-xl` / `text-2xl font-bold`: Metric figures.
  - **Always pair financial figures with `tabular-nums`.**
