---
name: grip-ui-system
description: Strict UI/UX design system guide for Grip. Governs styling, semantic color rules, typography, icon scales, theme tokens, and anti-patterns. Use whenever developing, refactoring, or reviewing frontend components, pages, modals, or drawers in Grip.
---

# Grip UI Design System

This skill defines the visual language, design constraints, and implementation contracts for the **Grip** financial platform. All agents and developers modifying frontend UI must strictly adhere to these rules.

---

## 1. Core Architectural Contract

1. **Single Source of Truth (`Frontend/src/index.css`)**
   - All design tokens, colors, surfaces, glassmorphism filters, and status treatments are defined in `Frontend/src/index.css`.
   - Never invent arbitrary color combinations, raw hex codes, or unmanaged opacities in TSX components.

2. **Automatic Theme Parity (Dark & Light Mode)**
   - Grip supports both Dark (`#050505` base) and Light (`#F2F4F8` base) modes via `data-theme="light"` on `<html>`.
   - **Never hardcode white or black opacity hacks** (e.g. `bg-white/[0.02]`, `text-white`, `border-black/10`).
   - Use semantic tokens that adapt automatically across themes:
     - Backgrounds: `bg-page`, `bg-surface`, `bg-surface-subtle`, `bg-surface-pill`, `bg-surface-hover`
     - Borders: `border-border-subtle`, `border-border-default`
     - Text: `text-text-primary` (or `text-primary`), `text-text-secondary`, `text-text-muted`

---

## 2. Semantic Color Rules (Strict Financial Semantics)

Colors in Grip carry unambiguous, universal financial meaning. Never use color purely for decorative variation.

| Role | Hue / Tailwind | Permitted Use Cases | Standard Token / Class |
| :--- | :--- | :--- | :--- |
| **Success / Positive** | Emerald (`#10b981` / `#34d399`) | **Exclusively** positive financial events: inflows, income, portfolio gains, positive ROI, healthy surplus, sync success. | `.badge-success`<br>`.text-status-success`<br>`var(--color-status-success-*)` |
| **Danger / Negative** | Rose (`#f43f5e` / `#fb7185`) | **Exclusively** negative financial events: outflows, expenses, liabilities, overdue bills, negative returns, debt, sync error. | `.badge-danger`<br>`.text-status-danger`<br>`var(--color-status-danger-*)` |
| **Warning / Pending** | Amber (`#f59e0b` / `#fbbf24`) | **Exclusively** pending or cautionary events: actions awaiting confirmation, bills due soon, warnings, threshold limits. | `.badge-warning`<br>`.text-status-warning`<br>`var(--color-status-warning-*)` |
| **Neutral / Structure** | Slate / Zinc | All cards, surfaces, borders, pill chips, category tags, filters, structural icons, neutral status indicators. | `.badge-neutral`<br>`bg-surface-subtle`<br>`bg-surface-pill`<br>`border-border-subtle` |
| **Brand Accent** | Institutional Cobalt (`#2563eb` / `#3b82f6` / Apple iOS Blue) | Primary actions, CTA buttons, active selection bars, focus rings, interactive toggles. Single source via `var(--brand-accent)`. | `bg-accent-solid`<br>`text-accent`<br>`border-accent-border` |

> [!IMPORTANT]
> **Forbidden Colors & "AI/Vibe-Coded" Aesthetics:** 
> - **No Neon / Electric Cyan:** Electric cyan conveys an "AI bot" or speculative web3/crypto vibe. Grip uses **Institutional Cobalt (`#2563eb`)** to project fiduciary trust, banking stability, and calm elegance.
> - **No Random Rainbow Accents:** Do NOT introduce Purple, Violet, Indigo, Pink, or Orange arbitrarily into pages. Purple was eliminated across all dashboards and must not return.
> - **Restraint Over Decoration:** Badges and colors must convey financial meaning, never decorative noise. Neutral slate/zinc chips (`.badge-neutral`) should be the default for tags and filters.

---

## 3. Forbidden Anti-Patterns (Zero-Tolerance Checklist)

| Anti-Pattern (DO NOT USE) | Approved Replacement | Reason |
| :--- | :--- | :--- |
| `bg-white/[0.02]`, `bg-white/[0.05]` | `bg-surface-subtle` or `bg-surface-pill` | Breaks in Light Mode; hardcoded white is invisible or glaring. |
| `border-white/[0.08]` | `border-border-subtle` | Breaks in Light Mode. |
| `bg-emerald-500/10 text-emerald-400 border-emerald-500/20` | `.badge-success` | Ad-hoc inline CSS string; not theme-adaptive or centrally controlled. |
| `bg-red-500/10 text-red-400 border-red-500/20` | `.badge-danger` | Ad-hoc inline CSS string; breaks consistency with rose palette. |
| `text-green-400` / `text-emerald-400` | `.text-status-success` | Ensures high-contrast token alignment. |
| `text-red-400` / `text-rose-400` | `.text-status-danger` | Ensures high-contrast token alignment. |
| `text-[7px]`, `text-[8.5px]`, `text-[9px]` | `text-[10px]` or `text-xs` | Unreadable micro-typography that violates accessibility standards. |
| `<Icon size={11} />`, `<Icon size={13} />`, `<Icon size={17} />` | Standard 4-Tier Icon Scale (`12`, `16`, `20`, `24`) | Arbitrary pixel jumps produce jagged, inconsistent interfaces. |

---

## 4. Standard 4-Tier Icon Sizing Hierarchy

All icons (primarily `lucide-react`) must conform to this 4-tier scale:

```tsx
// 1. Micro (12px) - Inside dense badges, trend arrows, inline helper chips
<ArrowUpRight size={12} className="text-status-success" />

// 2. Standard Inline (16px) - List item accessories, input field adornments, buttons
<Search size={16} className="text-text-muted" />

// 3. Container / Action (20px) - Top bar actions, close buttons, card header icons
<X size={20} className="text-text-secondary" />

// 4. Hero / Prominent (24px) - Modal hero badges, biometric prompts, empty states
<ShieldCheck size={24} className="text-accent" />
```

---

## 5. Typography Scale & Standards

Grip uses **Inter / SF Pro Text** for body and **SF Pro Display / Outfit** for display/headers.
Always pair financial values with tabular numerals (`tabular-nums font-mono`).

| Style | Tailwind Classes | Usage |
| :--- | :--- | :--- |
| **Eyebrow / Overline** | `text-[10px] font-semibold uppercase tracking-wider text-text-muted` | Category badges, column headers, card section titles |
| **Micro Caption** | `text-xs text-text-muted` | Timestamps, secondary subtitles, helper notes |
| **Body Small** | `text-xs text-text-secondary` | Table cells, compact list descriptions |
| **Body Regular** | `text-sm text-text-primary` | Standard form inputs, content paragraphs, button labels |
| **Card Header / Subhead** | `text-base font-semibold text-text-primary` | Modal subheadings, card titles, drawer headings |
| **Section Title** | `text-lg font-bold text-text-primary` | Page section headers, breakdown group headers |
| **Metric Display** | `text-2xl font-bold text-text-primary tabular-nums` | Account balance, card totals, stat cards |
| **Hero Portfolio Total** | `text-3xl sm:text-4xl font-black text-text-primary tabular-nums tracking-tight` | Net worth hero, total wealth hero banner |

---

## 6. Containers, Glassmorphism & Interactive Surfaces

1. **Cards & Containers:**
   ```tsx
   // Standard glass container
   <div className="glass-card p-4 rounded-xl border border-border-subtle bg-surface">
     ...
   </div>
   ```

2. **Buttons:**
   - **Primary CTA:** `.glass-button.accent` or `bg-accent-solid text-text-on-accent hover:bg-accent-solid-hover px-4 py-2 rounded-xl text-sm font-medium`
   - **Secondary / Neutral:** `bg-surface-subtle hover:bg-surface-hover border border-border-subtle text-text-primary px-3 py-1.5 rounded-xl text-sm`
   - **Interactive Cells:** Add `.interactive-cell` for smooth iOS-style tap bounce (`active:scale-[0.98]`).

3. **Status Badges:**
   ```tsx
   // Success Badge
   <span className="badge-success inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium">
     <TrendingUp size={12} /> +12.4%
   </span>

   // Danger Badge
   <span className="badge-danger inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium">
     <AlertTriangle size={12} /> Overdue
   </span>

   // Neutral Tag / Category
   <span className="badge-neutral inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">
     Technology
   </span>
   ```

---

## 7. Review Checklist for New or Edited UI Components

Before concluding any UI task, verify:
- [ ] No raw `green-*`, `red-*`, or unmanaged purple utility classes were introduced.
- [ ] Positive financial events exclusively use emerald/success tokens (`.badge-success`, `.text-status-success`).
- [ ] Negative financial events exclusively use rose/danger tokens (`.badge-danger`, `.text-status-danger`).
- [ ] No `bg-white/[0.0x]` or `border-white/[0.0x]` opacity hacks are present.
- [ ] Icon sizes strictly match the 4-tier scale (`12`, `16`, `20`, `24`).
- [ ] Typography follows the standard scale without arbitrary bracketed micro sizes (`text-[7px]`, etc.).
- [ ] All monetary / percentage values have `tabular-nums`.
- [ ] Component renders cleanly in both Dark Mode and Light Mode (`data-theme="light"`).
