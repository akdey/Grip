---
name: grip-ui-system
description: UI rules for Grip. Governs icon sizes, typography, component standards, and strict consumption of index.css tokens.
---

# Grip UI System

This skill governs UI conventions for Grip that are **not** configured in CSS, while mandating that all styling tokens originate strictly from `Frontend/src/index.css`.

---

## 1. Colors & Surfaces: Single Source of Truth (`index.css`)

**Do not hardcode or define colors in TSX components or in this skill.** 
All color ramps, dark/light theme tokens, and status classes are defined exclusively in `Frontend/src/index.css`.

- **Positive financial events (gains, income):** Use `.badge-success` or `.text-status-success`.
- **Negative financial events (losses, expenses, debts):** Use `.badge-danger` or `.text-status-danger`.
- **Warnings / pending review:** Use `.badge-warning` or `.text-status-warning`.
- **Surfaces, borders & neutral tags:** Use `bg-surface`, `bg-surface-subtle`, `bg-surface-pill`, `border-border-subtle`, and `.badge-neutral`.
- **Primary actions:** Use `bg-accent-solid`, `text-accent`, or `.glass-button.accent`.
- **Zero hardcoded opacity hacks:** Never use `bg-white/[0.02]`, `border-white/[0.08]`, or raw hexes in components.

---

## 2. Icon Sizing (Strict 4-Tier Scale)

All Lucide icons must strictly use one of these 4 sizes:

| Tier | Size | Permitted Usage | Example |
| :--- | :--- | :--- | :--- |
| **Micro** | `12` | Inside dense badges, inline trend arrows, helper chips | `<TrendingUp size={12} />` |
| **Inline** | `16` | Input field adornments, list item accessories, standard buttons | `<Search size={16} />` |
| **Action** | `20` | Top bar navigation icons, card header accessories, modal close buttons | `<X size={20} />` |
| **Hero** | `24` | Biometric prompts, hero banners, empty state illustrations | `<ShieldCheck size={24} />` |

*Arbitrary icon sizes (e.g., 11, 13, 14, 15, 17, 18, 22) are forbidden.*

---

## 3. Typography & Numerical Data

- **Financial figures:** All currencies, balances, and percentages **must** include `tabular-nums` (and `font-mono` where appropriate) to prevent layout jitter during updates.
- **Allowed Scale:**
  - `text-[10px] font-semibold uppercase tracking-wider`: Overlines and section headers.
  - `text-xs`: Micro metadata, timestamps, badge text.
  - `text-sm`: Body copy, form inputs, list items.
  - `text-base font-semibold`: Card titles, modal headers.
  - `text-xl` / `text-2xl font-bold`: Stat card values.
  - `text-3xl` / `text-4xl font-black`: Main portfolio balance / hero totals.
- *Micro bracketed font sizes below 10px (e.g. `text-[7px]`, `text-[8.5px]`) are forbidden.*

---

## 4. Surfaces & Interaction Standards

- **Cards:** Use `.glass-card rounded-xl border border-border-subtle bg-surface`.
- **Interactive Rows/Cells:** Apply `.interactive-cell` for iOS-style tap feedback (`active:scale-[0.98]`).
- **Touch Targets:** Interactive buttons/icons must provide at least 44×44px hit areas on mobile.

---

## 5. Development Gate Checklist

Before committing any UI changes:
- [ ] Are all colors/surfaces coming from `index.css` tokens (no raw hexes or `bg-white/*` hacks)?
- [ ] Are all icon sizes strictly `12`, `16`, `20`, or `24`?
- [ ] Do all financial figures use `tabular-nums`?
- [ ] Does the UI render cleanly in both Dark and Light mode (`data-theme="light"`)?
